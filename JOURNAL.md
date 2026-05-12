# Weekly Journal — Memio

Ghi lại hành trình xây dựng sản phẩm mỗi tuần — những gì đã làm, học được gì, AI giúp như thế nào.

> **Cập nhật mỗi cuối tuần** (trước khi tạo PR). Không cần dài, chỉ cần thật.

---

## Trước khi có commit — brainstorm ban đầu (trước 02/04/2026)

### Đã làm

- Brainstorm ý tưởng sản phẩm Memio: học bằng flashcards + spaced repetition (SM-2), xác định luồng người dùng và phạm vi MVP.
- Chốt nguyên tắc ban đầu: ưu tiên end-to-end sớm (có deploy thô), giữ auth ở mức tối thiểu trong giai đoạn đầu.

### Khó nhất giai đoạn này

- Chốt scope "đủ để học/đủ để demo" mà không bị nở feature.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Gợi ý scope MVP + rủi ro ban đầu | Chốt được danh sách tính năng cốt lõi |

### Học được

- Nếu chưa có code, thứ đáng viết nhất là **user flow + dữ liệu + rủi ro** (multi-tenancy, deploy) — không phải feature list.

### Nếu làm lại, sẽ làm khác

- Ghi lại quyết định/ADR ngay từ brainstorm để khỏi "mất dấu" sau vài tuần.

### Kế hoạch tuần tới

- Khởi tạo repo và đẩy commit nền tảng đầu tiên.

---

## Tuần 1 — 02/04 → 05/04/2026

### Đã làm

- Đẩy **root commit** ngày **02/04/2026** (`e49dfbd`): "Initial setup: starter code app with AI logging hooks".
- Dựng skeleton repo để các tuần sau triển khai nhanh — đảm bảo "repo chạy được" trước khi mở rộng tính năng.
- Thiết lập nền tảng logging/hook cho AI tooling để về sau dễ truy vết phiên làm việc khi debug.

### Khó nhất tuần này

- Chốt phạm vi thật gọn vì tuần đầu chỉ có 4 ngày: ưu tiên "nền tảng repo" hơn là nhồi nhiều tính năng.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Phác thảo checklist tuần đầu | Có skeleton repo hoạt động được |

### Học được

- Nếu dự án có AI + DB, nên chốt **schema + boundaries** sớm để giảm refactor về sau.

### Nếu làm lại, sẽ làm khác

- Viết `PROJECT_CONTEXT.md` sớm hơn để tránh drift giữa "ý tưởng" và "repo thực tế".

### Kế hoạch tuần tới

- Làm demo đầu tiên và merge PR đầu tiên về `main`.

---

## Tuần 2 — 06/04 → 12/04/2026

### Đã làm

- Hoàn thành demo đầu tiên: commit `13dccb6` ngày **10/04** ("first_demo").
- Merge PR đầu tiên về `main`: **PR #1** — commit `94b102d` ngày **10/04**.
- Ngay sau demo, có đợt cập nhật dày ngày 11/04 (refactor codebase, UI, README/guide, deployment script) để ổn định nền tảng.

### Khó nhất tuần này

- Giữ kỷ luật kỹ thuật sau giai đoạn "chạy demo": thay đổi nhiều trong vài ngày rất dễ tạo debt nếu không refactor/ghi log quyết định.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Rà luồng demo/PR, giảm mismatch giữa code và spec | Demo đầu tiên thành công |

### Học được

- Merge/PR sớm giúp nhìn rõ mốc tiến độ và dễ review hơn so với "làm xong một cục rồi mới gộp".

### Nếu làm lại, sẽ làm khác

- Tách các thay đổi lớn (refactor/UI/deploy/docs) thành PR nhỏ hơn để review bớt "ngợp".

### Kế hoạch tuần tới

- Chuẩn hóa phương pháp deploy (Caddy + Docker) và bắt đầu chốt các quyết định AI/UI quan trọng.

---

## Tuần 3 — 13/04 → 19/04/2026

### Đã làm

- Đẩy mạnh "deployment method" với Caddy + Docker: chuỗi commit 15–16/04 và merge **PR #5** ngày 16/04.
- Đồng bộ/ổn định script + requirements/db và merge **PR #6, #7** ngày 16/04.
- Đợt cải tiến UI và thử nghiệm AI provider: 18–19/04, merge **PR #8** và **PR #9** ngày 19/04.

### Khó nhất tuần này

- Triển khai liên tục trong khi code thay đổi nhanh: cần quy trình deploy rõ để tránh "works on my machine".

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Rà soát UI/AI output, hỗ trợ script deploy | Định hình được deployment pattern Caddy + Docker |

### Học được

- Khi merge PR dày, worklog/ADR là "bộ nhớ chung" giúp không mất dấu bối cảnh qua các ngày.

### Nếu làm lại, sẽ làm khác

- Chốt format JSON cho explain/citations trước rồi mới viết UI, tránh sửa đi sửa lại nhiều lần.

### Kế hoạch tuần tới

- Hoàn thiện phần dữ liệu/ORM + trải nghiệm học, và ghi lại các quyết định/bug quan trọng vào `WORKLOG.md`.

---

## Tuần 4 — 20/04 → 26/04/2026

### Đã làm

- Đợt merge dày các PR **#10–#37** (20–26/04):
  - **Bùi Đức Thắng**: Frontend — AppShell, dark mode, Tailwind, theme provider, layout update, login attributes, system prompt (PR #24–#28, #29–#36).
  - **Bùi Cao Chinh**: Backend — analytics, explain flow, study session, ORM, deploy, hotfix login (23/04, `6cd55dc`).
- Bắt đầu coi `WORKLOG.md` như nơi chốt "quyết định + rủi ro" — đặc biệt rủi ro multi-tenancy theo `user_id`.

### Khó nhất tuần này

- Khi lượng thay đổi dồn dập, nếu thiếu "bức tranh tổng thể" (context doc) thì onboarding/debug tốn thời gian hơn cả viết code.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Hỗ trợ gom docs theo bối cảnh pilot | Có bản docs đầu tiên đủ dùng cho nhóm |

### Học được

- Trước khi bước sang pilot, cần chuẩn hóa docs + deploy tối thiểu để "sửa lỗi nhanh hơn thêm tính năng".

### Nếu làm lại, sẽ làm khác

- Tạo checklist pilot (smoke test, logging, known issues) sớm hơn để tránh quên những thứ "không hào nhoáng" nhưng rất cần.

### Kế hoạch tuần tới

- Cứng hóa redeploy script, resource limits, và quan sát trạng thái Swarm sau deploy.

---

## Tuần 5 — 27/04 → 03/05/2026

### Đã làm

- Mốc git tuần này:
  - 27/04: merge **PR #38** (`dfaf8a1`) — Study buddy bot (backend/worker/integrations). *(Bùi Cao Chinh)*
  - 28/04: merge **PR #39–#44** — tiếp tục integrations + **adaptive card pipeline** *(Bùi Đức Tiến)*.
  - 29/04: merge **PR #45–#47** — tối ưu deploy + cập nhật `PROJECT_CONTEXT.md`. *(Bùi Cao Chinh)*
  - 30/04: merge **PR #48–#52** — nâng cấp UI + fix redeploy; **PR #52 chatbot update** *(Bùi Đức Thắng)*.
  - 04/05: merge **PR #53–#61** — docs refactor, ingestion module, Telegram QR, i18n integrations.
- Chốt trạng thái dự án: **PILOT** (hiệu lực từ 29/04/2026). Gom bối cảnh vào `PROJECT_CONTEXT.md`. *(Bùi Cao Chinh)*
- Chuẩn hóa deploy pilot: Caddy reverse proxy + Docker Swarm. *(Bùi Cao Chinh)*
- Hoàn thiện `scripts/redeploy.sh`: pre-check disk + retag theo `DEPLOY_ID` để Swarm luôn rollout.
- Bổ sung sơ đồ `docs/diagrams.md` và đồng bộ định hướng UI trong `DESIGN.md`/`PRODUCT.md`.

### Khó nhất tuần này

- Deploy ổn định (disk management, Swarm rollout) khó hơn nhiều so với deploy "chạy được".
- Viết docs đủ dùng mà không dài dòng.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Cursor | Tổng hợp mốc git + viết/chuẩn hóa `JOURNAL.md`, `WORKLOG.md`, docs | Docs hệ thống trở nên nhất quán |

### Học được

- Swarm + local image: cần **retag** theo deploy-id để chắc chắn Swarm tạo container mới thay vì giữ cũ.
- Pilot cần docs vận hành tối thiểu: deploy flow, limits, lệnh debug cơ bản.

### Nếu làm lại, sẽ làm khác

- Viết checklist/invariants deploy sớm hơn, trước khi có lỗi thực tế.

### Kế hoạch tuần tới

- Thêm ingestion module, chuẩn hóa integrations, và mở rộng chức năng học tập.

---

## Tuần 6 — 04/05 → 09/05/2026

### Đã làm

- Mốc git tuần này:
  - 04/05: merge **PR #54–#61** — ingestion module, Telegram QR, i18n integrations. *(Bùi Đức Thắng)*
  - 05/05: merge **PR #62** — daily limits + user settings. *(Bùi Cao Chinh)*
  - 05/05: merge **PR #63–#69** — Notion integration MVP, UX import deck từ Notion. *(Bùi Đức Thắng)*
  - 06/05: merge **PR #70–#71** — user-level timezone, hook JSON fix, study tutor/settings fixes. *(Bùi Cao Chinh)*
  - 07/05: merge **PR #72–#74** — OpenAI docs, game sessions (Adventure Campaign), Memio Coach end-to-end. *(Bùi Cao Chinh)*
  - 08/05: merge **PR #75** — product improvement PRD, sprint plan/execution docs.
  - 08/05: merge **PR #76–#77** — diagrams update, worklog. *(Bùi Đức Thắng)*
  - 08/05: merge **PR #78–#79** — Image Flashcard / DALL-E end-to-end (migration 3 cột, generate_image_cards endpoint, render ảnh khi study). *(Bùi Đức Tiến)*
  - 09/05: merge **PR #81** — hoàn tất migrate auth sang JWT Bearer. *(Bùi Cao Chinh)*
  - 09/05: merge **PR #82–#83** — hệ thống XP (`total_xp`), UI Image Flashcard update. *(Bùi Cao Chinh)*
  - 09/05: fix `scripts/log_hook.py` hỗ trợ tool Antigravity. *(Bùi Cao Chinh)*
- Hoàn thiện hệ thống Gamification: XP earned từ study session và game được cộng vào `users.total_xp`. Level system với 10 cấp độ. *(Bùi Cao Chinh)*
- Memio Coach đã có thể trò chuyện, gợi ý hành động, và làm quiz ngay trong chat. *(Bùi Cao Chinh)*
- Image Flashcard "Đuổi Hình Bắt Chữ" hoàn chỉnh: từ upload tài liệu → AI chọn concept → DALL-E 3 tạo ảnh → lưu local → hiển thị khi study. *(Bùi Đức Tiến)*
- Hoàn tất migrate auth sang JWT Bearer — không còn truyền `user_id` qua query/body ở bất kỳ endpoint nào. *(Bùi Cao Chinh)*
- Chuẩn hóa việc ghi log cho mọi AI tool (Claude Code, Cursor, Gemini, Antigravity).

### Khó nhất tuần này

- Tích hợp context học tập vào Coach sao cho tự nhiên mà vẫn đảm bảo độ chính xác (citations).
- Đảm bảo hệ thống XP hoạt động đồng bộ ở cả backend và frontend khi cả study session lẫn game đều cộng XP.

### AI tool đã dùng

| Tool | Dùng để làm gì | Người dùng | Kết quả |
|------|----------------|-----------|---------|
| Antigravity | Rà soát codebase, fix hook, cập nhật tài liệu kỹ thuật | Bùi Cao Chinh | Docs kỹ thuật phản ánh đúng trạng thái thực |
| Claude Code | Hỗ trợ auth migration (JWT Bearer), hệ thống XP | Bùi Cao Chinh | Auth và XP hoàn chỉnh, đồng bộ frontend–backend |

### Học được

- Việc có một "tư vấn viên" như Memio Coach giúp người học bớt ngợp khi đối diện với lượng tài liệu lớn.
- Gamification (XP, Level) thực sự tạo động lực rõ rệt — quan sát thấy ngay khi test với user thật.

### Nếu làm lại, sẽ làm khác

- Nên thiết kế hệ thống XP tập trung hơn ngay từ đầu thay vì rải rác ở nhiều service rồi phải gom lại.

### Kế hoạch tuần tới

- Thêm Semantic Clustering (Learning Intelligence), Notification System, cải thiện UX (skeleton, streak, vocab mode).

---

## Tuần 7 — 10/05 → 16/05/2026 (cập nhật tới 12/05)

### Đã làm

- Mốc git tuần này (toàn bộ do **Bùi Cao Chinh** thực hiện):
  - 10/05: merge **PR #84** (`f36724e`) — Semantic Clustering / Learning Intelligence, Notification System (in-app bell + Telegram cron), Settings page thay thế UserSettingsModal.
  - 10/05: merge **PR #85** (`bd2de81`) — Streak feature (hiển thị streak trong Daily Mission).
  - 10/05: merge **PR #86, #87** — Cải tiến luồng tạo Deck.
  - 10/05: merge **PR #88** (`8f2b197`) — Tính năng chỉnh sửa Deck (`/deck/[shareToken]/edit/`).
  - 10/05: merge **PR #89** (`6e93f10`) — Skeleton Loading UI cho workspace và study page.
  - 10/05: merge **PR #90** (`ba109ef`) — Vocab Mode.
  - 10/05: Loạt 6 hotfix cho Celery worker/beat — không ổn định liên tục sau deploy.
  - 11/05: merge **PR #91** (`3876f7f`) — Chuyển hoàn toàn sang APScheduler, xóa `celery_app.py` và legacy files.
  - 11/05: Dọn dẹp `database.py`, `config.py` gốc, fonts không dùng; đổi domain; fix UI các trang.

### Khó nhất tuần này

- Celery Beat container fail liên tục khi deploy — phải hotfix 6 lần trong một ngày mà vẫn không ổn định, cuối cùng phải đưa ra quyết định kiến trúc (chuyển sang APScheduler) thay vì tiếp tục patch.
- Merge quá nhiều PR trong cùng một ngày (10/05 có 6 PR + 6 hotfix) khiến khó trace nguyên nhân lỗi khi debug.

### AI tool đã dùng

| Tool | Dùng để làm gì | Kết quả |
|------|----------------|---------|
| Claude Code | Refactor worker stack sang APScheduler, chuẩn hóa tài liệu kỹ thuật | APScheduler hoạt động ổn định, legacy code được dọn sạch |

### Học được

- Celery phù hợp khi có nhiều task phức tạp và cần scale, nhưng với pilot ít task, APScheduler đơn giản hơn và ít điểm fail hơn nhiều.
- Khi một component fail liên tục sau nhiều lần patch, đó thường là dấu hiệu cần quyết định kiến trúc — không phải hotfix thêm.

### Nếu làm lại, sẽ làm khác

- Test worker stack kỹ hơn trong môi trường gần với production trước khi merge vào main.
- Rải PR ra nhiều ngày thay vì gộp hết vào một ngày để dễ trace lỗi hơn.

### Kế hoạch tuần tới

- Ổn định sau đợt thay đổi lớn — viết smoke test cho các tính năng mới (Notification, Vocab Mode, Semantic Clustering).
- Cân nhắc Push Notification / Email cho các trigger quan trọng (exam urgency, streak risk).
- Mở rộng Ingestion cho RSS và Obsidian.
