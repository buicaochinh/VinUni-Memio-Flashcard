# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi.

---

## Cập nhật gần đây (Pilot deploy + Docs) — 30/04/2026

### [Future Feature] Cân nhắc nâng cấp scheduler từ SM-2 sang FSRS — 06/05/2026

- **Bối cảnh**: Memio hiện dùng SM-2 cho spaced repetition. SM-2 đơn giản, phù hợp pilot, nhưng chỉ cá nhân hóa qua `ease_factor` và không mô hình hóa xác suất nhớ.
- **Ý tưởng**: Sau khi có đủ review history, nghiên cứu thêm FSRS (Free Spaced Repetition Scheduler) như một scheduler opt-in hoặc bản nâng cấp. FSRS dùng memory state gồm `difficulty`, `stability`, `retrievability` và có thể tối ưu theo dữ liệu học thật của user.
- **Điều kiện trước khi triển khai**:
  - thêm bảng `review_logs` để lưu từng lần ôn: `user_id`, `card_id`, rating, thời điểm ôn, scheduled interval, elapsed days, nguồn review (web/Telegram);
  - thêm config `scheduler_type` (`sm2`/`fsrs`) và `desired_retention`;
  - bổ sung cột hoặc metadata cho FSRS như `stability`, `difficulty`, scheduler version;
  - giữ SM-2 làm fallback để không phá dữ liệu/progress hiện có.
- **Hướng triển khai đề xuất**: chưa thay ngay trong pilot; trước mắt chỉ thu thập review logs sạch, sau đó thử FSRS trên dữ liệu lịch sử và so sánh workload/retention trước khi bật cho user.

---

### [ADR-6] Chọn Docker Swarm single-node cho pilot deploy — 30/04/2026

- **Bối cảnh**: PILOT, cần deploy ổn định.
- **Quyết định**: dùng **Docker Swarm (single-node)** để rolling deploy. Compose chỉ dùng để build image.
- **Hệ quả**: cần bootstrap Swarm; local image cần cách đảm bảo rollout (ADR-7).

---

### [ADR-7] Dùng local images + retag theo `DEPLOY_ID` để đảm bảo Swarm rollout — 30/04/2026

- **Bối cảnh**: build local, không registry → Swarm dễ “không rollout” nếu tag không đổi.
- **Quyết định**: retag theo `DEPLOY_ID` trong `scripts/redeploy.sh` để Swarm luôn update.
- **Hệ quả**: nhiều image hơn → cần prune; trace deploy tốt hơn (tag có SHA + time).

---

### [ADR-8] Thêm disk pre-check + prune có ngưỡng trong redeploy script — 30/04/2026

- **Bối cảnh**: server nhỏ, dễ đầy disk.
- **Quyết định**: nếu free `< 6GB` thì prune trước khi build.
- **Hệ quả**: ổn định hơn; đôi lúc build lâu hơn do mất cache.

---

### [ADR-9] Caddy làm reverse proxy theo domain (frontend/backend tách host) — 30/04/2026

- **Bối cảnh**: cần HTTPS + route rõ.
- **Quyết định**: dùng Caddy theo domain (`mem.io.vn` → frontend, `api.mem.io.vn` → backend).
- **Hệ quả**: DNS đúng; TLS vận hành đơn giản.

---

### [ADR-10] Một “source of truth” cho agent/dev: `PROJECT_CONTEXT.md` + `docs/diagrams.md` — 30/04/2026

- **Bối cảnh**: monorepo + nhiều thay đổi nhanh.
- **Quyết định**: 1 “source of truth”: `PROJECT_CONTEXT.md` + sơ đồ `docs/diagrams.md`.
- **Hệ quả**: đổi kiến trúc/endpoint/deploy thì phải cập nhật docs cùng lúc.

## Template

Xem `docs/templates/WORKLOG.template.md`.

---

## Lịch sử thực tế (Memio) — theo mốc git/PR

### Mốc git quan trọng

- **02/04/2026** — Root commit `e49dfbd`: “Initial setup: starter code app with AI logging hooks”
- **10/04/2026** — Demo 1: commit `13dccb6` (“first_demo”)
- **10/04/2026** — **Merge pull request #1**: commit `94b102d`

> Ghi chú: Trước **02/04/2026** nhóm chủ yếu brainstorm (không có commit trong repo).

---

### Sprint theo “tuần học” (Thứ 2 → Chủ nhật; Tuần 1 ngoại lệ 4 ngày)

#### Tuần 1 — 02/04 → 05/04/2026 (4 ngày)

- **Mục tiêu**: repo có nền tảng chạy được + setup hook/logging.
- **Kết quả**:
  - Root commit `e49dfbd` (02/04).

#### Tuần 2 — 06/04 → 12/04/2026

- **Mục tiêu**: có demo end-to-end đầu tiên + merge PR #1.
- **Kết quả**:
  - Demo 1 `13dccb6` (10/04).
  - Merge PR #1 `94b102d` (10/04).
  - 11/04: refactor/UI/readme/deploy script (các commit dày để ổn định sau demo).

#### Tuần 3 — 13/04 → 19/04/2026

- **Mục tiêu**: chuẩn hoá deploy method, bắt đầu dịch chuyển AI provider và cải tiến UI.
- **Kết quả nổi bật**:
  - 15–16/04: deployment method với Caddy + Docker (merge PR #5 ngày 16/04).
  - 16/04: merge PR #6, #7 (đồng bộ script/requirements/db).
  - 19/04: merge PR #8, #9 (UI update + các thay đổi liên quan model/provider).

#### Tuần 4 — 20/04 → 26/04/2026

- **Mục tiêu**: hoàn thiện các mảng dữ liệu/ORM + deploy + UX, giảm rủi ro multi-tenancy.
- **Kết quả nổi bật**:
  - 20–21/04: merge dày PR #10–#19 (tập trung dữ liệu/ORM/deploy + phần tính năng/UX liên quan).

#### Tuần 5 — 27/04 → 03/05/2026 (cập nhật tới 30/04)

- **Mục tiêu**: chuyển dự án sang trạng thái PILOT, chuẩn hoá docs + vận hành deploy.
- **Kết quả nổi bật**:
  - 27–28/04: merge PR #38–#44 — integrations + worker/pipe cho study-buddy-bot.
  - 29/04: merge PR #45–#47 — tối ưu deploy + cập nhật `PROJECT_CONTEXT.md`.
  - 30/04: merge PR #48–#51 — upgrade UI + fix deploy.
  - 30/04: `2eb16a6` — move doc file to `docs/`.
  - 29–30/04: chốt ADR pilot deploy (ADR-6 → ADR-10) + chuẩn hoá `docs/diagrams.md`.

---

### Bug bảo mật: Rò rỉ dữ liệu Deck (Multi-tenancy Isolation) — 20/04/2026

- **Triệu chứng**: list deck không filter `user_id` → lộ dữ liệu.
- **Fix**: mọi query deck/card phải filter `user_id`.
- **Học**: cần auth đúng nghĩa (lấy `user_id` từ token) để tránh giả mạo.

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

### [ADR-6] Chuyển luồng sinh thẻ chính sang OpenAI — 07/05/2026

**Bối cảnh:** Luồng sinh thẻ hiện tại đã được chuyển khỏi Anthropic Claude và dùng OpenAI API cho card generation/explanations.

**Quyết định:** Dùng `OPENAI_API_KEY` làm key bắt buộc cho luồng AI chính. Backend gọi `langchain_openai.ChatOpenAI` với model mặc định `gpt-4o-mini`.

**Hệ quả:** Tài liệu vận hành, `.env.example`, README, `PROJECT_CONTEXT.md`, diagrams, default model và message lỗi cần phản ánh OpenAI là provider hiện tại. `ANTHROPIC_API_KEY` chỉ còn là biến legacy/optional trong config.

---

### Sprint 3 — 14/04 → 21/04/2026

- Cập nhật SQL ORM & Model Mapping (Cao Chinh Bùi) — 20/04 — ✅
- Frontend Chatbot (Study Page) (tiensohot) — 21/04 — ✅
- Explain + Citations (BDT-17) — 21/04 — ✅
- Refactor App-Client (BDT-17) — 21/04 — ✅
- Survey đánh giá (CSV) (BDT-17) — 21/04 — ✅
- Fix merge conflicts (README/Architecture) (Cao Chinh Bùi) — 20/04 — ✅

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
