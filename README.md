# AI Smart Flashcards VinUni

AI Smart Flashcards là ứng dụng học tập dùng AI để tạo flashcards từ tài liệu PDF và áp dụng thuật toán SM-2 để hỗ trợ ôn tập theo spaced repetition.

## Thành phần chính

- `src/streamlit_app.py`: giao diện Streamlit chạy độc lập
- `src/backend/main.py`: API FastAPI cho frontend
- `frontend/`: giao diện Next.js
- `src/database.py`: SQLite persistence
- `src/sm2.py`: logic tính lịch ôn tập

## Yêu cầu

- Python 3.10+
- Node.js 20+ và `npm`
- File `.env` ở thư mục gốc
- `OPENAI_API_KEY` hợp lệ nếu muốn tạo flashcards từ PDF bằng AI

Ví dụ `.env`:

```env
OPENAI_API_KEY=your_api_key_here
ANTHROPIC_API_KEY=your_optional_key_here
```

## Cài đặt

### Python

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

> **Lưu ý Windows:** Lệnh `source` không hoạt động trên PowerShell. Dùng `.\.venv\Scripts\activate` thay thế. Lệnh `Set-ExecutionPolicy` chỉ cần chạy một lần duy nhất.

### Frontend

```bash
cd frontend
npm install
```

## Cách chạy

### 1. Chạy Streamlit

Phù hợp nếu bạn chỉ muốn dùng bản Python UI.

**macOS / Linux:**

```bash
source .venv/bin/activate
streamlit run src/streamlit_app.py
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\activate
streamlit run src/streamlit_app.py
```

Mở `http://localhost:8501`

### 2. Chạy backend API

Phù hợp khi dùng frontend Next.js.

**macOS / Linux:**

```bash
source .venv/bin/activate
uvicorn src.backend.main:app --reload
```

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\activate
uvicorn src.backend.main:app --reload
```

Mở `http://localhost:8000`

### 3. Chạy frontend Next.js

Chạy cùng lúc với backend API ở trên.

```bash
cd frontend
npm run dev
```

Mở `http://localhost:3000`

### 4. Chạy đầy đủ frontend + backend

Mở 2 terminal:

**Terminal 1 — macOS / Linux:**

```bash
source .venv/bin/activate
uvicorn src.backend.main:app --reload
```

**Terminal 1 — Windows (PowerShell):**

```powershell
.\.venv\Scripts\activate
uvicorn src.backend.main:app --reload
```

**Terminal 2 (tất cả hệ điều hành):**

```bash
cd frontend
npm run dev
```

Sau đó truy cập `http://localhost:3000`

## Deploy trên Docker (AlmaLinux)

### Cấu trúc file deploy

```text
A20-App-001/
├── Dockerfile.backend          # Image Python/FastAPI
├── Dockerfile.frontend         # Image Next.js
├── docker-compose.yml          # Deploy backend + frontend cùng lúc
├── scripts/
│   ├── deploy-backend.sh       # Deploy backend độc lập
│   └── deploy-frontend.sh      # Deploy frontend độc lập
└── db_deploy/                  # PostgreSQL — có thể copy sang server riêng
    ├── docker-compose.yml
    ├── .env.example
    └── deploy.sh
```

---

### Bước 1 — Chuẩn bị `.env`

```bash
cp .env.example .env
nano .env
```

Các biến bắt buộc:

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_API_URL=http://<IP_SERVER>:8000   # IP hoặc domain của server backend
```

> `NEXT_PUBLIC_API_URL` được bake in lúc build frontend. Phải đặt đúng IP/domain trước khi chạy script.

---

### Bước 2 — Deploy

#### Option A: Deploy cả backend + frontend cùng lúc

```bash
sudo bash scripts/deploy.sh
```

| Service  | Cổng |
|----------|------|
| Backend (FastAPI) | `8000` |
| Frontend (Next.js) | `3000` |

---

#### Option B: Deploy từng service riêng

**Backend:**

```bash
sudo bash scripts/deploy-backend.sh
```

**Frontend** (chạy sau khi backend đã sẵn sàng):

```bash
sudo bash scripts/deploy-frontend.sh
```

---

#### Option C: Deploy PostgreSQL độc lập (server riêng)

Copy thư mục `db_deploy/` sang server PostgreSQL, sau đó:

```bash
cd db_deploy
cp .env.example .env
nano .env          # đổi POSTGRES_PASSWORD
sudo bash deploy.sh
```

Connection string để backend kết nối:

```
postgresql://flashcard_user:<password>@<IP_POSTGRES>:5432/flashcard
```

---

### Quản lý containers

```bash
# Xem trạng thái
docker compose ps

# Xem log realtime
docker logs -f flashcard-backend
docker logs -f flashcard-frontend

# Dừng tất cả
docker compose down

# Restart một service
docker compose restart backend
```

## Quy trình sử dụng nhanh

### Streamlit

1. Mở app tại `http://localhost:8501`
2. Đăng nhập bằng mock login
3. Tạo deck mới
4. Upload PDF để AI sinh flashcards
5. Học thẻ và chấm độ khó để cập nhật lịch ôn

### Next.js + FastAPI

1. Chạy backend tại `http://localhost:8000`
2. Chạy frontend tại `http://localhost:3000`
3. Đăng nhập mock trên frontend
4. Tạo deck
5. Upload PDF để gọi API sinh thẻ
6. Vào màn hình study để ôn tập

## Cấu trúc thư mục

```text
A20-App-001/
├── frontend/               # Next.js frontend
├── src/
│   ├── backend/            # FastAPI app và routers
│   ├── database.py         # SQLite access
│   ├── sm2.py              # SM-2 scheduling logic
│   └── streamlit_app.py    # Streamlit app
├── data/                   # SQLite DB và file PDF tạm
├── db_deploy/              # PostgreSQL standalone deploy
├── scripts/                # Deploy scripts cho AlmaLinux
├── requirements.txt        # Python dependencies
├── Dockerfile.backend      # Docker image cho FastAPI
├── Dockerfile.frontend     # Docker image cho Next.js
├── docker-compose.yml
└── .env
```

## Lệnh hay dùng

| Lệnh | macOS / Linux | Windows (PowerShell) |
|------|--------------|----------------------|
| Activate venv | `source .venv/bin/activate` | `.\.venv\Scripts\activate` |
| Chạy Streamlit | `streamlit run src/streamlit_app.py` | `streamlit run src/streamlit_app.py` |
| Chạy backend | `uvicorn src.backend.main:app --reload` | `uvicorn src.backend.main:app --reload` |
| Chạy frontend | `cd frontend && npm run dev` | `cd frontend; npm run dev` |
| Build frontend | `cd frontend && npm run build` | `cd frontend; npm run build` |

> **Lưu ý Windows:** PowerShell dùng `;` để nối lệnh thay vì `&&`.