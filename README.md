# Memio - AI Smart Flashcards

Memio là ứng dụng học tập dùng AI để tạo flashcards từ tài liệu PDF/DOCX/TXT và áp dụng thuật toán **SM-2** để ôn tập theo spaced repetition. Repo này cũng có **Study Buddy Bot (Telegram)**: tự gửi thẻ theo lịch cá nhân hóa và cho phép chấm điểm ngay trong chat (inline 0–3), kèm weekly report vào nhóm.

## Tài liệu (Docs)

- `docs/INDEX.md`: mục lục tài liệu
- `docs/PRODUCT_GUIDE.md`: hướng dẫn sản phẩm (triết lý, SM-2, cách dùng web, Telegram bot)
- `PROJECT_CONTEXT.md`: source of truth kỹ thuật/vận hành (architecture, DB, API, deploy, gotchas)
- `docs/diagrams.md`: sơ đồ Mermaid
- `WORKLOG.md`: ADR/quyết định kỹ thuật
- `JOURNAL.md`: nhật ký tuần

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

## Cấu trúc repo (tóm tắt)

- **Backend**: `src/` (FastAPI)
- **Frontend**: `frontend/` (Next.js)
- **Docs**: `docs/`
- **Handoff**: `handoff/`

Chi tiết file map xem `PROJECT_CONTEXT.md`.

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

Chỉnh sửa `.env` — xem `.env.example` và phần “Biến môi trường (tóm tắt)” bên dưới.

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

Sao chép `.env.example` thành `.env` và điền các giá trị. Danh sách dưới đây là **tóm tắt**; danh sách đầy đủ + ghi chú deploy xem `PROJECT_CONTEXT.md`.

| Biến | Bắt buộc | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | **Có** | — | API key OpenAI cho sinh thẻ/giải thích |
| `ANTHROPIC_API_KEY` | Tùy chọn | — | Biến legacy, hiện không dùng cho luồng sinh thẻ chính |
| `OPENROUTER_API_KEY` | Tùy chọn | — | API key OpenRouter (fallback) |
| `DEFAULT_MODEL` | Không | `gpt-4o-mini` | Model LLM mặc định |
| `NEXT_PUBLIC_API_URL` | **Có (deploy)** | — | URL backend dùng khi build Docker frontend (`docker-compose.yml` truyền build-arg) |
| `NEXT_PUBLIC_API_BASE_URL` | **Có (dev)** | `http://localhost:8000` | URL backend dùng trong dev (frontend đọc trong `frontend/src/lib/app-client.ts`) |
| `DATABASE_URL` | **Có** | — | PostgreSQL connection string |
| `LOG_LEVEL` | Không | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`) |
| `JWT_SECRET` | **Có** | — | Secret cho JWT sessions (integrations + refresh) |
| `TELEGRAM_BOT_TOKEN` | Có nếu bật bot | — | Token bot Telegram (@BotFather) |

## API / Deploy (link)

- **API interactive docs**: `GET /docs` (Swagger UI) khi chạy backend local.
- **Danh sách endpoints + deploy guide**: xem `PROJECT_CONTEXT.md`.

| Lệnh | macOS / Linux | Windows (PowerShell) |
| --- | --- | --- |
| Activate venv | `source .venv/bin/activate` | `.\.venv\Scripts\activate` |
| Chạy backend | `uvicorn src.main:app --reload` | `uvicorn src.main:app --reload` |
| Chạy frontend | `cd frontend && npm run dev` | `cd frontend; npm run dev` |
| Build frontend | `cd frontend && npm run build` | `cd frontend; npm run build` |

> **Lưu ý Windows:** PowerShell dùng `;` để nối lệnh thay vì `&&`.
