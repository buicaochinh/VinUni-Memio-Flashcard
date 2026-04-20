# Memio - AI Smart Flashcards

Memio là ứng dụng học tập dùng AI để tạo flashcards từ tài liệu PDF và áp dụng thuật toán SM-2 để hỗ trợ ôn tập theo spaced repetition.

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

- `src/main.py`: Điểm khởi động chính của Backend FastAPI
- `src/app/api/`: Chứa các API endpoints
- `src/app/services/`: Chứa logic nghiệp vụ (Business Logic)
- `src/app/models/`: Chứa định nghĩa database models (SQLModel)
- `src/app/schemas/`: Chứa định nghĩa Pydantic models
- `src/app/db/`: Cấu hình database và session
- `src/app/core/`: Các cấu hình dùng chung và thuật toán (SM-2)
- `src/streamlit_app.py`: Giao diện Streamlit chạy độc lập (nếu có)

## Yêu cầu

| Tool | Phiên bản tối thiểu |
|------|---------------------|
| Python | 3.10+ |
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

**Option A — Streamlit (standalone, không cần frontend):**
```bash
source .venv/bin/activate   # hoặc .\.venv\Scripts\activate trên Windows
streamlit run src/streamlit_app.py
# → http://localhost:8501
```

**Option B — Next.js + FastAPI (full-stack):**

Terminal 1:
```bash
source .venv/bin/activate
uvicorn src.main:app --reload
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\activate
uvicorn src.main:app --reload
```

Mở `http://localhost:8000`

### 3. Chạy frontend Next.js

Chạy cùng lúc với backend API ở trên.

```bash
cd frontend && npm run dev
# → http://localhost:3000
```

---

## Biến môi trường

Sao chép `.env.example` thành `.env` và điền các giá trị:

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|---------|-------|
| `ANTHROPIC_API_KEY` | **Có** | — | API key Anthropic Claude |
| `OPENAI_API_KEY` | Tùy chọn | — | API key OpenAI (fallback) |
| `OPENROUTER_API_KEY` | Tùy chọn | — | API key OpenRouter (fallback) |
| `DEFAULT_MODEL` | Không | `claude-3-5-sonnet-20240620` | Model LLM mặc định |
| `NEXT_PUBLIC_API_URL` | **Có** | `http://localhost:8000` | URL backend (baked vào Next.js build) |
| `DATABASE_URL` | Không | SQLite `data/flashcards.db` | PostgreSQL connection string |
| `LOG_LEVEL` | Không | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`) |

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

```
A20-App-001/
├── Dockerfile.backend      # Python 3.11 Alpine
├── Dockerfile.frontend     # Node 20 Alpine (multi-stage)
├── docker-compose.yml      # Caddy + Backend + Frontend
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
|---------|-------------|
| Frontend (Next.js) | `3000` |
| Backend (FastAPI) | `8000` |
| Caddy (HTTPS) | `80`, `443` |

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
|----------|--------|-------|
| `/api/auth/login` | POST | Đăng nhập (Google / mock) |
| `/api/decks/` | GET, POST | Danh sách deck / tạo deck |
| `/api/decks/{id}` | DELETE | Xóa deck |
| `/api/decks/{id}/share` | POST | Bật chia sẻ công khai |
| `/api/decks/shared/{token}` | GET | Truy cập deck công khai |
| `/api/cards/{deck_id}` | GET | Lấy tất cả thẻ trong deck |
| `/api/cards/{deck_id}/generate` | POST | AI sinh thẻ từ PDF/DOCX |
| `/api/cards/{deck_id}/analytics` | GET | Thống kê deck |
| `/api/cards/progress` | POST | Cập nhật tiến độ SM-2 |
| `/api/cards/explain` | POST | AI giải thích thẻ |

---

## Cấu trúc thư mục

```
A20-App-001/
├── frontend/                   # Next.js 15 (TypeScript)
│   ├── src/app/                # App Router pages
│   └── src/lib/app-client.ts   # API client, types, auth
├── src/
│   ├── backend/
│   │   ├── main.py             # FastAPI app, CORS
│   │   └── routers/
│   │       ├── auth.py         # Authentication
│   │       ├── decks.py        # Deck CRUD + sharing
│   │       └── cards.py        # Cards, generation, study
│   ├── database.py             # Schema, queries (SQLite/PostgreSQL)
│   ├── sm2.py                  # SM-2 spaced repetition algorithm
│   ├── config.py               # Environment config
│   └── streamlit_app.py        # Standalone Streamlit UI
├── db_deploy/                  # PostgreSQL Docker deployment
├── scripts/                    # Deployment scripts
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── Caddyfile
├── requirements.txt
└── .env.example
```

---

| Lệnh | macOS / Linux | Windows (PowerShell) |
|------|--------------|----------------------|
| Activate venv | `source .venv/bin/activate` | `.\.venv\Scripts\activate` |
| Chạy Streamlit | `streamlit run src/streamlit_app.py` | `streamlit run src/streamlit_app.py` |
| Chạy backend | `uvicorn src.main:app --reload` | `uvicorn src.main:app --reload` |
| Chạy frontend | `cd frontend && npm run dev` | `cd frontend; npm run dev` |
| Build frontend | `cd frontend && npm run build` | `cd frontend; npm run build` |

> **Lưu ý Windows:** PowerShell dùng `;` để nối lệnh thay vì `&&`.
