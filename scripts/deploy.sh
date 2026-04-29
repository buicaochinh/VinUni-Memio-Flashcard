#!/bin/bash
# Wrapper deploy cho A20-App-001 (Pilot, Docker Swarm)
# HDSD:
#   sudo bash scripts/deploy.sh   # tự bootstrap nếu chưa init swarm/daemon.json/swap, rồi redeploy
#
# Quy trình mới (Pilot, Swarm):
#   - Docker engine + compose plugin: NGƯỜI DÙNG TỰ CÀI trước khi chạy script.
#   - scripts/bootstrap.sh : ghi daemon.json, bật swap, UFW, init swarm (cần sudo, chạy 1 lần / khi đổi cấu hình hệ thống).
#   - scripts/redeploy.sh  : build image local + docker stack deploy (không sudo, dùng hằng ngày).
#
# Khuyến nghị dùng trực tiếp:
#   sudo bash scripts/bootstrap.sh    (lần đầu)
#   bash scripts/redeploy.sh          (các lần sau)
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

if ! command -v docker >/dev/null 2>&1; then
    error "Docker chưa cài. Vui lòng cài Docker engine + compose plugin theo:
  https://docs.docker.com/engine/install/
Sau đó chạy lại script này."
fi
if ! docker compose version >/dev/null 2>&1; then
    error "Thiếu docker compose plugin. Cài thêm theo:
  https://docs.docker.com/compose/install/linux/"
fi

# Kiểm tra điều kiện cần bootstrap
NEED_BOOTSTRAP=0
[ -f /etc/docker/daemon.json ] || NEED_BOOTSTRAP=1
swapon --show | grep -q '^/' || NEED_BOOTSTRAP=1
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "unknown")
[ "$SWARM_STATE" = "active" ] || NEED_BOOTSTRAP=1

if [ "$NEED_BOOTSTRAP" = "1" ]; then
    if [ "$EUID" -ne 0 ]; then
        error "Cần bootstrap (daemon.json/swap/swarm) nhưng đang không phải root.
Chạy: sudo bash scripts/bootstrap.sh"
    fi
    info "Phát hiện chưa bootstrap, chạy bootstrap..."
    bash "$SCRIPT_DIR/bootstrap.sh"
fi

# Hạ quyền về user thường nếu đang chạy bằng sudo
if [ "$EUID" -eq 0 ] && [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    info "Hạ quyền sang $SUDO_USER cho redeploy..."
    exec sudo -u "$SUDO_USER" -E bash "$SCRIPT_DIR/redeploy.sh"
fi

bash "$SCRIPT_DIR/redeploy.sh"
