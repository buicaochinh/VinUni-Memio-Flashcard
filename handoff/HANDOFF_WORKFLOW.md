## Handoff workflow (không dùng hook) — ít token, không gián đoạn

Mục tiêu: mỗi session/đợt thay đổi kết thúc, agent ghi lại một mục ngắn để lần sau resume mà không cần đọc lại repo.

### Khi bắt đầu session mới (resume nhanh)

1) Đọc `PROJECT_CONTEXT.md` mục **Quick Rehydrate** + **Current Invariants**.  
2) Chạy `git status` (và `git diff` nếu cần) để biết đang ở đâu.

### Khi kết thúc một đợt làm việc (hoặc trước khi dừng)

Bạn chỉ cần nhắn agent đúng 1 câu:

> “Ghi handoff vào `handoff/SESSION_NOTES.md` theo format dưới đây.”

Agent sẽ append một mục theo template.

### Template (append vào cuối `handoff/SESSION_NOTES.md`)

```markdown
## Handoff — YYYY-MM-DD HH:MM (TZ)

- Branch: `...`
- Base: `main`
- HEAD: `<sha>` - <subject>
- Status: clean/dirty

### Goal
- ...

### Done
- ...

### Next
- ...

### Files changed (high-level)
- ...

### How to verify (optional)
- ...
```

### Nguyên tắc tối ưu token

- Viết **bullet ngắn**, ưu tiên “điều gì thay đổi” + “bước tiếp theo”.
- Chỉ liệt kê **5–15 file quan trọng nhất** (không dump toàn bộ diff).
- Nếu có drift/rủi ro: ghi 1 dòng vào “Next”.

