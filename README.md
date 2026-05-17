# Memio — AI Smart Flashcards

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-000000?logo=nextdotjs)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://postgresql.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai)](https://openai.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![CI](https://github.com/buicaochinh/VinUni-Memio-Flashcard/actions/workflows/ci.yml/badge.svg)](https://github.com/buicaochinh/VinUni-Memio-Flashcard/actions/workflows/ci.yml)

---

## Giới thiệu

**Memio** là ứng dụng học tập thông minh kết hợp AI và khoa học nhận thức. Người dùng upload tài liệu học tập (PDF, DOCX, TXT), AI tự động tạo flashcard chất lượng cao, rồi lên lịch ôn tập theo thuật toán **SM-2 (Spaced Repetition)** để tối ưu trí nhớ dài hạn.

**Mục tiêu sản phẩm:**
- Giảm thời gian tạo thẻ từ hàng giờ xuống vài phút
- Cá nhân hóa lịch học dựa trên performance thực tế của từng người
- Biến việc học thụ động thành trải nghiệm tương tác có AI hỗ trợ

**Production:** [https://a20-app-001.mem.io.vn](https://a20-app-001.mem.io.vn)

---

## Tính năng chính

### 📚 Tạo thẻ thông minh
- Upload **PDF / DOCX / TXT** → GPT-4o-mini tự động trích xuất khái niệm, định nghĩa, quy trình quan trọng
- Hỗ trợ tài liệu lớn (chunking song song, tối đa 200 thẻ/lần)
- Preview và chỉnh sửa trước khi lưu
- Phát hiện ngôn ngữ tự động (Tiếng Việt, Anh, Trung)

### 🖼️ Đuổi Hình Bắt Chữ *(Pro)*
- AI chọn các khái niệm **có thể minh hoạ bằng ảnh** từ tài liệu
- Gọi **DALL-E 3** để sinh ảnh minh hoạ chất lượng cao
- Câu đố có gợi ý cụ thể ở mặt trước, đáp án ở mặt sau
- Ảnh được **download và lưu local** (không hết hạn như URL tạm của DALL-E)

### 🧠 Spaced Repetition (SM-2)
- Mỗi thẻ có lịch ôn tập riêng dựa trên điểm chất lượng 0–3
- Smart Queue: tự động ưu tiên thẻ cần ôn, giới hạn thẻ mới hàng ngày
- Swipe gesture trên mobile, phím tắt Space/←/→ trên desktop

### 🤖 Memio Coach (AI Tutor)
- Chat với AI về bất kỳ flashcard nào
- RAG: Coach đọc nội dung deck + tiến độ học + analytics của user
- Tự động giải thích flashcard, hỏi ngược, cho ví dụ, so sánh khái niệm
- Citation trực tiếp từ source_context của thẻ

### 🎮 Adventure Campaign
- Biến deck thành một chiến dịch phiêu lưu nhiều màn
- Mỗi màn là một câu hỏi trắc nghiệm có gợi ý và giải thích
- Tính điểm, XP, và accuracy

### 📊 Analytics & Thống kê
- Streak học tập hàng ngày, heatmap hoạt động
- Forgetting rate, hardest cards, weak area detection
- Dự đoán mastery timeline

### 🔗 Tích hợp
- **Telegram / Discord**: tự gửi thẻ đến hạn theo lịch cá nhân, chấm điểm inline 0–3 trong chat, weekly report
- **Notion**: sync deck từ Notion database
- **Ingestion**: tự động thu thập và tạo thẻ từ các nguồn định kỳ (cứ 10 phút/lần)
- Scheduled tasks chạy **in-process** với APScheduler — không cần Celery / Redis

### 🎯 Mục tiêu học tập
- Đặt mục tiêu mastery cho từng deck với deadline
- AI tính toán workload hàng ngày để đạt mục tiêu đúng hạn
- Urgency indicator (low / medium / high)

### 🔐 Xác thực
- Google OAuth (one-click login)
- Username/password với JWT
- Guest mode (không cần đăng ký)
- Public deck sharing qua link

---

## Công nghệ sử dụng

### Backend

| Thành phần | Công nghệ | Vai trò |
|-----------|-----------|---------|
| Web framework | FastAPI 0.136 | REST API, async endpoints |
| ORM | SQLModel + SQLAlchemy | Model định nghĩa kiêm schema validation |
| Database | PostgreSQL 15 | Lưu trữ chính (20 tables) |
| Migrations | Alembic | Quản lý schema DB (idempotent) |
| LLM integration | LangChain + OpenAI SDK | GPT-4o-mini (tạo thẻ, coach, game) |
| Image generation | OpenAI AsyncOpenAI | DALL-E 3 (1024×1024 standard) |
| HTTP client | httpx (async) | Download ảnh DALL-E về local |
| File async I/O | aiofiles | Async write file upload tạm |
| Document parsing | LangChain loaders | PyPDFLoader, Docx2txtLoader, TextLoader |
| Task scheduler | APScheduler 3.x | In-process async jobs (Telegram, ingestion) |
| Auth | PyJWT + passlib/bcrypt | JWT tokens, password hashing |
| OAuth | Google OAuth 2.0 | Login với Google |
| Spaced repetition | Custom SM-2 | Tính interval, ease_factor, next_review |
| Web search | DuckDuckGo Instant API | Coach fallback khi cần thông tin web |
| Config | pydantic-settings | Type-safe env vars |

### Frontend

| Thành phần | Công nghệ | Vai trò |
|-----------|-----------|---------|
| Framework | Next.js 15 (App Router) | Server + client rendering |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | shadcn/ui + Radix UI | Accessible UI primitives |
| Icons | Lucide React | Icon set |
| State | React hooks (useState/useCallback) | Local + derived state |
| Offline | localStorage cache | Queue progress khi mất mạng |
| Static assets | `public/generated-images/` | Lưu ảnh DALL-E download về |

### Infrastructure

| Thành phần | Công nghệ |
|-----------|-----------|
| Container | Docker + Docker Compose |
| ASGI server | Uvicorn |
| Background jobs | APScheduler (in-process, không cần Redis) |

---

## Cài đặt

### Yêu cầu

| Tool | Phiên bản |
|------|-----------|
| Python | 3.11+ |
| Node.js | 20+ |
| PostgreSQL | 15+ |
| npm | 9+ |
| Docker | 24+ *(chỉ cần nếu dùng Docker)* |

### 1. Clone và cấu hình môi trường

```bash
git clone <repo-url>
cd A20-App-001
cp .env.example .env
```

Chỉnh sửa `.env` với các giá trị phù hợp (xem bảng biến môi trường bên dưới).

### 2. Cài đặt backend

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Khởi tạo database

```bash
# Tạo database PostgreSQL trước, sau đó chạy migrations
alembic upgrade head
```

### 4. Cài đặt frontend

```bash
cd frontend
npm install
```

---

## Chạy ứng dụng (Development)

Chỉ cần **2 terminal** để chạy web app đầy đủ (APScheduler chạy in-process, không cần worker riêng):

**Terminal 1 — Backend:**
```bash
source venv/bin/activate          # Windows: .\venv\Scripts\activate
uvicorn src.main:app --reload
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
# APScheduler tự khởi động cùng uvicorn (gửi Telegram, sync ingestion)
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Chạy tests & Lint

### Backend

```bash
source .venv/bin/activate
pip install -r requirements-dev.txt   # chỉ lần đầu

# Lint
ruff check src/ tests/

# Tests (99 tests: unit + integration)
pytest tests/

# Tests + coverage report
pytest tests/ --cov=src --cov-report=term-missing
```

### Frontend

```bash
cd frontend
npm test            # Jest watch mode
npm run test:ci     # Jest CI mode + coverage
```

### CI Pipeline (GitHub Actions)

Mỗi push lên `main` sẽ tự động chạy 2 jobs song song:
- **Backend**: `ruff check` → `pytest --cov`
- **Frontend**: `tsc --noEmit` → `eslint` → `jest --ci`

---

## Biến môi trường

Sao chép `.env.example` thành `.env` và điền giá trị:

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|----------|-------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | — | Dùng cho GPT-4o-mini và DALL-E 3 |
| `JWT_SECRET` | ✅ | — | Secret key cho JWT authentication |
| `OPENAI_IMAGE_ENABLED` | — | `true` | Bật/tắt tính năng sinh ảnh DALL-E 3 |
| `DEFAULT_MODEL` | — | `gpt-4o-mini` | Model LLM mặc định |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ (dev) | `http://localhost:8000` | URL backend cho frontend dev |
| `NEXT_PUBLIC_API_URL` | ✅ (deploy) | — | URL backend khi build Docker |
| `ANTHROPIC_API_KEY` | — | — | API key Anthropic (tuỳ chọn, fallback) |
| `TELEGRAM_BOT_TOKEN` | *(bot only)* | — | Token bot Telegram |
| `GOOGLE_CLIENT_ID` | *(OAuth)* | — | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | *(OAuth)* | — | Google OAuth Client Secret |
| `LOG_LEVEL` | — | `INFO` | Logging level |
| `APP_TIMEZONE` | — | `Asia/Ho_Chi_Minh` | Timezone cho scheduler |

---

## Hướng dẫn sử dụng

### Tạo flashcard từ tài liệu
1. Đăng nhập → vào **Tạo thẻ**
2. Chọn deck (hoặc tạo mới)
3. Upload file PDF/DOCX/TXT, chọn số thẻ (10–200)
4. AI tạo preview → xem, chỉnh sửa nếu cần → **Lưu vào deck**

### Đuổi Hình Bắt Chữ *(tính năng Pro)*
1. Truy cập `/images` trực tiếp hoặc qua nav
2. Chọn deck đích, chọn số thẻ (5–20), upload tài liệu
3. AI chọn khái niệm trực quan → gọi DALL-E 3 sinh ảnh (~30–90 giây, ~$0.04/ảnh)
4. Thẻ có ảnh được lưu vào deck → **Học ngay**

### Học với Spaced Repetition
1. Vào **Bộ thẻ** → chọn deck → **Học**
2. Đọc câu hỏi, đoán đáp án, nhấn/Space để lật thẻ
3. Chấm điểm: **Lại (0) / Khó (1) / Tốt (2) / Dễ (3)**
4. SM-2 tự tính lịch ôn tiếp theo

### Memio Coach
1. Nhấn nút **Coach** trên bất kỳ flashcard nào khi học
2. AI tự động giải thích thẻ dựa trên source context
3. Hỏi thêm bằng ngôn ngữ tự nhiên: "Cho ví dụ", "Vì sao đúng?", "Hỏi ngược lại tôi"

---

## Cấu trúc thư mục

```
A20-App-001/
├── src/
│   └── app/
│       ├── api/endpoints/           # FastAPI route handlers (11 routers)
│       │   ├── cards.py             # Card CRUD + AI generation + image cards
│       │   ├── coach.py             # Memio Coach (RAG + chat)
│       │   ├── games.py             # Adventure Campaign
│       │   ├── goals.py             # Learning goals
│       │   ├── ingestion.py         # Auto-ingestion sources
│       │   ├── notifications.py     # Push notifications
│       │   └── ...
│       ├── models/domain.py         # SQLModel table definitions (20 tables)
│       ├── services/                # Business logic layer
│       ├── utils/
│       │   ├── image_generator.py   # DALL-E 3 + local image storage
│       │   └── card_pipeline.py     # Chunking, filtering, dedup
│       ├── worker/
│       │   └── scheduler.py         # APScheduler — 3 jobs in-process
│       └── core/
│           ├── config.py            # pydantic-settings (env vars)
│           └── sm2.py               # SM-2 algorithm
├── tests/
│   ├── conftest.py                  # Fixtures: SQLite test DB, TestClient, auth helpers
│   ├── unit/                        # Pure logic tests (SM-2, JWT, security, XP)
│   └── integration/                 # API endpoint tests (auth, decks)
├── alembic/versions/                # DB migrations
├── frontend/
│   ├── src/app/                     # Next.js app router pages
│   │   ├── workspace/               # Deck list (Bộ thẻ)
│   │   ├── generate/                # Card generation (Tạo thẻ)
│   │   ├── study/[deckId]/          # Flashcard study UI
│   │   ├── images/                  # Đuổi Hình Bắt Chữ
│   │   ├── coach/                   # Coach chat UI
│   │   ├── analytics/               # Thống kê
│   │   ├── integrations/            # Liên kết (Telegram, Notion...)
│   │   └── play/[deckId]/           # Adventure Campaign
│   ├── src/lib/__tests__/           # Jest unit tests
│   ├── public/generated-images/     # DALL-E ảnh download local
│   └── src/lib/app-client.ts        # API client + TypeScript types
├── .github/workflows/ci.yml         # CI: ruff + pytest (backend), tsc + eslint + jest (frontend)
├── docs/
│   ├── image-flashcard-feature.md
│   └── Architecture_Diagram.md
├── pyproject.toml                   # pytest + ruff + coverage config
├── requirements.txt
└── requirements-dev.txt             # pytest, ruff, httpx, pytest-cov
```

---

## Tài liệu kỹ thuật

| File | Nội dung |
|------|----------|
| `docs/Architecture_Diagram.md` | Sơ đồ luồng dữ liệu end-to-end |
| `docs/image-flashcard-feature.md` | Chi tiết kỹ thuật tính năng Đuổi Hình Bắt Chữ |

## API Docs

Khi chạy backend local: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
