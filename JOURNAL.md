# Weekly Journal

Ghi lại hành trình xây dựng sản phẩm mỗi tuần — những gì đã làm, học được gì, AI giúp như thế nào.

> **Cập nhật mỗi cuối tuần** (trước khi tạo PR). Không cần dài, chỉ cần thật.

---

## Tuần 5 — 27/04 → 03/05/2026 (cập nhật tới 30/04)

### Đã làm

- Mốc git tuần này:
  - 27/04: merge **PR #38** (`dfaf8a1`) — Study buddy bot (backend/worker/integrations).
  - 28/04: merge **PR #39–#44** (`1d0db9e`…`6be6c1e`) — tiếp tục integrations + pipeline.
  - 29/04: merge **PR #45–#47** (`899bf01`, `6b4fa33`, `c6546c9`) — tối ưu deploy + cập nhật `PROJECT_CONTEXT.md`.
  - 30/04: merge **PR #48–#51** (`1427946`, `c7d44f9`, `7850642`, `2989e01`) — upgrade UI + fix deploy.
  - 30/04: `2eb16a6` — move doc file to `docs/`.
- Chốt trạng thái dự án: **PILOT**. Gom bối cảnh vào `PROJECT_CONTEXT.md`.
- Chuẩn hoá deploy pilot: Caddy reverse proxy + Docker Swarm.
- Hoàn thiện `scripts/redeploy.sh`: pre-check disk + retag theo `DEPLOY_ID` để Swarm luôn rollout.
- Bổ sung sơ đồ `docs/diagrams.md` và đồng bộ định hướng UI trong `DESIGN.md`/`PRODUCT.md`.

### Khó nhất tuần này

- Deploy ổn định (disk, rollout) khó hơn deploy “chạy được”.
- Viết docs đủ dùng, không dài dòng.

### AI tool đã dùng

- Cursor: tổng hợp mốc git + viết/chuẩn hoá `JOURNAL.md`, `WORKLOG.md`, docs.

### Học được

- Swarm + local image: cần **retag** theo deploy-id để chắc chắn rollout.
- Pilot cần docs vận hành tối thiểu (deploy, limits, lệnh debug).

### Nếu làm lại, sẽ làm khác

- Viết checklist/invariants deploy sớm hơn.

### Kế hoạch tuần tới

- Chạy smoke test các luồng chính sau mỗi deploy.
- Rà lại rủi ro `user_id` (impersonation) và đề xuất bước giảm thiểu cho pilot.

## Template

```markdown
## Tuần N — DD/MM/YYYY

### Đã làm

-

### Khó nhất tuần này

-

### AI tool đã dùng

- Tool: ... (dùng để làm gì → kết quả)

### Học được

-

### Nếu làm lại, sẽ làm khác

-

### Kế hoạch tuần tới

-
```

---

## Trước khi có commit (brainstorm) — trước 02/04/2026

### Đã làm

- Brainstorm ý tưởng sản phẩm Memio: học bằng flashcards + spaced repetition (SM-2), luồng người dùng và phạm vi MVP.
- Chốt nguyên tắc ban đầu: ưu tiên end-to-end sớm (có deploy thô), auth giữ mức tối thiểu giai đoạn đầu.

### Khó nhất tuần này

- Chốt scope “đủ để học/đủ để demo” mà không bị nở feature.

### AI tool đã dùng

- Cursor: gợi ý scope MVP + rủi ro.

### Học được

- Nếu chưa có code, thứ đáng viết nhất là **user flow + dữ liệu + rủi ro** (multi-tenancy, deploy).

### Nếu làm lại, sẽ làm khác

- Ghi lại quyết định/ADR ngay từ brainstorm để khỏi “mất dấu” sau vài tuần.

### Kế hoạch tuần tới

- Khởi tạo repo và đẩy commit nền tảng đầu tiên.

---

## Tuần 1 — 02/04 → 05/04/2026 (4 ngày)

### Đã làm

- Đẩy **root commit** ngày **02/04/2026**: `e49dfbd` — “Initial setup: starter code app with AI logging hooks”.
- Dựng skeleton repo để các tuần sau triển khai nhanh (đảm bảo “repo chạy được” trước khi mở rộng tính năng).
- Thiết lập nền tảng logging/hook cho việc dùng AI tooling để về sau dễ truy vết phiên làm việc khi debug.

### Khó nhất tuần này

- Chốt phạm vi thật gọn vì tuần đầu chỉ có 4 ngày: ưu tiên “nền tảng repo” hơn là nhồi nhiều tính năng.

### AI tool đã dùng

- Cursor: phác thảo checklist tuần đầu.

### Học được

- Nếu dự án có AI + DB, nên chốt **schema + boundaries** sớm để giảm refactor.

### Nếu làm lại, sẽ làm khác

- Viết `PROJECT_CONTEXT.md` sớm hơn để tránh drift giữa “ý tưởng” và “repo thực tế”.

### Kế hoạch tuần tới

- Làm demo đầu tiên và merge PR đầu tiên về `main`.

---

## Tuần 2 — 06/04 → 12/04/2026

### Đã làm

- Hoàn thành demo đầu tiên: commit `13dccb6` ngày **10/04** (“first_demo”).
- Hợp nhất PR đầu tiên về `main`: **Merge pull request #1** — commit `94b102d` ngày **10/04**.
- Ngay sau demo, có đợt cập nhật dày ngày 11/04 (refactor codebase, UI, README/guide, deployment script) để ổn định nền tảng.

### Khó nhất tuần này

- Giữ kỷ luật kỹ thuật sau giai đoạn “chạy demo”: thay đổi nhiều trong vài ngày rất dễ tạo debt nếu không refactor/ghi log quyết định.

### AI tool đã dùng

- Cursor: rà luồng demo/PR, giảm mismatch.

### Học được

- Merge/PR sớm giúp team nhìn rõ mốc tiến độ và dễ review, thay vì “làm xong một cục rồi mới gộp”.

### Nếu làm lại, sẽ làm khác

- Tách các thay đổi lớn (refactor/UI/deploy/docs) thành PR nhỏ hơn để review bớt “ngợp”.

### Kế hoạch tuần tới

- Chuẩn hoá phương pháp deploy (Caddy + Docker) và bắt đầu chốt các quyết định AI/UI quan trọng.

---

## Tuần 3 — 13/04 → 19/04/2026

### Đã làm

- Đẩy mạnh “deployment method” với Caddy + Docker: chuỗi commit 15–16/04 và merge **PR #5** ngày 16/04.
- Đồng bộ/ổn định script + requirements/db và merge **PR #6, #7** ngày 16/04.
- Đợt cải tiến UI và hướng AI provider: 18–19/04 (có merge **PR #8** và **PR #9** ngày 19/04).

### Khó nhất tuần này

- Triển khai liên tục trong khi code thay đổi nhanh: cần quy trình deploy rõ để tránh “works on my machine”.

### AI tool đã dùng

- Cursor: hỗ trợ rà soát UI/AI output (mức high-level).

### Học được

- Khi merge PR dày, worklog/ADR là “bộ nhớ chung” giúp team không mất dấu bối cảnh.

### Nếu làm lại, sẽ làm khác

- Chốt format JSON cho explain/citations trước rồi mới viết UI, tránh sửa đi sửa lại.

### Kế hoạch tuần tới

- Hoàn thiện phần dữ liệu/ORM + trải nghiệm học, và ghi lại các quyết định/bug quan trọng vào `WORKLOG.md`.

---

## Tuần 4 — 20/04 → 26/04/2026

### Đã làm

- Đợt merge dày các PR **#10–#19** (20–21/04) tập trung vào dữ liệu/ORM, deploy, và các phần tính năng/UX liên quan.
- Bắt đầu coi `WORKLOG.md` như nơi chốt “quyết định + rủi ro” (đặc biệt multi-tenancy theo `user_id`) để giảm lỗi lặp lại.

### Khó nhất tuần này

- Khi lượng thay đổi dồn dập, nếu thiếu “bức tranh tổng thể” (context doc) thì onboarding/debug tốn thời gian hơn cả viết code.

### AI tool đã dùng

- Cursor: hỗ trợ gom docs theo bối cảnh pilot.

### Học được

- Trước khi bước sang pilot, cần chuẩn hoá docs + deploy tối thiểu để “sửa lỗi nhanh hơn thêm tính năng”.

### Nếu làm lại, sẽ làm khác

- Tạo checklist pilot (smoke test, logging, known issues) sớm hơn để tránh quên những thứ “không hào nhoáng” nhưng rất cần.

### Kế hoạch tuần tới

- Cứng hoá redeploy script, resource limits, và quan sát trạng thái Swarm sau deploy.
