#!/bin/bash
# Deploy backend (FastAPI) — AlmaLinux
# Usage: sudo bash scripts/deploy-backend.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Run with sudo: sudo bash scripts/deploy-backend.sh"

# ── Install Docker ─────────────────────────────────────────────────────────────
install_docker() {
    info "Installing Docker on AlmaLinux..."
    dnf config-manager --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y \
        docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    info "Docker installed: $(docker --version)"
}

if ! command -v docker &>/dev/null; then
    install_docker
else
    docker compose version &>/dev/null || install_docker
    info "Docker: $(docker --version)"
fi

REAL_USER="${SUDO_USER:-$USER}"
if ! id -nG "$REAL_USER" | grep -qw docker; then
    usermod -aG docker "$REAL_USER"
    warn "User '$REAL_USER' added to docker group. Log out and back in to apply."
fi

# ── Project root ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
info "Working directory: $PROJECT_DIR"

# ── .env ───────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    [ -f .env.example ] || error ".env not found."
    cp .env.example .env
    warn ".env created from .env.example — edit API keys then re-run."
    warn "  nano $PROJECT_DIR/.env"
    exit 1
fi

mkdir -p data

# ── Firewall ───────────────────────────────────────────────────────────────────
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=8000/tcp &>/dev/null || true
    firewall-cmd --reload
    info "Firewall: port 8000 opened"
fi

# ── Build & run ────────────────────────────────────────────────────────────────
info "Building backend image..."
docker build --no-cache -f Dockerfile.backend -t flashcard-backend .

info "Stopping existing container (if any)..."
docker rm -f flashcard-backend 2>/dev/null || true

info "Starting backend container..."
docker run -d \
    --name flashcard-backend \
    --restart always \
    -p 8000:8000 \
    --env-file .env \
    -v "$PROJECT_DIR/data:/app/data" \
    flashcard-backend \
    uvicorn src.backend.main:app --host 0.0.0.0 --port 8000

info "Backend running:"
docker ps --filter name=flashcard-backend --format "  {{.Names}}  {{.Status}}  {{.Ports}}"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
info "Backend API → http://${SERVER_IP}:8000"
info "Logs:  docker logs -f flashcard-backend"
info "Stop:  docker rm -f flashcard-backend"
