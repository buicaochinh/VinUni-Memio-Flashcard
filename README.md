# Memio - AI Smart Flashcards

Memio là ứng dụng học tập dùng AI để tạo flashcards từ tài liệu PDF/DOCX/TXT và áp dụng thuật toán **SM-2** để ôn tập theo spaced repetition. Repo này cũng có **Study Buddy Bot (Telegram)**: tự gửi thẻ theo lịch cá nhân hóa và cho phép chấm điểm ngay trong chat (inline 0–3), kèm weekly report vào nhóm.

[Hướng dẫn sản phẩm (triết lý, thuật toán, sử dụng, tích hợp Telegram)](docs/PRODUCT_GUIDE.md)

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

- `src/main.py`: Điểm khởi động chính của Backend FastAPI
- `src/app/api/`: Chứa các API endpoints
- `src/app/services/`: Chứa logic nghiệp vụ (Business Logic)
- `src/app/models/`: Chứa định nghĩa database models (SQLModel)
- `src/app/schemas/`: Chứa định nghĩa Pydantic models
- `src/app/db/`: Cấu hình database và session
- `src/app/core/`: Các cấu hình dùng chung và thuật toán (SM-2)
- `src/app/worker/`: Celery worker + beat (tự gửi thẻ + weekly report)
- `frontend/src/app/`: Next.js routes (workspace/generate/study/analytics/integrations)

## Yêu cầu

| Tool | Phiên bản tối thiểu |
| --- | --- |
| Python | 3.11+ |
| Node.js | 20+ |
| Docker | 24+ (chỉ cần deploy) |
| npm | 9+ |

---

## Cài đặt nhanh (Local Development)

### 1. Clone và cấu hình môi trường

```bash
git clone <repo-url>
cd A20-App-001
cp .env.example .env
```

Chỉnh sửa `.env` — xem [Biến môi trường](#biến-môi-trường) bên dưới.

### 2. Cài đặt Python

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**

```powershell
python -m venv .venv
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Cài đặt Frontend

```bash
cd frontend && npm install
```

### 4. Chạy ứng dụng

**Option — Next.js + FastAPI (full-stack):**

Terminal 1 (Backend):

```bash
source .venv/bin/activate
uvicorn src.main:app --reload
```

Terminal 2 (Frontend):

```bash
cd frontend && npm run dev
# → http://localhost:3000
```

Terminal 3 (Redis, nếu dùng Study Buddy Bot / worker):

```bash
docker run --rm -p 6379:6379 redis:7-alpine
```

Terminal 4 (Celery worker, nếu dùng Study Buddy Bot / worker):

```bash
source .venv/bin/activate
celery -A src.app.worker.celery_app.celery_app worker -l INFO
```

Terminal 5 (Celery beat, nếu dùng Study Buddy Bot / weekly report):

```bash
source .venv/bin/activate
celery -A src.app.worker.celery_app.celery_app beat -l INFO
```

---

## Biến môi trường

Sao chép `.env.example` thành `.env` và điền các giá trị:

| Biến | Bắt buộc | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | **Có** | — | API key Anthropic Claude |
| `OPENAI_API_KEY` | Tùy chọn | — | API key OpenAI (fallback) |
| `OPENROUTER_API_KEY` | Tùy chọn | — | API key OpenRouter (fallback) |
| `DEFAULT_MODEL` | Không | `claude-3-5-sonnet-20240620` | Model LLM mặc định |
| `NEXT_PUBLIC_API_URL` | **Có (deploy)** | — | URL backend dùng khi build Docker frontend (`docker-compose.yml` truyền build-arg) |
| `NEXT_PUBLIC_API_BASE_URL` | **Có (dev)** | `http://localhost:8000` | URL backend dùng trong dev (frontend đọc trong `frontend/src/lib/app-client.ts`) |
| `DATABASE_URL` | **Có** | — | PostgreSQL connection string |
| `LOG_LEVEL` | Không | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`) |
| `JWT_SECRET` | **Có** | — | Secret cho JWT sessions (integrations + refresh) |
| `TELEGRAM_BOT_TOKEN` | Có nếu bật bot | — | Token bot Telegram (@BotFather) |

```bash
source .venv/bin/activate
uvicorn src.main:app --reload
```

**Terminal 1 — Windows (PowerShell):**

```powershell
.\.venv\Scripts\activate
uvicorn src.main:app --reload
```

---

## Triển khai Docker (Production)

### Cấu trúc deploy

```text
A20-App-001/
├── Dockerfile.backend      # Python 3.11 Alpine
├── Dockerfile.frontend     # Node 20 Alpine (multi-stage)
├── docker-compose.yml      # Caddy + Backend + Frontend + Redis + Worker + Beat
├── Caddyfile               # Reverse proxy (mem.io.vn)
├── scripts/
│   └── deploy.sh           # Auto-deploy script (Debian 12+)
└── db_deploy/              # PostgreSQL standalone (server riêng)
    ├── docker-compose.yml
    ├── .env.example
    └── deploy.sh
```

### Triển khai toàn bộ stack

```bash
cp .env.example .env
# Chỉnh sửa .env với đúng giá trị production

sudo bash scripts/deploy.sh
```

Script tự động: kiểm tra Docker, cấu hình firewall UFW (port 80, 443), chạy `docker compose up -d`.

| Service | Cổng nội bộ |
| --- | --- |
| Frontend (Next.js) | `3000` |
| Backend (FastAPI) | `8000` |
| Caddy (HTTPS) | `80`, `443` |
| Redis | `6379` |

### Triển khai PostgreSQL độc lập

Nếu database chạy trên server riêng:

```bash
# Trên server PostgreSQL
scp -r db_deploy/ user@db-server:~/
ssh user@db-server

cd db_deploy
cp .env.example .env
nano .env   # Đổi POSTGRES_PASSWORD

sudo bash deploy.sh
```

Cập nhật `DATABASE_URL` trong `.env` của app server:

```env
DATABASE_URL=postgresql://flashcard_user:<password>@<db-server-ip>:5432/flashcard
```

### Quản lý containers

```bash
# Trạng thái
docker compose ps

# Log realtime
docker logs -f flashcard-backend
docker logs -f flashcard-frontend

# Dừng / khởi động lại
docker compose down
docker compose restart backend
```

---

## API Reference

Base URL: `http://localhost:8000` (dev) / `https://api.mem.io.vn` (prod)

Tài liệu API tương tác: `GET /docs` (Swagger UI)

| Endpoint | Method | Mô tả |
| --- | --- | --- |
| `/api/auth/login` | POST | Đăng nhập Google (legacy) |
| `/api/auth/session/login/google` | POST | Đăng nhập Google (JWT session) |
| `/api/auth/session/login/username` | POST | Đăng nhập username/password (JWT session) |
| `/api/auth/session/refresh` | POST | Refresh access token |
| `/api/decks/` | GET, POST | Danh sách deck / tạo deck |
| `/api/decks/{id}` | DELETE | Xóa deck |
| `/api/decks/{id}/share` | POST | Bật chia sẻ công khai |
| `/api/decks/shared/{token}` | GET | Truy cập deck công khai |
| `/api/cards/{deck_id}` | GET | Lấy tất cả thẻ trong deck |
| `/api/cards/{deck_id}/preview` | POST | AI preview thẻ (không lưu) |
| `/api/cards/{deck_id}/generate` | POST | AI sinh thẻ từ PDF/DOCX |
| `/api/cards/{deck_id}/analytics` | GET | Thống kê deck |
| `/api/cards/progress` | POST | Cập nhật tiến độ SM-2 |
| `/api/cards/explain` | POST | AI giải thích thẻ |
| `/api/integrations/telegram/webhook` | POST | Telegram webhook (Study Buddy Bot) |
| `/api/integrations/link` | POST | Link integration bằng code (JWT) |
| `/api/integrations/me` | GET | List integrations (JWT) |

---

## Cấu trúc thư mục

```text
A20-App-001/
├── .github/                    # GitHub Actions / workflows
├── alembic/                    # Alembic migrations
│   └── versions/               # migration scripts (0001_*.py, ...)
├── docs/                       # Tài liệu sản phẩm (Product Guide, ...)
├── handoff/                    # Ghi chú bàn giao / session notes
├── data/                       # Thư mục tạm cho upload (backend)
├── db_deploy/                  # Deploy PostgreSQL standalone (server riêng)
├── frontend/                   # Next.js 16 App Router (TypeScript)
│   ├── public/                 # Static assets
│   └── src/
│       ├── app/                # Routes (workspace/generate/study/analytics/integrations)
│       ├── components/         # UI components (AppShell, ThemeToggle, ...)
│       └── lib/                # API client + localStorage auth + utils
├── scripts/                    # Scripts vận hành (deploy, hooks, logging)
├── src/                        # Backend FastAPI (Python 3.11)
│   ├── main.py                 # FastAPI entry (mount /api)
│   ├── database.py             # Legacy DB helper (hạn chế dùng)
│   └── app/
│       ├── api/                # API routers/endpoints
│       ├── core/               # config + SM-2
│       ├── db/                 # SQLModel engine/session
│       ├── models/             # SQLModel tables (domain.py)
│       ├── schemas/            # Pydantic DTOs
│       ├── services/           # Business logic
│       ├── utils/              # shared utils (jwt, security, ...)
│       └── worker/             # Celery worker + beat + tasks
├── scratch/                    # Local scratch (gitignored)
├── alembic.ini                 # Alembic config
├── docker-compose.yml          # Caddy + backend + frontend + redis + worker + beat
├── Dockerfile.backend
├── Dockerfile.frontend
├── Caddyfile
├── requirements.txt
└── .env.example
```

---

| Lệnh | macOS / Linux | Windows (PowerShell) |
| --- | --- | --- |
| Activate venv | `source .venv/bin/activate` | `.\.venv\Scripts\activate` |
| Chạy backend | `uvicorn src.main:app --reload` | `uvicorn src.main:app --reload` |
| Chạy frontend | `cd frontend && npm run dev` | `cd frontend; npm run dev` |
| Build frontend | `cd frontend && npm run build` | `cd frontend; npm run build` |

> **Lưu ý Windows:** PowerShell dùng `;` để nối lệnh thay vì `&&`.
