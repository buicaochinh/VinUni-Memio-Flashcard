#!/bin/bash
# Bootstrap server cho A20-App-001 (Pilot, Swarm-based)
# HDSD: sudo bash scripts/bootstrap.sh
#
# Lưu ý: Docker engine + compose plugin phải được cài SẴN trước khi chạy script.
# Mục đích bootstrap (chạy 1 lần, hoặc khi đổi cấu hình hệ thống):
#   - Kiểm tra Docker đã có chưa (nếu thiếu thì hướng dẫn cài và thoát).
#   - Ghi /etc/docker/daemon.json: BuildKit GC + log rotation.
#   - Bật swap 2GB (nếu chưa có).
#   - Mở firewall UFW (80/443) nếu UFW có sẵn.
#   - Init Docker Swarm (single-node) nếu chưa init.
#   - Restart Docker khi đổi daemon.json.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Cần quyền sudo: sudo bash scripts/bootstrap.sh"

# ── 1. Kiểm tra Docker đã cài ─────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
    error "Docker chưa cài. Hãy cài Docker engine + compose plugin theo hướng dẫn chính thức:
  https://docs.docker.com/engine/install/
Sau đó chạy lại: sudo bash scripts/bootstrap.sh"
fi
if ! docker compose version >/dev/null 2>&1; then
    error "Thiếu docker compose plugin. Cài thêm theo:
  https://docs.docker.com/compose/install/linux/
Sau đó chạy lại: sudo bash scripts/bootstrap.sh"
fi
info "Docker: $(docker --version)"
info "Compose: $(docker compose version --short 2>/dev/null || echo unknown)"

# ── 2. Cấu hình daemon.json (BuildKit GC + log rotation) ──────────────────────
DAEMON_JSON=/etc/docker/daemon.json
DESIRED_DAEMON_JSON='{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "8GB"
    }
  }
}'

mkdir -p /etc/docker
NEED_DOCKER_RESTART=0
if [ ! -f "$DAEMON_JSON" ] || ! diff -q <(echo "$DESIRED_DAEMON_JSON") "$DAEMON_JSON" >/dev/null 2>&1; then
    info "Cập nhật $DAEMON_JSON (log rotation + BuildKit GC)..."
    if [ -f "$DAEMON_JSON" ]; then
        cp "$DAEMON_JSON" "${DAEMON_JSON}.bak.$(date +%s)"
    fi
    echo "$DESIRED_DAEMON_JSON" > "$DAEMON_JSON"
    NEED_DOCKER_RESTART=1
else
    info "$DAEMON_JSON đã đúng cấu hình."
fi

# ── 3. Swap 2GB (nếu chưa có) ─────────────────────────────────────────────────
SWAP_FILE=/swapfile
SWAP_SIZE_MB=2048
if swapon --show | grep -q '^/'; then
    info "Swap đã bật: $(swapon --show --noheadings | awk '{print $1, $3}')"
else
    info "Bật swap ${SWAP_SIZE_MB}MB tại $SWAP_FILE..."
    if ! fallocate -l "${SWAP_SIZE_MB}M" "$SWAP_FILE" 2>/dev/null; then
        dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB" status=progress
    fi
    chmod 600 "$SWAP_FILE"
    mkswap "$SWAP_FILE"
    swapon "$SWAP_FILE"
    if ! grep -q "^${SWAP_FILE} " /etc/fstab; then
        echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab
    fi
    info "Swap bật xong: $(swapon --show --noheadings | awk '{print $1, $3}')"
fi

if ! grep -q '^vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p >/dev/null || true
fi

# ── 4. UFW (tùy chọn) ─────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
    info "Cấu hình UFW firewall (80/443)..."
    ufw allow 80/tcp >/dev/null
    ufw allow 443/tcp >/dev/null
    info "Đã mở port 80/443 trên UFW."
fi

# ── 5. Restart Docker nếu đổi daemon.json ─────────────────────────────────────
if [ "$NEED_DOCKER_RESTART" = "1" ]; then
    info "Restart Docker để áp daemon.json mới..."
    systemctl restart docker
fi

# ── 6. Init Docker Swarm (single-node) ────────────────────────────────────────
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "unknown")
if [ "$SWARM_STATE" = "active" ]; then
    info "Swarm đã active (node: $(docker info --format '{{.Swarm.NodeID}}' 2>/dev/null || echo unknown))."
else
    ADVERTISE_ADDR=$(hostname -I | awk '{print $1}')
    info "Init Docker Swarm với advertise-addr=$ADVERTISE_ADDR..."
    docker swarm init --advertise-addr "$ADVERTISE_ADDR" >/dev/null
    info "Swarm init xong."
fi

# ── Kết thúc ──────────────────────────────────────────────────────────────────
info "Bootstrap hoàn tất."
info "Bước tiếp: bash scripts/redeploy.sh (không cần sudo nếu user thuộc group docker)."
