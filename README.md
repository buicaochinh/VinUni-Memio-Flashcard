# 🧠 AI Smart Flashcards VinUni

![UI Modern](https://img.freepik.com/free-vector/learning-concept-illustration_114360-6186.jpg)

**AI Smart Flashcards** là một ứng dụng học tập thông minh sử dụng trí tuệ nhân tạo để tự động tạo thẻ ghi nhớ (flashcards) từ tài liệu PDF và áp dụng thuật toán lặp lại ngắt quãng (SM-2) để tối ưu hóa quá trình ghi nhớ.

---

## ✨ Tính năng nổi bật

- 🤖 **AI-Powered Generation**: Sử dụng OpenAI GPT-3.5 để phân tích tài liệu PDF và tự động sinh câu hỏi/trả lời ngắn gọn.
- 📈 **Thuật toán SM-2 (Spaced Repetition)**: Tự động tính toán thời gian lặp lại dựa trên độ khó, giúp bạn nhớ kiến thức lâu hơn (tương tự Anki).
- 🎨 **Premium UI/UX**: Giao diện "Dark Ethereal" hiện đại với hiệu ứng Glassmorphism và tối ưu hóa trải nghiệm người dùng.
- 📚 **Quản lý Bộ thẻ (Decks)**: Tạo nhiều bộ thẻ cho các môn học khác nhau.
- ⌨️ **Phím tắt thông minh**: Hỗ trợ phím `Space` để lật thẻ và phím `1-4` để đánh giá độ khó nhanh chóng.
- 💾 **Lưu trữ bền vững**: Tích hợp SQLite để lưu trữ toàn bộ dữ liệu người dùng, bộ thẻ và tiến trình học.
- 🐳 **Docker Ready**: Sẵn sàng triển khai lên VPS chỉ với một dòng lệnh.

---

## 🛠️ Công nghệ sử dụng

- **Ngôn ngữ**: Python
- **Framework**: Streamlit
- **AI/LLM**: LangChain, OpenAI API
- **Database**: SQLite3
- **Deployment**: Docker, Docker Compose

---

## 🚀 Cài đặt và sử dụng

### 1. Yêu cầu hệ thống
- Python 3.9+
- OpenAI API Key

### 2. Cài đặt trực tiếp
1. Clone dự án:
   ```bash
   git clone <your-repo-url>
   cd A20-App-001
   ```
2. Cài đặt dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Cấu hình môi trường:
   Tạo file `.env` ở thư mục gốc và thêm key:
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```
4. Chạy ứng dụng Streamlit:
   ```bash
   streamlit run src/streamlit_app.py
   ```
5. Nếu muốn chạy API backend riêng:
   ```bash
   uvicorn src.backend.main:app --reload
   ```

### 3. Chạy bằng Docker
Nếu bạn muốn chạy ứng dụng trong môi trường container:
```bash
docker-compose up --build -d
```
Ứng dụng sẽ chạy tại: `http://localhost:8501`

---

## 📖 Hướng dẫn sử dụng

1. **Đăng nhập**: Sử dụng tài khoản (hiện tại hỗ trợ chế độ Mock Login cho V1).
2. **Tạo Bộ thẻ**: Tại thanh bên trái, nhập tên bộ thẻ mới và nhấn "➕ Tạo bộ thẻ".
3. **Upload tài liệu**: Chọn file PDF (bài giảng, bài báo...), nhấn "Phân tích & Tạo thẻ". AI sẽ tự sinh 5 thẻ bài đầu tiên từ 3 trang đầu của tài liệu.
4. **Học tập**:
   - Nhấn `Space` để lật thẻ xem đáp án.
   - Chọn mức độ khó: **Lại (1)**, **Khó (2)**, **Tốt (3)**, **Dễ (4)**.
   - Thuật toán sẽ tính toán và hiển thị thẻ vào thời điểm phù hợp nhất để bạn không bị quên.

---

## 📂 Thu mục dự án

```text
├── src/streamlit_app.py     # File chạy Streamlit chính
├── src/database.py          # Xử lý SQLite & SM-2 persistence
├── src/backend/             # FastAPI backend
├── Dockerfile          # Cấu hình build Docker image
├── docker-compose.yml  # Cấu hình chạy container
├── .env                # Biến môi trường (API Keys)
├── requirements.txt    # Danh sách thư viện Python
└── data/temp_study.pdf      # File PDF lưu tạm thời để xử lý
```

---

## 🤝 Team
Dự án được phát triển bởi **Team 001 - VinUni Smart Learning**.

---
*Cảm ơn bạn đã sử dụng AI Smart Flashcards! Chúc bạn học tập hiệu quả.*
