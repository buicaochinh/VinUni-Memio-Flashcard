#!/bin/bash
# Deploy PostgreSQL — Debian 12
# Usage: sudo bash deploy.sh
# Có thể copy toàn bộ folder db_deploy ra server riêng và chạy độc lập.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Cần quyền sudo: sudo bash deploy.sh"

# ── 1. Cài đặt Docker (Debian 12) ─────────────────────────────────────────────
install_docker() {
    info "Đang cài đặt Docker cho Debian 12..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    info "Cài đặt Docker thành công: $(docker --version)"
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
    warn "Đã thêm chủ thể '$REAL_USER' vào nhóm docker. Đăng xuất và đăng nhập lại để áp dụng."
fi

# ── Locate this folder ─────────────────────────────────────────────────────────
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
info "Thư mục làm việc: $DIR"

# ── .env ───────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    warn "Đã tạo file .env từ .env.example"
    warn "Hãy đổi mật khẩu mặc định trước khi tiếp tục chạy:"
    warn "  nano $DIR/.env"
    warn "Sau khi đổi xong chạy lại lệnh:  sudo bash deploy.sh"
    exit 1
fi

# ── Firewall ───────────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Cấu hình UFW firewall cho DB..."
    ufw allow 5432/tcp
    info "Đã mở port 5432 trên UFW"
fi

# ── Start ──────────────────────────────────────────────────────────────────────
info "Khởi động PostgreSQL..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

info "Chờ PostgreSQL sẵn sàng..."
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
info "PostgreSQL đang chạy!"
info "Host:             ${SERVER_IP}:5432"
info "Connection string: postgresql://${POSTGRES_USER}:<password>@${SERVER_IP}:5432/${POSTGRES_DB}"
echo ""
info "Logs:  docker compose logs -f"
info "Stop:  docker compose down"
