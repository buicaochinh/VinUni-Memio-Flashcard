# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi.

---

## Template

### Quyết định kỹ thuật

```markdown
### [ADR-N] Tiêu đề quyết định — DD/MM/YYYY

**Bối cảnh:** Vấn đề cần giải quyết là gì?

**Các lựa chọn đã xem xét:**

- Option A: ...
- Option B: ...

**Quyết định:** Chọn option nào và tại sao.

**Hệ quả:** Những gì bị ảnh hưởng / trade-off.
```

### Phân công

```markdown
### Sprint N — DD/MM → DD/MM/YYYY

| Task | Người làm | Deadline | Trạng thái |
| ---- | --------- | -------- | ---------- |
|      |           |          |            |
```

### Brainstorming

```markdown
### Brainstorm: [Chủ đề] — DD/MM/YYYY

**Câu hỏi:** ...

**Các ý tưởng:**

- Ý tưởng 1: ...
- Ý tưởng 2: ...

**Kết luận:** ...
```

---

## Ví dụ

### [ADR-1] Dùng TypeScript thay vì Python — 30/03/2026

**Bối cảnh:** Cả nhóm cần chọn 1 ngôn ngữ chính để xây dựng agent. Có 2 thành viên quen Python, 1 thành viên quen TypeScript.

**Các lựa chọn đã xem xét:**

- **Python**: Ecosystem ML tốt hơn, syntax đơn giản, thành viên quen hơn.
- **TypeScript**: Type safety, dễ refactor khi project lớn, nhiều library AI mới ra bản TS trước.

**Quyết định:** Chọn TypeScript vì project này focus vào agent architecture, không cần ML library nặng. Type safety sẽ giúp bắt lỗi sớm hơn khi codebase phình ra.

**Hệ quả:** 2 thành viên Python cần học TypeScript cơ bản (ước tính 1 tuần). Sẽ không dùng được `langchain` Python trực tiếp.

---

### [ADR-2] Lưu conversation history bằng file JSON — 03/04/2026

**Bối cảnh:** Agent cần nhớ context giữa các lần chạy. Cần chọn storage.

**Các lựa chọn đã xem xét:**

- **In-memory array**: Đơn giản nhất nhưng mất khi restart.
- **File JSON**: Persistent, không cần setup, dễ inspect bằng tay.
- **SQLite**: Có thể query, tốt cho production nhưng overkill cho prototype.
- **Redis**: Fast nhưng cần chạy thêm service.

**Quyết định:** File JSON cho giai đoạn prototype. Thiết kế interface `MemoryStore` để sau này swap sang SQLite không cần sửa logic agent.

**Hệ quả:** Không query được theo thời gian hay user. Chấp nhận được ở giai đoạn này.

---

### Sprint 1 — 31/03 → 06/04/2026

| Task                            | Người làm | Deadline | Trạng thái |
| ------------------------------- | --------- | -------- | ---------- |
| Setup TypeScript project + CI   | Văn A     | 01/04    | ✅ Xong    |
| Implement agent loop cơ bản     | Thị B     | 02/04    | ✅ Xong    |
| Tool: `search_web` (Brave API)  | Văn C     | 03/04    | ✅ Xong    |
| Tool: `read_file`, `write_file` | Thị B     | 05/04    | ✅ Xong    |
| Conversation memory (JSON)      | Văn A     | 06/04    | ✅ Xong    |
| README + setup docs             | Văn C     | 06/04    | ✅ Xong    |

---

### Sprint 2 — 07/04 → 13/04/2026

| Task                                     | Người làm | Deadline | Trạng thái  |
| ---------------------------------------- | --------- | -------- | ----------- |
| Fix infinite loop: thêm `max_iterations` | Thị B     | 08/04    | 🔄 Đang làm |
| Tool: `run_tests` (chạy pytest)          | Văn C     | 10/04    | ⏳ Chờ      |
| Sliding window memory                    | Văn A     | 09/04    | ⏳ Chờ      |
| Demo prep + slides                       | Cả nhóm   | 13/04    | ⏳ Chờ      |

---

### Brainstorm: Tính năng cho demo — 05/04/2026

**Câu hỏi:** Demo tuần tới nên show gì để ấn tượng nhất trong 5 phút?

**Các ý tưởng:**

- **Ý tưởng 1 (Văn A):** Cho agent đọc 1 file Python có bug, tự fix, rồi chạy test để verify. Trực quan, dễ hiểu.
- **Ý tưởng 2 (Thị B):** Agent tự build 1 tính năng nhỏ từ mô tả bằng tiếng Việt. Show khả năng hiểu ngôn ngữ tự nhiên.
- **Ý tưởng 3 (Văn C):** Agent review PR, comment vào từng dòng code có vấn đề. Gần với use case thực tế nhất.

**Pros/Cons:**
| Ý tưởng | Pros | Cons |
|---|---|---|
| Fix bug | Dễ làm, chắc chắn chạy được | Ít "wow" hơn |
| Build từ mô tả | Ấn tượng nhất | Có thể fail nếu prompt phức tạp |
| Review PR | Thực tế, liên quan trực tiếp đến khóa học | Cần setup GitHub webhook |

**Kết luận:** Chọn ý tưởng 1 (fix bug) cho demo chính vì đảm bảo. Nếu còn thời gian sẽ show thêm ý tưởng 2 như bonus.

---

### Bug quan trọng: Tool call loop vô hạn — 04/04/2026

**Triệu chứng:** Agent gọi `search_web` liên tục không dừng khi tool trả về lỗi network.

**Root cause:** Không có stop condition khi tool raise exception. Agent nhận `"error": "timeout"` nhưng interpret là cần thử lại.

**Fix:** Thêm 2 điều kiện dừng:

1. `max_iterations = 10` — hard stop sau 10 vòng
2. Nếu tool trả về lỗi 3 lần liên tiếp → dừng và báo user

**Code thay đổi:** `src/agent.ts` lines 45-67

**Học được:** Luôn thiết kế stop condition trước khi implement retry logic.

---

### Bug bảo mật: Rò rỉ dữ liệu Deck (Multi-tenancy Isolation) — 20/04/2026

**Triệu chứng:** Người dùng có thể nhìn thấy danh sách Deck của người khác nếu không lọc theo `user_id`.

**Root cause:** Trong `deck_service.py`, hàm `get_user_decks` ban đầu thiếu ràng buộc `where(Deck.user_id == user_id)`.

**Fix:**

- Cập nhật `src/app/services/deck_service.py`: Thêm điều kiện lọc `user_id` vào câu lệnh `select(Deck)`.
- Cập nhật API endpoint `GET /api/decks/` để bắt buộc truyền `user_id`.

**Học được:** Luôn thiết kế database schema và query với tư duy multi-tenancy từ đầu. Cần bổ sung middleware xác thực (Authentication) để lấy `user_id` từ token thay vì nhận qua query parameter (tiềm ẩn rủi ro thao túng ID).

---

### [ADR-3] Di chuyển sang Anthropic Claude làm Model chính — 20/04/2026

**Bối cảnh:** Cần cải thiện khả năng suy luận (reasoning) và độ chính xác của Flashcards khi xử lý tài liệu phức tạp.

**Các lựa chọn đã xem xét:**

- **OpenAI GPT-4o**: Tốt nhưng giá cao và một số trường hợp vẫn còn "hallucination".
- **Anthropic Claude 3.5 Sonnet**: Reasoning tốt hơn cho việc phân tích cấu trúc tài liệu, context window lớn hơn.

**Quyết định:** Chuyển sang dùng Anthropic Claude. Cập nhật `DEFAULT_MODEL` và cấu hình API key modular hơn.

**Hệ quả:** Code service cần cập nhật wrapper gọi API của Anthropic. Phải quản lý API key mới.

---

### [ADR-4] Tích hợp hệ thống trích dẫn (Citations) vào tính năng Explain — 21/04/2026

**Bối cảnh:** Khi AI giải thích thẻ, người dùng cần biết thông tin đó lấy từ đâu trong tài liệu gốc để đảm bảo tính xác thực (NotebookLM style).

**Các lựa chọn đã xem xét:**

- **Plain text explanation**: Đơn giản nhưng khó kiểm chứng.
- **Embedded citations with popover**: Hiển thị snippet văn bản gốc khi click vào link trích dẫn.

**Quyết định:** Chọn hệ thống Citations với popover. Cập nhật schema `Card` để lưu `source_context` và chỉnh sửa prompt AI để trả về định dạng có kèm ID trích dẫn.

**Hệ quả:** Database schema thay đổi, cần migration. Frontend logic phức tạp hơn do phải handle popover.

---

### Sprint 3 — 14/04 → 21/04/2026

| Task                                      | Người làm     | Deadline | Trạng thái |
| ----------------------------------------- | ------------- | -------- | ---------- |
| Cập nhật SQL ORM & Model Mapping          | Cao Chinh Bùi | 20/04    | ✅ Xong    |
| Frontend Chatbot (Study Page)             | tiensohot     | 21/04    | ✅ Xong    |
| Tính năng Explain + Citations             | BDT-17        | 21/04    | ✅ Xong    |
| Refactor App-Client (Async/Types)         | BDT-17        | 21/04    | ✅ Xong    |
| Tạo survey đánh giá (CSV)                 | BDT-17        | 21/04    | ✅ Xong    |
| Fix merge conflicts (README/Architecture) | Cao Chinh Bùi | 20/04    | ✅ Xong    |

---

### [ADR-5] Triển khai Dark Mode cho Memio Frontend — 21/04/2026

**Bối cảnh:** Cần bổ sung giao diện tối để cải thiện trải nghiệm học tập trong điều kiện thiếu sáng và tăng tính chuyên nghiệp cho UI.

**Các lựa chọn đã xem xét:**

- **Hardcode class dark cho từng component**: Làm nhanh ban đầu nhưng khó bảo trì, dễ lệch màu giữa các màn.
- **`next-themes` + CSS variables + Tailwind darkMode dạng `class`**: Dễ mở rộng, đồng bộ token màu toàn app, chuyển đổi theme mượt hơn.

**Quyết định:** Chọn hướng `next-themes` + design tokens. App được bọc `ThemeProvider`, mặc định `defaultTheme="system"` để tự theo system preference của người dùng. Thêm `ThemeToggle` ở AppShell (desktop + mobile).

**Hệ quả:**

- Cập nhật `tailwind.config.js` để dùng `darkMode: "class"` và chuyển `surface`/`border-strong` sang CSS variables.
- Cập nhật `globals.css` với bộ biến `.dark` đầy đủ (bao gồm điều chỉnh primary trong dark mode sang tông sáng hơn để tăng tương phản).
- Layout root và shell component thay đổi để hỗ trợ chuyển theme runtime.
