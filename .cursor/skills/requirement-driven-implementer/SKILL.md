---
name: requirement-driven-implementer
description: >-
  Implement full workflows from a user-provided Markdown requirements file:
  plan, implement code changes, run best-effort checks/tests, verify against
  acceptance criteria to reach at least 95%, and hand off results. Use when the
  user provides a requirements Markdown file (or asks to execute work described
  in a Markdown requirements doc) and wants the agent to own the full loop.
---

# Requirement-Driven Implementer

## Goal

Khi người dùng chỉ ra một file Markdown chứa yêu cầu, agent sẽ tự:

1. Lập kế hoạch thực hiện theo yêu cầu
2. Implement (chỉ sửa các phần cần thiết)
3. Test/check phù hợp với thay đổi
4. Đối chiếu lại với `Tiêu chí chấp nhận` để đạt **≥ 95%**
5. Bàn giao kết quả rõ ràng

Sau **mỗi bước lớn**, agent cập nhật context vào file:
`.cursor/requirement-driven-implementer-context.md`

## Input (Requirement File Contract)

File yêu cầu (Markdown) nên có các mục sau (không bắt buộc đúng tiêu đề, nhưng phải nêu được các nội dung tương đương):

- `Mục tiêu` hoặc mô tả ngắn: muốn đạt gì
- `Phạm vi` / `Không làm`: giới hạn thay đổi
- `Tiêu chí chấp nhận` (bắt buộc nên có danh sách)
  Khuyến nghị format: `AC-1`, `AC-2`, ... và mỗi tiêu chí có mô tả test được.
- `Ràng buộc` / `Nguyên tắc` (ví dụ: không đổi kiến trúc, không thêm dependency, ... )
- `Tài liệu tham khảo` (tuỳ chọn)
- `Test cần chạy` (tuỳ chọn; nếu thiếu agent tự đề xuất best-effort)

## Mặc định khi thiếu thông tin

Nếu thiếu `Tiêu chí chấp nhận` hoặc không rõ “đạt 95%” là gì, agent **dừng và hỏi** người dùng 1-3 câu để chốt tiêu chí.

## Output Format (bắt buộc rõ ràng)

Cuối cùng agent bàn giao theo thứ tự:

1. **Summary**: làm gì, thay đổi ở đâu (ngắn gọn)
2. **Plan đã làm**: liệt kê bước chính và trạng thái
3. **Compliance (≥95%)**:
   - Danh sách `AC-*` kèm: “cách kiểm chứng” + “kết quả” + “ghi chú”
   - Percent điểm đạt được (tính theo số AC pass / total AC)
4. **Test/Checks đã chạy**: lệnh + ý chính kết quả
5. **Known risks / follow-ups**: phần còn rủi ro hoặc cần xác nhận thêm

## Workflow (từng bước + ghi context)

### Step 0 — Xác định requirement + resume

1. Xác định đường dẫn file requirement:
   - Nếu user chưa nói rõ, hỏi: “Bạn muốn chỉ định path file Markdown requirement ở đâu?”
2. Tạo `run_id`:
   - Ưu tiên từ frontmatter của requirement nếu có (vd `run_id: ...`)
   - Nếu không có, tạo `run_id = current timestamp (YYYYMMDD-HHMMSS)`
3. Đọc context hiện có tại `.cursor/requirement-driven-implementer-context.md`.
4. Nếu context có `run_id` trùng, resume từ bước đã hoàn tất.
5. Ghi context lần đầu (bao gồm: run_id, requirement_path, resume_step="Step 0").

### Step 1 — Trích xuất yêu cầu & chốt tiêu chí

- Trích xuất:
  - `Mục tiêu`, `Phạm vi`/`Không làm`
  - danh sách `AC-*` (gán ID cho từng tiêu chí nếu user chỉ viết dạng đoạn)
  - ràng buộc chính
- Nếu AC không “test được”, hỏi user để chuyển thành tiêu chí test được.
- Cập nhật context: yêu cầu đã hiểu, danh sách AC, và điểm đo compliance.

### Step 2 — Lập kế hoạch thực hiện

- Lập kế hoạch theo “những thay đổi tối thiểu”:
  - Dự kiến sửa/đọc những file nào
  - Lộ trình implement (tách thành các cụm thay đổi)
  - Test/check tương ứng cho từng cụm thay đổi
- Cập nhật context: plan + giả định + bất kỳ điểm cần xác nhận.

### Step 3 — Implement (owner full loop)

- Thực hiện đúng plan, tuân thủ `Không làm` và `Ràng buộc`.
- Không refactor lan man; chỉ sửa tối thiểu để đạt AC.
- Sau mỗi cụm thay đổi:
  - mô tả thay đổi
  - liệt kê file đã chỉnh
  - update context với “last_completed_substep”

### Step 4 — Test/Checks + Verify against AC

Agent chạy best-effort checks dựa trên file thay đổi:

1. Nếu có thay đổi dưới `frontend/`:
   - chạy `cd frontend && npm run lint`
   - chạy `cd frontend && npm run build`
2. Nếu có thay đổi Python dưới `src/`:
   - BẮT BUỘC dùng Python từ môi trường ảo của project:
     - Ưu tiên `.venv/bin/python` nếu tồn tại, nếu không dùng `venv/bin/python`
   - chạy `./.venv/bin/python -m compileall src` (hoặc `./venv/bin/python` nếu không có `.venv/`)
   - chạy import smoke test: `./.venv/bin/python -c "from src.main import app; print('import-ok')"` (hoặc `./venv/bin/python` tương tự)
3. Nếu requirement nêu test thủ công / endpoint check:
   - agent đề xuất cách gọi (vd Swagger `/docs`, hoặc endpoint tương ứng)
   - nếu thiếu env (DATABASE_URL/ANTHROPIC_API_KEY), agent nêu rõ giới hạn và thay bằng check thay thế hợp lý (compile/import/typecheck).

Sau đó tạo Compliance matrix:

- Mỗi `AC-*`:
  - `Check method` (lệnh hoặc kiểm chứng)
  - `Pass/Fail`
  - `Evidence/notes`
- Tính `percent = pass_count / total_count * 100`.
- Nếu `percent < 95%`:
  - quay lại Step 3 theo vòng lặp nhỏ (sửa những AC đang Fail/không xác minh được)

### Step 5 — Bàn giao

- Trả output theo Output Format ở trên.
- Luôn nói rõ trạng thái đạt được (Pass/Fail, percent) và những gì đã làm để đạt ≥95%.

## Context File Format (để resume dễ)

Gợi ý cấu trúc (agent nên ghi đúng format này):

```md
# Requirement-Driven Implementer Context

run_id: <...>
requirement_path: <...>
last_completed_step: Step 0|Step 1|Step 2|Step 3|Step 4|Step 5

## Step 0 notes

...

## Step 1 notes

...
```
