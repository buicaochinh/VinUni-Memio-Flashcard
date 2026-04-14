#!/bin/bash
# Deploy frontend (Next.js) — AlmaLinux
# Usage: sudo bash scripts/deploy-frontend.sh
#
# NEXT_PUBLIC_API_URL is baked in at build time.
# Set it in .env before running this script, e.g.:
#   NEXT_PUBLIC_API_URL=http://192.168.1.100:8000
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Run with sudo: sudo bash scripts/deploy-frontend.sh"

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

# ── Resolve NEXT_PUBLIC_API_URL ────────────────────────────────────────────────
# Priority: already exported env var > .env file > auto-detect server IP
if [ -z "${NEXT_PUBLIC_API_URL:-}" ]; then
    if [ -f .env ] && grep -q "^NEXT_PUBLIC_API_URL" .env; then
        NEXT_PUBLIC_API_URL=$(grep "^NEXT_PUBLIC_API_URL" .env | cut -d= -f2-)
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
        NEXT_PUBLIC_API_URL="http://${SERVER_IP}:8000"
        warn "NEXT_PUBLIC_API_URL not set — defaulting to ${NEXT_PUBLIC_API_URL}"
    fi
fi
info "NEXT_PUBLIC_API_URL = $NEXT_PUBLIC_API_URL"

# ── Firewall ───────────────────────────────────────────────────────────────────
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=3000/tcp &>/dev/null || true
    firewall-cmd --reload
    info "Firewall: port 3000 opened"
fi

# ── Build & run ────────────────────────────────────────────────────────────────
info "Building frontend image (NEXT_PUBLIC_API_URL baked in)..."
docker build --no-cache \
    -f Dockerfile.frontend \
    --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    -t flashcard-frontend \
    .

info "Stopping existing container (if any)..."
docker rm -f flashcard-frontend 2>/dev/null || true

info "Starting frontend container..."
docker run -d \
    --name flashcard-frontend \
    --restart always \
    -p 3000:3000 \
    flashcard-frontend

info "Frontend running:"
docker ps --filter name=flashcard-frontend --format "  {{.Names}}  {{.Status}}  {{.Ports}}"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
info "Frontend → http://${SERVER_IP}:3000"
info "Logs:  docker logs -f flashcard-frontend"
info "Stop:  docker rm -f flashcard-frontend"
