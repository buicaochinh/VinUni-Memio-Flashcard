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

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Cách chạy

### 1. Chạy Streamlit

Phù hợp nếu bạn chỉ muốn dùng bản Python UI.

```bash
source .venv/bin/activate
streamlit run src/streamlit_app.py
```

Mở `http://localhost:8501`

### 2. Chạy backend API

Phù hợp khi dùng frontend Next.js.

```bash
source .venv/bin/activate
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

Terminal 1:

```bash
source .venv/bin/activate
uvicorn src.backend.main:app --reload
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Sau đó truy cập `http://localhost:3000`

## Docker

Repo hiện có `Dockerfile` và `docker-compose.yml` để chạy bản Streamlit:

```bash
docker-compose up --build -d
```

Mở `http://localhost:8501`

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
├── requirements.txt        # Python dependencies
├── Dockerfile
├── docker-compose.yml
└── .env
```

## Lệnh hay dùng

```bash
# Streamlit
streamlit run src/streamlit_app.py

# Backend API
uvicorn src.backend.main:app --reload

# Frontend
cd frontend && npm run dev

# Frontend production build
cd frontend && npm run build
```
