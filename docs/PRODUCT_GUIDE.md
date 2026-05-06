# Memio — Hướng dẫn sản phẩm (Product Guide)

Tài liệu này mô tả **triết lý sản phẩm**, **thuật toán cốt lõi** (SM-2), **cách sử dụng** Memio trên web, và **tích hợp Telegram Study Buddy Bot** (liên kết + học trong chat + lịch gửi + weekly report).

> Phạm vi: tài liệu này phản ánh trạng thái hiện tại của repo. Discord/Slack hiện **không triển khai**.

---

## 1) Memio giải quyết vấn đề gì?

Memio là nền tảng học flashcard giúp bạn:
- **Biến tài liệu thành thẻ** nhanh (PDF/DOCX/TXT → khái niệm → flashcards).
- **Ôn tập đúng nhịp** theo spaced repetition (SM-2).
- **Giảm friction**: có thể học ngay trong Telegram nhờ Study Buddy Bot (không cần mở app liên tục).

---

## 2) Triết lý sản phẩm

### 2.1. “Giảm friction” quan trọng hơn “thêm tính năng”
Người dùng thường bỏ học không phải vì thiếu nội dung, mà vì:
- quên mở app,
- thấy “mở app để ôn vài phút” là một rào cản,
- mất nhịp khi bận vài ngày.

Memio tối ưu cho:
- **onboarding nhanh** (tạo deck, tạo thẻ, học),
- **nhắc học đúng thời điểm**,
- **học ở nơi người dùng đang ở** (Telegram).

### 2.2. “Lịch cá nhân hóa” phải tôn trọng nhịp sống
Study Buddy Bot có 3 tham số cốt lõi:
- **Timezone**: “ngày” và “giờ” phải đúng theo địa phương của user.
- **Send window**: chỉ gửi trong khung giờ cho phép (ví dụ `19:00-22:00`).
- **Daily goal**: không spam; tối đa N thẻ/ngày.

### 2.3. “Nhắc thông minh” dựa trên SM-2
Hệ thống nhắc học dựa trên “thẻ đến hạn” (due) theo SM-2:
- thẻ đến hạn được ưu tiên gửi trước,
- phản hồi rating (0–3) cập nhật lịch ôn tương lai.

---

## 3) Thuật toán cốt lõi: SM-2 (Spaced Repetition)

### 3.1. SM-2 là gì?
SM-2 là thuật toán spaced repetition được SuperMemo đề xuất, dùng để:
- tăng khoảng cách ôn với thẻ bạn nhớ tốt,
- giảm khoảng cách ôn với thẻ bạn nhớ kém,
- duy trì “độ khó thích nghi” qua **ease factor (EF)**.

Trong Memio, người dùng chấm điểm chất lượng nhớ (quality) theo thang **0–3**:
- **0**: Lại (quên)
- **1**: Khó
- **2**: Tốt
- **3**: Dễ

### 3.2. SM-2 được dùng ở đâu trong Memio?
- Web “Study”: khi bạn chấm điểm, hệ thống cập nhật lịch ôn.
- Telegram: khi bạn bấm nút inline 0–3, hệ thống cập nhật giống hệt web.

Các trường liên quan được lưu trong bảng `progress`:
- `interval`, `repetition`, `ease_factor`, `last_quality`, `next_review`, ...

### 3.3. Future feature: FSRS
SM-2 là lựa chọn hiện tại vì đơn giản, dễ kiểm soát và phù hợp giai đoạn pilot. Một hướng nâng cấp tương lai là FSRS (Free Spaced Repetition Scheduler), thuật toán dùng các biến `difficulty`, `stability`, `retrievability` để dự đoán xác suất nhớ và tối ưu lịch ôn theo dữ liệu học thật.

Memio chưa nên chuyển ngay sang FSRS khi chưa có đủ review history. Trước khi triển khai, cần lưu `review_logs` chi tiết cho từng lần ôn, thêm cấu hình `scheduler_type`/`desired_retention`, và giữ SM-2 làm fallback để đảm bảo progress hiện tại vẫn hoạt động ổn định.

---

## 4) Sử dụng Memio (Web)

### 4.1. Đăng nhập / tạo tài khoản
- Đăng nhập Google hoặc username/password.
- (Tùy cấu hình) ứng dụng dùng JWT sessions cho một số thao tác.

### 4.2. Tạo deck
Vào **Bộ thẻ** → tạo deck (tên + mô tả).

### 4.3. Tạo thẻ từ tài liệu
Vào **Tạo thẻ** → chọn deck → upload tài liệu → preview → lưu.

### 4.4. Học thẻ (Study)
Vào **Học ngay**:
- Lật thẻ
- Chấm điểm 0–3
- Hệ thống cập nhật SM-2

> Gợi ý: để weekly report có số liệu ổn định, Memio ghi lại thống kê session theo tiến trình học.

---

## 5) Telegram Study Buddy Bot (Tích hợp & sử dụng)

### 5.1. Mục tiêu
Bot giúp bạn:
- nhận thẻ đến hạn trong khung giờ bạn chọn,
- chấm điểm ngay trong chat bằng inline buttons,
- nhận weekly report trong group (tùy chọn).

### 5.2. Liên kết Telegram với Memio
**Bước 1 — Lấy mã từ Telegram**
1. Mở chat riêng với bot trên Telegram.
2. Gõ `/start`.
3. Bot trả về mã 8 ký tự (hiệu lực 10 phút).

**Bước 2 — Nhập mã trên web**
1. Mở Memio → menu **Liên kết**.
2. Dán mã → bấm **Liên kết**.

Khi liên kết xong, Memio sẽ lưu `dm_chat_id` để worker có thể gửi thẻ vào chat riêng.

### 5.3. Cấu hình lịch gửi (cá nhân hóa)
Trong trang **Liên kết**:
- **Múi giờ**: ví dụ `Asia/Ho_Chi_Minh`
- **Khung giờ** (`HH:MM-HH:MM`): ví dụ `19:00-22:00`
- **Mục tiêu mỗi ngày**: ví dụ `20`

Bot sẽ:
- chỉ gửi trong khung giờ,
- không vượt quá mục tiêu/ngày,
- ưu tiên thẻ overdue/hard hơn.

### 5.4. Học trực tiếp trong chat
Khi bot gửi thẻ, bạn sẽ thấy inline buttons:
- `0 Lại`, `1 Khó`, `2 Tốt`, `3 Dễ`

Nhấn nút sẽ:
- lưu progress (SM-2) cho thẻ đó,
- thẻ tiếp theo sẽ được gửi theo lịch.

### 5.5. Weekly report vào group
Nếu muốn weekly report gửi vào **nhóm**:

**Cách 1 (khuyến nghị) — Dùng lệnh trong group**
- Trong group muốn nhận report, gõ: `/setgroup` (hoặc `/setreport`)
- Tắt: `/unsetgroup` (hoặc `/unsetreport`)

**Cách 2 — Nhập group chat id trên web**
- Trong trang **Liên kết**, nhập `Group chat id (weekly report)` (dạng `-100xxxxxxxxxx`).

Weekly report được chạy theo lịch (ví dụ Thứ Hai 08:00) và có cơ chế chống gửi trùng theo tuần.

### 5.6. Nút test (debug)
Trong trang **Liên kết** có:
- **Test weekly report**: gửi report test tới nơi đang cấu hình (group hoặc DM).
- **Test gửi thẻ**: gửi 1–3 thẻ đến hạn vào **DM** để kiểm tra bot/inline rating.

---

## 6) Checklist tích hợp nhanh (Telegram)

- [ ] `TELEGRAM_BOT_TOKEN` đã set
- [ ] Telegram webhook trỏ đúng `POST /api/integrations/telegram/webhook`
- [ ] DB đã `alembic upgrade head`
- [ ] User đã link bằng `/start` → nhập code trên web
- [ ] (Nếu cần) vào group gõ `/setgroup`
- [ ] Dùng nút “Test weekly report” / “Test gửi thẻ” để kiểm tra

---

## 7) Troubleshooting nhanh

### Không thấy bot trả lời `/start`
- Kiểm tra webhook (`getWebhookInfo`)
- Kiểm tra DB có bảng `link_codes`
- Kiểm tra `TELEGRAM_BOT_TOKEN`

### Bot không gửi thẻ theo lịch
- Kiểm tra `dm_chat_id` đã có chưa (nếu thiếu: `/start` lại và link lại)
- Kiểm tra `send_window`, `daily_goal`, timezone
- Kiểm tra worker/beat có chạy không

### Weekly report không vào group
- Gõ `/setgroup` trong group
- Hoặc nhập đúng `group_target_id`
- Bấm “Test weekly report”
