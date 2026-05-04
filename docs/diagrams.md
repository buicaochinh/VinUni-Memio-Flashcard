# Biểu đồ thiết kế dự án Memio

Dưới đây là các biểu đồ Mermaid giúp bạn hình dung kiến trúc, cấu trúc dữ liệu và quy trình hoạt động của dự án Memio.

## 1. Kiến trúc hệ thống (System Architecture)

Biểu đồ này mô tả cách các thành phần trong hệ thống tương tác với nhau.

```mermaid
graph TD
    User((Người dùng)) <--> Frontend[Next.js 16 Frontend<br/>Tailwind CSS / TypeScript]
    Frontend <--> API[FastAPI Backend<br/>Python 3.11+]
    API <--> LLM{AI Engine<br/>Anthropic Claude / OpenAI}
    API <--> DB[(Database<br/>PostgreSQL)]
    API <--> Auth[Google OAuth<br/>Xác thực người dùng]
```

---

## 2. Mô hình thực thể - quan hệ (ER Diagram)

**cấu trúc cơ sở dữ liệu**

```mermaid
erDiagram
    User ||--o{ Deck : owns
    User ||--o{ Progress : tracks
    User ||--o{ StudySession : records
    Deck ||--o{ Flashcard : contains
    Deck ||--o{ StudySession : involved_in
    Flashcard ||--o{ Progress : has_history

    User {
        int id PK
        string google_id UK
        string name
        string email
    }

    Deck {
        int id PK
        int user_id FK
        string name
        string share_token UK
        bool is_public
    }

    Flashcard {
        int id PK
        int deck_id FK
        string front
        string back
        string source_context
    }

    Progress {
        int id PK
        int user_id FK
        int card_id FK
        int interval
        float ease_factor
        datetime next_review
    }
```

---

## 3. Quy trình ôn tập (Study Flow - SM-2)

**luồng xử lý khi người dùng học một thẻ và hệ thống tính toán thời gian ôn tập tiếp theo.**

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as Frontend (Next.js)
    participant B as Backend (FastAPI)
    participant D as Database

    U->>F: Bắt đầu học Deck
    F->>B: Lấy thẻ cần học (due cards)
    B->>D: Truy vấn cards & progress
    D-->>B: Trả về danh sách thẻ
    B-->>F: Gửi danh sách thẻ đến hạn
    U->>F: Lật thẻ & Đánh giá (0-3)
    F->>B: Gửi kết quả đánh giá (quality)
    rect rgb(240, 240, 240)
        Note over B: Tính toán thuật toán SM-2
        Note over B: New Interval & Ease Factor
    end
    B->>D: Cập nhật bảng Progress
    D-->>B: Xác nhận lưu thành công
    B-->>F: Trả về kết quả & Thẻ tiếp theo
```

---

## 4. Quy trình tạo thẻ bằng AI (AI Generation Flow)

```mermaid
flowchart LR
    PDF[Tài liệu PDF/DOCX] --> Extract[Trích xuất Text]
    Extract --> Prompt[Kết hợp System Prompt]
    Prompt --> LLM[AI Model - Claude]
    LLM --> JSON[Dữ liệu JSON thô]
    JSON --> Save[Lưu vào Database]
    Save --> Ready[Deck sẵn sàng học]
```