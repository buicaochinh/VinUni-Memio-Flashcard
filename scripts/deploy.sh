#!/bin/bash
# Deploy script for AlmaLinux
# Usage: sudo bash scripts/deploy.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Root check ─────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || error "Run with sudo: sudo bash scripts/deploy.sh"

# ── 2. Install Docker (if missing) ────────────────────────────────────────────
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
    info "Docker already present: $(docker --version)"
    # Ensure compose plugin is available
    docker compose version &>/dev/null || install_docker
fi

# ── 3. Add current (non-root) user to docker group ────────────────────────────
REAL_USER="${SUDO_USER:-$USER}"
if ! id -nG "$REAL_USER" | grep -qw docker; then
    usermod -aG docker "$REAL_USER"
    warn "User '$REAL_USER' added to docker group. Log out and back in for this to take effect."
fi

# ── 4. Locate project root ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
info "Working directory: $PROJECT_DIR"

# ── 5. Set up .env ────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        warn ".env created from .env.example"
        warn "Edit your API keys before continuing:"
        warn "  nano $PROJECT_DIR/.env"
        warn "Then re-run:  sudo bash scripts/deploy.sh"
        exit 1
    else
        error ".env file not found and no .env.example to copy from."
    fi
fi

# Ensure NEXT_PUBLIC_API_URL is in .env (default to server's primary IP)
if ! grep -q "^NEXT_PUBLIC_API_URL" .env; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8000" >> .env
    info "Added NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8000 to .env"
fi

# Create data directory (SQLite persistence)
mkdir -p data

# ── 6. Open firewall ports (firewalld) ────────────────────────────────────────
if systemctl is-active --quiet firewalld; then
    for port in 8000 3000; do
        firewall-cmd --permanent --add-port="${port}/tcp" &>/dev/null || true
    done
    firewall-cmd --reload
    info "Firewall: ports 3000, 8000 opened"
fi

# ── 7. Build & start containers ───────────────────────────────────────────────
info "Pulling latest base images..."
docker compose pull --ignore-buildable 2>/dev/null || true

info "Building images..."
docker compose build --no-cache

info "Starting containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

info "Waiting for containers to become healthy..."
sleep 5
docker compose ps

# ── 8. Print access URLs ──────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
info "Deploy complete! Access the app at:"
echo -e "  ${GREEN}Frontend  (Next.js)  ${NC}→  http://${SERVER_IP}:3000"
echo -e "  ${GREEN}Backend API (FastAPI)${NC}→  http://${SERVER_IP}:8000"
echo ""
info "To watch logs:  docker compose logs -f"
info "To stop:        docker compose down"
