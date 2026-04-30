#!/bin/bash
# Redeploy A20-App-001 (Pilot, Docker Swarm)
# HDSD: bash scripts/redeploy.sh
# Mục đích: deploy hằng ngày, KHÔNG cần sudo, dùng Swarm rolling update.
#   - Pre-check disk để tránh đầy ổ.
#   - Build image local qua docker compose (không --no-cache).
#   - docker stack deploy từ local images (không dùng registry auth).
#   - Chờ stack converge ở trạng thái healthy.
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
info "Thư mục làm việc: $PROJECT_DIR"

STACK_NAME="${STACK_NAME:-memio}"
STACK_FILE="${STACK_FILE:-docker-stack.yml}"
CONVERGE_TIMEOUT="${CONVERGE_TIMEOUT:-180}"

command -v docker >/dev/null 2>&1 || error "Chưa có docker. Hãy cài Docker rồi chạy: sudo bash scripts/bootstrap.sh"
docker compose version >/dev/null 2>&1 || error "Thiếu docker compose plugin. Hãy chạy: sudo bash scripts/bootstrap.sh"

SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "unknown")
[ "$SWARM_STATE" = "active" ] || error "Swarm chưa init. Hãy chạy: sudo bash scripts/bootstrap.sh"

[ -f "$STACK_FILE" ]  || error "Thiếu $STACK_FILE tại $PROJECT_DIR"
[ -f .env ]            || error "Thiếu .env tại $PROJECT_DIR"

# ── 1. Pre-check disk: prune build cache khi free < 6GB ───────────────────────
DISK_FREE_GB=$(df --output=avail -BG / | tail -n1 | tr -dc '0-9')
DISK_THRESHOLD_GB=${DISK_THRESHOLD_GB:-6}
info "Disk free trên / : ${DISK_FREE_GB}GB (ngưỡng prune: ${DISK_THRESHOLD_GB}GB)"
if [ "${DISK_FREE_GB:-0}" -lt "$DISK_THRESHOLD_GB" ]; then
    warn "Disk free thấp -> docker builder prune -f + image prune -f"
    docker builder prune -f || true
    docker image prune -f   || true
fi

# ── 2. Build image local ───────────────────────────────────────────────────────
info "Build local images: backend + frontend"
docker compose build backend frontend

# ── 3. Deploy stack lên Swarm ─────────────────────────────────────────────────
info "Deploy stack '$STACK_NAME' từ $STACK_FILE..."
# Stack này cố ý dùng local images (không registry), nên không cần Swarm resolve/pin digest.
# `--resolve-image=never` sẽ tránh cảnh báo "could not be accessed on a registry to record its digest".
# `--detach=false` để hành vi rõ ràng (và tránh warning về default trong tương lai).
docker stack deploy \
  --detach=false \
  --resolve-image=never \
  -c "$STACK_FILE" \
  "$STACK_NAME"

# ── 4. Chờ stack converge ─────────────────────────────────────────────────────
info "Chờ các service đạt replicas mong muốn (timeout ${CONVERGE_TIMEOUT}s)..."
elapsed=0
while [ "$elapsed" -lt "$CONVERGE_TIMEOUT" ]; do
    NOT_READY=$(docker stack services "$STACK_NAME" \
        --format '{{.Name}} {{.Replicas}}' \
        | awk '{
            n=split($2, a, "/");
            if (n==2 && a[1]!=a[2]) print $0
        }')
    if [ -z "$NOT_READY" ]; then
        info "Tất cả service đã đạt replicas mong muốn sau ${elapsed}s."
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
done
if [ -n "${NOT_READY:-}" ]; then
    warn "Một số service chưa converge:"
    echo "$NOT_READY"
fi

# ── 5. Health gate backend (curl tới container đang publish 8000 nội bộ) ─────
# Backend không publish ra host trong stack file -> bỏ qua external curl.
# Dùng `docker service ps` để kiểm tra trạng thái task gần nhất.

info "Trạng thái service:"
docker stack services "$STACK_NAME"

info "Task gần nhất (top 10):"
docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null | head -n 11 || true

info "Redeploy hoàn tất. Xem log: docker service logs -f ${STACK_NAME}_backend"
