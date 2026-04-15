#!/bin/bash
# Deploy script cho Debian 12
# HDSD: sudo bash scripts/deploy.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Root check ─────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || error "Cần quyền sudo: sudo bash scripts/deploy.sh"

# ── 2. Cài đặt Docker (Debian 12) ─────────────────────────────────────────────
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
    info "Docker đã được cài đặt: $(docker --version)"
    docker compose version &>/dev/null || install_docker
fi

# ── 3. Cấu hình Firewalld/UFW (Tuỳ chọn) ──────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Cấu hình UFW firewall cho Web App..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    info "Đã mở port 80 và 443 (HTTP/HTTPS) trên UFW"
fi

# ── 4. Set up .env ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
info "Thư mục làm việc: $PROJECT_DIR"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        warn "Đã tạo file .env từ .env.example. Vui lòng cập nhật thông tin trước khi deploy."
        exit 1
    else
        error "Không tìm thấy .env hoặc .env.example."
    fi
fi

# Đảm bảo frontend có đường dẫn host 
if ! grep -q "^NEXT_PUBLIC_API_URL" .env; then
    echo "NEXT_PUBLIC_API_URL=https://api.flashcard.tenmien.com" >> .env
    warn "Đã thêm NEXT_PUBLIC_API_URL=https://api.flashcard.tenmien.com vào .env"
    warn "Hãy đổi 'tenmien.com' thành domain thật của bạn trong file .env trước khi deploy!"
fi

mkdir -p data

# ── 5. Build & Deployment ─────────────────────────────────────────────────────
info "Deploying hệ thống bằng Docker Compose..."
docker compose pull --ignore-buildable || true
docker compose build --no-cache
docker compose down --remove-orphans || true
docker compose up -d

info "Chờ các service khởi động..."
sleep 5
docker compose ps

# ── Kết thúc ──────────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
info "Deploy thành công!"
info "Lưu ý: Mở file Caddyfile để đổi 'tenmien.com' thành domain thật của bạn!"
info "Đồng thời trỏ 2 bản ghi A trên cấu hình DNS về IP: ${SERVER_IP}"
echo -e "  ${GREEN}Frontend  (Next.js)  ${NC}→  https://flashcard.tenmien.com"
echo -e "  ${GREEN}Backend API (FastAPI)${NC}→  https://api.flashcard.tenmien.com"
echo ""
info "Kiểm tra log: docker compose logs -f"
