# Yêu cầu (Requirements Markdown Template)

Bạn chỉ cần tạo một file theo template này, rồi đưa path file đó vào prompt/skill để Cursor làm full luồng.

## Mục tiêu / Mô tả yêu cầu

Bạn chỉ cần mô tả NGẮN GỌN những gì muốn có, có thể ở dạng bullet:

- **User Dashboard nâng cao**
  - Heatmap học tập (GitHub-style)
  - Predicted mastery timeline
  - Weak areas recommendations
  - Comparison với peers (anonymous)

## Phạm vi / Không làm

Liệt kê rõ phần sẽ làm và phần KHÔNG làm.

## Tiêu chí chấp nhận (khuyến khích – có thể để trống)

Nếu bạn chưa rõ, có thể bỏ trống phần này. Agent sẽ:

- Đọc phần mô tả ở trên
- Đề xuất danh sách AC (`AC-1`, `AC-2`, …)
- Hỏi lại bạn để chỉnh/sửa trước khi implement

Nếu bạn đã có sẵn AC, hãy điền theo format dưới đây.

- [ ] `AC-1`: <mô tả tiêu chí>
  - Cách kiểm chứng: <lệnh/luồng UI/API hoặc quan sát>
  - Bằng chứng mong đợi: <kỳ vọng kết quả>
- [ ] `AC-2`: <mô tả tiêu chí>
  - Cách kiểm chứng: ...

## Ràng buộc / Nguyên tắc

Ví dụ:

- Không thêm dependency mới
- Không refactor lớn
- Tuân thủ style hiện có

## Test cần chạy (tuỳ chọn)

Nếu bạn đã biết test/check cụ thể, ghi vào đây.
Nếu không có, agent sẽ đề xuất best-effort.

## Tài liệu tham khảo (tuỳ chọn)

Link hoặc trích dẫn nội dung liên quan.
