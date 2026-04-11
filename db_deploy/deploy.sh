#!/bin/bash
# Deploy PostgreSQL — AlmaLinux
# Usage: sudo bash deploy.sh
# Có thể copy toàn bộ folder db_deploy ra server riêng và chạy độc lập.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Run with sudo: sudo bash deploy.sh"

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

# ── Locate this folder ─────────────────────────────────────────────────────────
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
info "Working directory: $DIR"

# ── .env ───────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    warn ".env created from .env.example"
    warn "Edit the password before continuing:"
    warn "  nano $DIR/.env"
    warn "Then re-run:  sudo bash deploy.sh"
    exit 1
fi

# ── Firewall ───────────────────────────────────────────────────────────────────
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=5432/tcp &>/dev/null || true
    firewall-cmd --reload
    info "Firewall: port 5432 opened"
fi

# ── Start ──────────────────────────────────────────────────────────────────────
info "Starting PostgreSQL..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

info "Waiting for PostgreSQL to be healthy..."
for i in {1..15}; do
    if docker compose exec -T postgres pg_isready &>/dev/null; then
        break
    fi
    sleep 2
done

docker compose ps

SERVER_IP=$(hostname -I | awk '{print $1}')
POSTGRES_USER=$(grep "^POSTGRES_USER" .env | cut -d= -f2-)
POSTGRES_DB=$(grep "^POSTGRES_DB"   .env | cut -d= -f2-)

echo ""
info "PostgreSQL is running!"
info "Host:             ${SERVER_IP}:5432"
info "Connection string: postgresql://${POSTGRES_USER}:<password>@${SERVER_IP}:5432/${POSTGRES_DB}"
echo ""
info "Logs:  docker compose logs -f"
info "Stop:  docker compose down"
