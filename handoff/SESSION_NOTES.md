## Handoff Notes (Memio) — 2026-04-27

**Product stage decision (2026-04-29): PILOT.**
- Scope: triển khai thật cho nhóm người dùng kiểm soát, ưu tiên ổn định + thu phản hồi.
- Khi AI agent đọc lại file này, mặc định coi sản phẩm ở giai đoạn Pilot (không tự gán Prototype/MVP/Production-ready nếu chưa có quyết định mới).

## Update — 2026-04-29 (Swarm build local, deploy tay qua SSH)

Bối cảnh: server `2GB RAM / 2 vCPU / 30GB SSD`. Quyết định hiện tại: không dùng CI/CD auto deploy, chỉ deploy thủ công trên server để dễ kiểm soát.

> Source of truth về deploy/topology/scripts/limits: xem `PROJECT_CONTEXT.md` (mục Deployment).

### Files chính
- `docker-stack.yml`: dùng local image tags:
  - `backend/worker/beat`: `a20-app-001-backend:pilot`
  - `frontend`: `a20-app-001-frontend:pilot`
- `scripts/bootstrap.sh`: giữ nguyên vai trò bootstrap (daemon.json, swap, UFW, swarm init), không cài Docker.
- `scripts/redeploy.sh`:
  - pre-check disk
  - build local image: `docker compose build backend frontend`
  - deploy stack: `docker stack deploy -c docker-stack.yml memio`
  - chờ converge + in trạng thái service/task
- `scripts/deploy.sh`: wrapper gọi bootstrap khi cần rồi chạy redeploy.

### Quy trình deploy / checklist / lệnh quan sát

Các bước và checklist thao tác tay đã được chuẩn hoá trong `PROJECT_CONTEXT.md` để tránh trùng lặp và drift.

### Việc còn để pha sau (theo quyết định)
- B: tối ưu image backend (đổi base, multi-stage gọn) — chưa làm.
- G: đo lại baseline 5 lần liên tiếp để xác nhận downtime ngắn (Swarm rolling update với `start-first` thường downtime <5s cho stateless).

Mục tiêu: Learning Automation “Study Buddy Bot” (Telegram/Discord) + JWT auth + worker scheduler + chuẩn bị billing/quota (MoMo/ZaloPay) + chuyển migrations sang Alembic.

## Update — 2026-04-28

### Backend
- **Fix Telegram /start + liên kết để worker gửi được**:
  - `LinkCode` lưu thêm `dm_chat_id` (chat id Telegram) để copy sang `ChatIntegration.dm_chat_id` lúc link.
  - `/start` hiện nhận cả dạng `/start@BotName` và có log lỗi khi `sendMessage` fail.
  - Thêm commands trong Telegram để set nơi nhận weekly report:
    - `/setgroup` hoặc `/setreport`: set `ChatIntegration.group_target_id = chat_id` (group hiện tại)
    - `/unsetgroup` hoặc `/unsetreport`: unset `group_target_id`
  - File: `src/app/api/endpoints/integrations_telegram.py`

- **Integrations API (JWT)**:
  - `GET /api/integrations/me` (list integrations của user hiện tại)
  - `PATCH /api/integrations/{provider}` (update `timezone`, `send_window`, `daily_goal`, `group_target_id`)
  - `DELETE /api/integrations/{provider}` (hủy liên kết)
  - `POST /api/integrations/link` đã được cập nhật để copy `dm_chat_id` từ `LinkCode` sang `ChatIntegration`
  - Thêm debug endpoints:
    - `POST /api/integrations/weekly_report/test`: gửi test weekly report (tới `group_target_id` hoặc `dm_chat_id`)
    - `POST /api/integrations/due/test`: gửi test 1–3 thẻ đến hạn vào DM (không spam group)
  - File: `src/app/api/endpoints/integrations.py`

- **Alembic migrations bổ sung (cho DB cũ thiếu bảng/cột)**:
  - `alembic/versions/0002_integ`: tạo `link_codes`, `chat_integrations` nếu thiếu
  - `alembic/versions/0003_dm_chat`: thêm `link_codes.dm_chat_id`
  - `alembic/versions/0004_auth_sess`: tạo `auth_sessions` (để login session không lỗi `relation auth_sessions does not exist`)
  - `alembic/versions/0005_integ_counters`: thêm counters `sent_today/sent_today_date` trong `chat_integrations` để worker không spam và tôn trọng `daily_goal`
  - `alembic/versions/0006_weekly_report`: tracking weekly report (`weekly_report_week/weekly_report_sent_at`) trong `chat_integrations`

- **Docker backend**:
  - `Dockerfile.backend` copy thêm `alembic.ini` + thư mục `alembic/` để chạy migrations trong container.

- **Worker / scheduling (Telegram Study Buddy)**:
  - `send_due_cards` tôn trọng `timezone`, `send_window`, `daily_goal`, có cooldown và gửi tối đa N thẻ/lần chạy.
  - Ưu tiên thẻ overdue/hard hơn: sort theo `next_review` rồi `ease_factor`.
  - `send_weekly_report` gửi report 7 ngày gần nhất dựa trên `study_sessions` → `group_target_id` (fallback `dm_chat_id`) và idempotent theo tuần.
    - Nội dung đã nâng cấp: active_days/7, best_day, backlog due, trend bar 7 ngày.
  - Beat schedule: thêm weekly report (Thứ Hai 08:00).
  - Files: `src/app/worker/tasks.py`, `src/app/worker/celery_app.py`

### Frontend
- **UI Liên kết Telegram**:
  - Trang mới: `frontend/src/app/integrations/page.tsx` (nhập mã, xem trạng thái, cấu hình `timezone/send_window/daily_goal`, hủy liên kết).
  - Sidebar thêm mục “Liên kết”: `frontend/src/components/AppShell.tsx`
  - Hiển thị progress “tiến độ hôm nay” (sent_today/daily_goal) dạng progress bar và empty state tốt hơn.
  - Thêm input cấu hình `group_target_id` (weekly report) ngay trên UI.
  - Thêm onboarding “Hướng dẫn nhanh” (start/link, /setgroup, cách bấm rating).
  - Thêm nút “Test weekly report” và “Test gửi thẻ” để debug routing/bot.

- **Chuyển login sang JWT sessions**:
  - `frontend/src/lib/app-client.ts`:
    - login gọi `/api/auth/session/login/*`, lưu `flashcard_tokens` (access + refresh)
    - thêm `authFetch()` tự refresh 1 lần khi 401
    - thêm client functions: `fetchIntegrations/linkIntegration/updateIntegration/deleteIntegration`
  - `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx` cập nhật để dùng flow mới

### Dọn bảng DB thừa (orphan tables)
- Đã dùng script ad-hoc để liệt kê bảng không thuộc schema Memio và DROP các bảng thừa.
- Ghi chú: thư mục `scratch/` đã gitignored, nên script này nên đặt local trong `scratch/` (không commit).
- Gợi ý chạy (local):
  - `python scratch/db_orphan_tables.py` (dry-run)
  - `python scratch/db_orphan_tables.py --execute --yes` (chỉ DROP bảng rỗng)
  - `python scratch/db_orphan_tables.py --execute --yes --allow-non-empty` (DROP cả bảng có dữ liệu — backup trước)

### Tóm tắt những thay đổi chính

#### Backend
- **Bỏ login Guest**:
  - Đã xóa `/api/auth/login/guest` và `/api/auth/session/login/guest` trong `src/app/api/endpoints/auth.py`.
  - `src/app/schemas/user.py` đã xóa `GuestLoginRequest` và bỏ `is_guest` khỏi `UserResponse`.
  - `src/app/services/user_service.py` vẫn còn `create_guest_user()` nhưng không còn được gọi từ API/UI.

- **JWT sessions (login trả token + refresh)**:
  - Mới: `POST /api/auth/session/login/google`, `POST /api/auth/session/login/username`, `POST /api/auth/session/refresh`
  - Code: `src/app/utils/jwt_auth.py`, schema `src/app/schemas/auth.py`
  - DB: `AuthSession` lưu refresh token hash trong `src/app/models/domain.py`
  - Env: `JWT_SECRET`, `JWT_ACCESS_TOKEN_MINUTES`, `JWT_REFRESH_TOKEN_DAYS` trong `src/app/core/config.py`

- **Learning Automation DB models** (`src/app/models/domain.py`):
  - `AuthSession`, `ChatIntegration`, `LinkCode`
  - Lưu ý: đã sửa lỗi index trùng gây crash startup.

- **Telegram integration**:
  - Webhook: `POST /api/integrations/telegram/webhook` (`src/app/api/endpoints/integrations_telegram.py`)
  - `/start` tạo `LinkCode` (10 phút) và **send message thật** qua Telegram API.
  - Callback rating: `callback_data = rate:{card_id}:{quality}` → verify `ChatIntegration` theo `provider_user_id` → update SM-2 progress qua `card_service.update_card_progress`.
  - Telegram API client: `src/app/services/telegram_service.py` (`send_message` async + `send_message_sync`).
  - Env: `TELEGRAM_BOT_TOKEN` trong `src/app/core/config.py` và `.env.example`.

- **Link code endpoint (JWT)**:
  - `POST /api/integrations/link` (`src/app/api/endpoints/integrations.py`)
  - JWT dependency: `src/app/api/deps.py` (`get_current_user_id` đọc Bearer access token)

- **Worker + Redis + Celery**:
  - `docker-compose.yml` thêm `redis`, `worker`, `beat`.
  - Celery app: `src/app/worker/celery_app.py` (beat mỗi 5 phút gọi task).
  - Task: `src/app/worker/tasks.py` chọn 1 thẻ due/user và gửi Telegram message kèm inline buttons (0–3) bằng `send_message_sync`.
  - `requirements.txt` đã thêm `celery`, `redis`, `PyJWT`.

- **Chuyển migrations sang Alembic**:
  - Thêm `alembic.ini`, `alembic/env.py` (đã fix sys.path để import `src.*`), `alembic/versions/0001_baseline.py` (baseline rỗng, an toàn cho DB hiện hữu).
  - `src/app/db/session.py:init_db()` giờ là **no-op** (không `create_all()` runtime nữa).
  - Lệnh cho DB đã có sẵn tables: `alembic stamp head` (đã chạy trong workspace).

#### Frontend
- **Loại bỏ `next-themes`** do lỗi “script tag in React component”:
  - Provider mới: `frontend/src/components/ThemeProvider.tsx` (tự quản lý theme + class `dark`).
  - Toggle: `frontend/src/components/ThemeToggle.tsx` dùng `useTheme()` từ provider mới.

- **Fix hydration mismatch do localStorage user**:
  - Thêm `useStoredUser()` trong `frontend/src/lib/app-client.ts` dùng `useSyncExternalStore`.
  - Có **cache snapshot** để tránh infinite loop (“getSnapshot should be cached…”).
  - Các page đã chuyển sang `useStoredUser()`:
    - `frontend/src/app/page.tsx`
    - `frontend/src/app/analytics/page.tsx`
    - `frontend/src/app/generate/page.tsx`
    - `frontend/src/app/study/[deckId]/page.tsx`

- **Fix runtime**: `useMemo is not defined` → đã thêm import `useMemo` vào `frontend/src/app/study/[deckId]/page.tsx`.

- **Bỏ login guest UI**:
  - `frontend/src/app/login/page.tsx` đã bỏ nút “Tiếp tục với tư cách Khách”.
  - `frontend/src/lib/app-client.ts` đã bỏ `loginAsGuest`.

### Env vars mới cần có
- `JWT_SECRET=...` (bắt buộc)
- `TELEGRAM_BOT_TOKEN=...` (bắt buộc nếu bật bot)

### Các lệnh quan trọng

Các lệnh chạy dev và các lệnh vận hành/migration tham khảo ở `README.md` (dev) và `PROJECT_CONTEXT.md` (deploy/ops).

### Việc còn dang dở / cần làm tiếp
- `ChatIntegration.dm_chat_id` là bắt buộc để worker gửi; nếu user đã link từ trước mà thiếu `dm_chat_id` thì gõ `/start` và link lại bằng mã mới.
- Discord/Slack: bỏ qua (theo quyết định hiện tại).
- **Weekly report**:
  - Nội dung report dựa trên `study_sessions` → cần đảm bảo mọi flow học đều ghi session ổn định.
  - Đã có “Test weekly report” (button/API).
- **Reminder thông minh**:
  - Hiện mới ưu tiên overdue + ease_factor; chưa có logic “bù nhịp” khi user bỏ lỡ nhiều ngày, chưa có rate-limit theo user ngoài cooldown đơn giản.
- **Bảo mật/Auth**:
  - Frontend dùng JWT cho integrations; các endpoint legacy vẫn dùng `user_id` query (chưa migrate hết).
- Billing/Quota (MoMo/ZaloPay) chưa triển khai.

