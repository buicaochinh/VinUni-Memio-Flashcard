## Handoff Notes (Memio) — 2026-04-27

Mục tiêu: Learning Automation “Study Buddy Bot” (Telegram/Discord) + JWT auth + worker scheduler + chuẩn bị billing/quota (MoMo/ZaloPay) + chuyển migrations sang Alembic.

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
- Backend:
  - `uvicorn src.main:app --reload`
- Frontend:
  - `cd frontend && npm run dev`
  - `cd frontend && npm run lint`
- Alembic:
  - `alembic current`
  - `alembic stamp head` (DB đã có tables)
  - `alembic revision -m "..." --autogenerate`
  - `alembic upgrade head`

### Việc còn dang dở / cần làm tiếp
- **UI Automation/Integrations** (frontend) để nhập code và gọi `POST /api/integrations/link` (JWT).
- `ChatIntegration.dm_chat_id` hiện worker cần để gửi; cần đảm bảo được set đúng (hiện link endpoint mới set `provider_user_id`).
- Discord integration + Weekly report + Billing/Quota (MoMo/ZaloPay) chưa triển khai.

