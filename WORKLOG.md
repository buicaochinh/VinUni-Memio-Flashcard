# Worklog — Memio

Ghi lại các quyết định kỹ thuật, rủi ro, và các mốc phát triển quan trọng của dự án Memio.

> **Nguyên tắc cập nhật:**
> - Timeline phải bám sát commit/merge thực tế trong git.
> - ADR đánh số duy nhất, không trùng lặp.
> - Nếu có thay đổi kiến trúc, deploy, auth, schema, hoặc AI provider thì cập nhật tại đây cùng lúc.

---

## Timeline thực tế theo git

### Các mốc nền tảng

- `2026-04-02` — `e49dfbd` — Root commit: khởi tạo dự án, starter app, AI logging hooks.
- `2026-04-10` — `13dccb6` — Demo đầu tiên (`first_demo`).
- `2026-04-10` — `94b102d` — Merge PR #1 vào `main`.

### Sprint 1 — 02/04 → 05/04/2026

- **Mục tiêu:** Dựng repo, chốt skeleton, bật logging/hook.
- **Mốc git:**
  - `02/04` — root commit `e49dfbd`.
- **Kết quả:** Có repo chạy được và nền tảng để nhóm tiếp tục mở rộng.

### Sprint 2 — 06/04 → 12/04/2026

- **Mục tiêu:** Có demo end-to-end đầu tiên và ổn định lại sau demo.
- **Mốc git:**
  - `10/04` — `13dccb6` demo đầu tiên.
  - `10/04` — `94b102d` merge PR #1.
  - `11/04` — Loạt commit refactor/UI/README/deploy (`e892cc2`, `d26165d`, `e33c635`, `c145f81`, `cefe4ca`...).
  - `11/04` — Merge PR #2 (`e39614e`).
- **Kết quả:**
  - Đã có một luồng sản phẩm demo được.
  - Bắt đầu xuất hiện nhu cầu tách rõ demo artifact và kiến trúc thật.

### Sprint 3 — 13/04 → 19/04/2026

- **Mục tiêu:** Chuẩn hóa cách deploy và điều chỉnh hướng AI/UI.
- **Mốc git:**
  - `14/04` — Bổ sung/cập nhật hook và agent rules (`8c599bb`, `45b8da0`, `573c390`).
  - `16/04` — Merge PR #5, #6, #7 liên quan deployment/db/script (`e1cd2a6`, `93574f9`, `776a57c`).
  - `18/04 → 19/04` — Đổi hướng provider + UI (`bdb5d8b`, `4426435`).
  - `19/04` — Merge PR #8 và #9 (`b350b85`, `196bc01`).
- **Kết quả:**
  - Deployment với Caddy + Docker được định hình rõ hơn.
  - Bắt đầu có quyết định ở mức provider/model thay vì chỉ sửa prompt.

### Sprint 4 — 20/04 → 26/04/2026

- **Mục tiêu:** Củng cố data model, giảm lỗi multi-tenancy, nâng cấp UX học tập.
- **Mốc git:**
  - `20/04` — Merge PR #10, #11; cập nhật SQL ORM, deploy, env (`4d48bb7`, `7ac3ccb`, `08283f7`, `967ea6b`).
  - `21/04` — Merge PR #12 → #28: chatbot, explain, survey, worklog, diagrams, dark mode, AppShell, theme provider/tokens.
  - `22/04` — Merge PR #29 → #36: tiếp tục worklog, parsing, login attributes, cập nhật requirements.
  - `23/04` — `6cd55dc` hotfix login.
  - `25/04` — Dark theme fixes, merge PR #37 (`e87990d`).
  - `26/04` — Đợt cập nhật lớn về frontend, analytics, login/signup, AppShell, agent instructions.
- **Kết quả:**
  - Study/chat/explain flow được đẩy mạnh.
  - Theme system và shell frontend được hình thành rõ.
  - Rủi ro multi-tenancy bắt đầu được ghi nhận rõ trong docs/worklog.

### Sprint 5 — 27/04 → 03/05/2026

- **Mục tiêu:** Đưa dự án sang trạng thái pilot, chuẩn hóa migrations, docs, deploy, integrations.
- **Mốc git:**
  - `27/04` — Đưa Alembic, auth JWT/session, integrations Telegram, worker, handoff vào repo; merge PR #38 (`dfaf8a1`).
  - `28/04` — Merge PR #39 → #44: migrations `0002` → `0006`, route integrations, docs folder, adaptive card pipeline.
  - `29/04` — Merge PR #45 → #47: thêm `docker-stack.yml`, `bootstrap.sh`, `redeploy.sh`, tối ưu deploy pilot.
  - `30/04` — Merge PR #48 → #52: nâng cấp UI, fix redeploy, move docs, chatbot update.
  - `04/05` — Merge PR #53 → #61: docs refactor, ingestion module, Telegram QR, i18n integrations.
- **Kết quả:**
  - Dự án chuyển sang pilot deployment model.
  - `PROJECT_CONTEXT.md`, `docs/INDEX.md`, handoff workflow, docs folder được chuẩn hóa.
  - Ingestion/integrations trở thành một nhánh chức năng riêng biệt.

### Sprint 6 — 05/05 → 09/05/2026

- **Mục tiêu:** Bổ sung learning loop, Notion flow, timezone, coach, game, và cải tiến sản phẩm.
- **Mốc git:**
  - `05/05` — Merge PR #62: giới hạn daily study + user settings (`7c6b2a4`).
  - `05/05` — Merge PR #63 → #69: Notion integration MVP, UX import deck từ Notion, fonts/workspace updates.
  - `06/05` — Merge PR #70, #71: user-level timezone, hook JSON fix, study tutor/settings/auth fixes.
  - `07/05` — Merge PR #72: docs OpenAI provider.
  - `07/05` — Merge PR #73: game sessions / play route / campaign flow.
  - `07/05` — Merge PR #74: Memio Coach end-to-end.
  - `08/05` — Merge PR #75: docs sprint plan/execution/PRD cho cải tiến sản phẩm.
  - `09/05` — Merge PR #81: hoàn tất migrate auth sang JWT Bearer.
  - `09/05` — Merge PR #82: hệ thống XP (`0015_user_xp`), service, và UI người dùng (`d63214b`).
  - `09/05` — Merge PR #83: cập nhật UI Image Flashcard (`19ad85f`).
  - `09/05` — Fix `scripts/log_hook.py` hỗ trợ tool Antigravity (`de79015`).
- **Kết quả:**
  - Hệ thống có thêm 3 trụ cột mới: daily limits/settings, game loop, coach loop.
  - Hệ thống XP đã sẵn sàng: thưởng XP cho study session và game.
  - Auth đã migrate hoàn toàn sang JWT Bearer.
  - Docs sản phẩm và docs kỹ thuật đã phản ánh đúng hơn trạng thái hiện tại.

### Sprint 7 — 10/05 → 12/05/2026 (đang tiến hành)

- **Mục tiêu:** Nâng cao UX, bổ sung Learning Intelligence (semantic clustering), Notification System, ổn định infrastructure worker.
- **Mốc git:**
  - `10/05` — Merge PR #84 (`f36724e`): Semantic Clustering / Learning Intelligence, Notification System, Settings page (thay thế UserSettingsModal).
  - `10/05` — Merge PR #85 (`bd2de81`): Streak feature.
  - `10/05` — Merge PR #86, #87 (`68b0a14`, `d6e4cff`): Cải tiến luồng tạo Deck.
  - `10/05` — Merge PR #88 (`8f2b197`): Tính năng chỉnh sửa Deck (`/deck/[shareToken]/edit/`).
  - `10/05` — Merge PR #89 (`6e93f10`): Skeleton Loading UI.
  - `10/05` — Merge PR #90 (`ba109ef`): Vocab Mode.
  - `10/05` — Loạt hotfix deploy Celery worker/beat (6 commits: `e51099a`, `b30036d`, `f13e52d`, `2ca8cea`, `2e1e0ce`, `0a5153d`).
  - `11/05` — Merge PR #91 (`3876f7f`): Chuyển sang APScheduler, xóa legacy Celery files.
  - `11/05` — Dọn dẹp legacy files (`database.py`, `config.py`, `celery_app.py`), đổi domain, bỏ fonts cũ, fix UI các trang.
- **Kết quả:**
  - Nhiều tính năng UX quan trọng ra mắt trong một ngày.
  - Notification system hoàn chỉnh (in-app + Telegram cron).
  - Worker stack đơn giản hơn với APScheduler.

---

## Quyết định kỹ thuật (ADR)

### [ADR-1] Dùng FastAPI + Next.js trong cùng một monorepo — 02/04/2026

**Bối cảnh:** Cần lên MVP nhanh, backend và frontend cần đi cùng nhau.

**Quyết định:** Đặt backend trong `src/`, frontend trong `frontend/`, quản lý chung trong một repo.

**Hệ quả:** Dễ ship nhanh và đồng bộ schema/API, nhưng docs và context phải rõ để tránh drift.

---

### [ADR-2] Chọn SM-2 làm scheduling algorithm ban đầu — trước 10/04/2026

**Bối cảnh:** Cần có spaced repetition sớm để demo được luồng học.

**Quyết định:** Dùng SM-2 vì đơn giản, dễ implement và dễ debug.

**Hệ quả:** Đủ cho pilot, nhưng về sau có thể cần scheduler tốt hơn khi có đủ review history.

---

### [ADR-3] Thử nghiệm AI provider trong giai đoạn 18/04 → 19/04 — 19/04/2026

**Bối cảnh:** Nhóm thử nghiệm thay đổi provider/model để cải thiện card generation và reasoning.

**Chứng cứ git:** `d8b23c4` update OpenRouter API key; `bdb5d8b` update change to anthropic; `f50c226` update model api key.

**Quyết định:** Giai đoạn này hệ thống tạm thời chuyển hướng sang Anthropic/OpenRouter để thử nghiệm.

**Hệ quả:** Docs và config trong giai đoạn sau cần được làm sạch lại để phân biệt "thử nghiệm provider" và "provider đang dùng thật".

---

### [ADR-4] Tích hợp citations cho luồng Explain — 21/04/2026

**Bối cảnh:** Người dùng cần biết AI lấy thông tin giải thích từ đâu.

**Chứng cứ git:** `6c56354` update explain button; các merge PR ngày 21/04 cho chatbot/explain/worklog/diagram.

**Quyết định:** Giữ `source_context` trên flashcard và xây explain flow theo hướng có trích dẫn `[1]`, `[2]`.

**Hệ quả:** Schema và prompt AI phải mang theo context; frontend cần xử lý phần hiển thị/citation UX.

---

### [ADR-5] Triển khai dark mode bằng `next-themes` + CSS variables — 21/04/2026

**Bối cảnh:** Sau đợt UI update, cần một cách theming đồng bộ toàn app thay vì sửa từng component.

**Chứng cứ git:** `54a21af` add theme toggle; `8c3e22a` add theme provider; `893dfd4` tailwind update; `1db4ffb` feat: update dark theme.

**Quyết định:** Dùng `next-themes`, `darkMode: "class"`, và color tokens qua CSS variables.

**Hệ quả:** Cần tránh dùng màu low-contrast sai quy ước (`text-secondary` rất nhạt trong light mode), và phải xử lý hydration cho `ThemeToggle` bằng `mounted` state.

---

### [ADR-6] Chuẩn hóa migrations bằng Alembic, không dựa vào runtime create_all — 27/04/2026

**Bối cảnh:** Schema đã bắt đầu phình to với auth sessions, integrations, workers, game, coach.

**Chứng cứ git:** `9465969` add `alembic.ini`; `05ea14c` add `alembic/`; chuỗi migrations `0002` → `0012`.

**Quyết định:** Schema thay đổi phải qua Alembic; runtime auto-create không còn là source of truth.

**Hệ quả:** Mọi thay đổi DB cần có migration đi kèm và docs phải nhắc rõ lệnh `alembic upgrade head`.

---

### [ADR-7] Chọn Docker Swarm single-node cho pilot deploy — 29/04/2026

**Bối cảnh:** Cần pilot deploy ổn định hơn Compose thuần, nhưng hạ tầng vẫn đơn giản (1 server).

**Chứng cứ git:** `6712c14` add `docker-stack.yml`; `743c9fe` add `scripts/bootstrap.sh`; `34dd52b` add `scripts/redeploy.sh`.

**Quyết định:** Dùng Docker Swarm single-node để có rolling deploy có kiểm soát; Compose chỉ dùng để build image.

**Hệ quả:** Cần bootstrap server, cần quy ước image/tag rõ, và docs deploy phải đầy đủ.

---

### [ADR-8] Dùng local images + retag theo deploy ID để ép Swarm rollout — 29/04/2026

**Bối cảnh:** Build image trực tiếp trên server, không có registry trung gian.

**Chứng cứ git:** Các cập nhật `scripts/redeploy.sh` ngày 29/04 và 30/04.

**Quyết định:** Retag image theo `DEPLOY_ID` trong redeploy flow để Swarm thực sự rollout container mới.

**Hệ quả:** Tốn nhiều image hơn, đổi lại trace deploy rõ hơn và tránh tình trạng "deploy xong nhưng container không đổi".

---

### [ADR-9] Thêm disk pre-check và cleanup có ngưỡng trong redeploy — 29/04/2026

**Bối cảnh:** Pilot server nhỏ (30GB SSD), dễ hết disk khi build image liên tục.

**Quyết định:** Pre-check disk, prune khi xuống dưới ngưỡng an toàn trước khi build.

**Hệ quả:** Giảm nguy cơ fail deploy vì hết dung lượng, nhưng có thể làm mất cache build một phần.

---

### [ADR-10] Caddy làm reverse proxy theo domain tách frontend/backend — 29/04/2026

**Bối cảnh:** Cần HTTPS tự động và route rõ ràng cho `mem.io.vn` và `api.mem.io.vn`.

**Quyết định:** Dùng Caddy làm reverse proxy theo domain, để Caddy tự quản lý TLS qua Let's Encrypt.

**Hệ quả:** DNS/CORS/domain config phải đồng bộ; deploy đơn giản hơn nhiều so với tự quản lý TLS thủ công.

---

### [ADR-11] `PROJECT_CONTEXT.md` trở thành source of truth kỹ thuật/vận hành — 29/04/2026

**Bối cảnh:** Repo chuyển nhanh, có backend, frontend, deploy, worker, integrations, docs — dễ drift.

**Chứng cứ git:** `a00a750`, `bf6cb97`, `19e1614`, `775edd3`, `5206ace`, `7fd35c9`.

**Quyết định:** `PROJECT_CONTEXT.md` là tài liệu cần đọc đầu tiên; `docs/diagrams.md`, `docs/INDEX.md`, handoff docs phải đồng bộ với file này.

**Hệ quả:** Mọi thay đổi kiến trúc/API/deploy/schema phải cập nhật docs ngay, nếu không sẽ drift rất nhanh.

---

### [ADR-12] Mô hình auth hỗn hợp trong giai đoạn chuyển tiếp — 27/04/2026

**Bối cảnh:** Sản phẩm đang ở pilot, trong khi integrations cần auth chắc chắn hơn sớm hơn phần còn lại.

**Quyết định:** Chấp nhận mô hình auth hỗn hợp tạm thời: một số route dùng JWT Bearer, một số vẫn dùng `user_id`.

**Hệ quả:** Cần ghi rõ route nào dùng auth nào; rủi ro impersonation vẫn tồn tại ở legacy flows. *(Đã giải quyết hoàn toàn — xem ADR-17.)*

---

### [ADR-13] Thêm ingestion và integrations như một module riêng — 04/05/2026

**Bối cảnh:** Cần đồng bộ nội dung học từ nguồn ngoài (Telegram, Notion) và chatbot surfaces.

**Chứng cứ git:** `73cf63a` add ingestion module tables; PR #54 → #61.

**Quyết định:** Tạo nhóm tables/services/routes riêng cho ingestion/integrations thay vì nhúng vào card service cũ.

**Hệ quả:** Hệ thống rõ ranh giới hơn, nhưng docs và migration complexity tăng lên.

---

### [ADR-14] Áp dụng study limits và timezone theo từng người dùng — 05/05 → 06/05/2026

**Bối cảnh:** Cần làm Daily Mission và daily queue đúng theo người dùng, không chỉ theo server time.

**Chứng cứ git:** `e3fffdb` migration `0008_add_daily_limits`; `c81ab98` thêm users endpoint cho settings; `e32fa50` add user-level timezone handling.

**Quyết định:** Giới hạn new/review và timezone được đặt theo từng user trong bảng `user_settings`.

**Hệ quả:** Các tính toán queue, analytics, và local-day features phải dựa trên timezone của user, không phải server timezone.

---

### [ADR-15] Chốt OpenAI là AI provider chính — 07/05/2026

**Bối cảnh:** Sau giai đoạn thử nghiệm nhiều provider (xem ADR-3), tài liệu và implementation đã quay về OpenAI.

**Chứng cứ git:** `d8c6397` update OpenAI provider documentation; `ca0bae1` merge PR #72; `PROJECT_CONTEXT.md` xác định `langchain_openai.ChatOpenAI` + `gpt-4o-mini`.

**Quyết định:** OpenAI là provider AI chính cho card generation, explain, campaign, coach, và semantic clustering.

**Hệ quả:** Docs, `.env.example`, lời hướng dẫn vận hành phải phản ánh OpenAI là source of truth hiện tại.

---

### [ADR-16] Thêm game loop Adventure Campaign — 07/05/2026

**Bối cảnh:** Cần tăng engagement và tạo một learning surface khác study mode thông thường.

**Chứng cứ git:** `149d036` migration `0011_game_sessions`; `f3307d2` play route; `c852595` games endpoint; `e41838c` game service.

**Quyết định:** Game campaign được AI tạo một lần khi start, lưu vào `game_sessions`, và map kết quả ngược về SM-2 quality. Có fallback campaign khi OpenAI lỗi.

**Hệ quả:** Game trở thành một phần của learning loop (cập nhật SM-2, cộng XP), không chỉ là mini-game tách biệt.

---

### [ADR-17] Hoàn tất migrate auth sang JWT Bearer — 09/05/2026

**Bối cảnh:** Legacy auth dùng `user_id` qua query/body tạo rủi ro impersonation. Cần chốt một chuẩn auth thống nhất cho toàn hệ thống.

**Chứng cứ git:** Merge PR #81 (`858a2f2`) — fix/auth-migration.

**Quyết định:** Tất cả protected endpoints chuyển sang `Depends(get_current_user_id)` từ `src/app/api/deps.py`; frontend dùng `authFetch()` tự gắn Bearer token và tự refresh khi nhận 401.

**Hệ quả:** Không còn truyền `user_id` qua query params hay body. Public endpoints (`/auth/*`, `/decks/shared/{token}`, Telegram webhook) được giữ nguyên không cần auth.

---

### [ADR-18] Thêm Notification System (in-app + Telegram cron) — 10/05/2026

**Bối cảnh:** Người dùng cần được nhắc nhở khi có thẻ đến hạn, streak sắp gãy, hoặc deadline thi gần.

**Chứng cứ git:** `fabc99f` add notifications endpoint; `8bd0adf` add notification_service.py; `91e1666` add settings page; merge PR #84 (`f36724e`).

**Quyết định:** Xây `notification_service.py` để tính cảnh báo theo 3 loại (due cards, streak risk, exam urgency); hiển thị in-app qua bell icon trong header; gửi Telegram theo cron endpoint `POST /api/notifications/trigger` bảo vệ bằng `CRON_SECRET`.

**Hệ quả:** Cần thêm `CRON_SECRET` vào `.env`; dedup bằng trường `sent_today_date`; cần `ChatIntegration` record để gửi Telegram. Settings page (`/settings`) thay thế `UserSettingsModal`.

---

### [ADR-19] Chuyển từ Celery Beat sang APScheduler — 11/05/2026

**Bối cảnh:** Celery Beat container liên tục fail khi deploy pilot; stack quá nặng cho số lượng task ít. Nhóm mất cả ngày 10/05 để hotfix Celery mà vẫn không ổn định.

**Chứng cứ git:** Loạt hotfix 10/05 (`e51099a`, `b30036d`, `f13e52d`, `2ca8cea`, `2e1e0ce`, `0a5153d`); merge PR #91 (`3876f7f`) — thêm `scheduler.py`, xóa `celery_app.py`.

**Quyết định:** Nhúng APScheduler trực tiếp vào backend FastAPI, loại bỏ Celery Beat khỏi stack.

**Hệ quả:** Đơn giản hóa stack và giảm resource usage. Nếu cần scale ngang trong tương lai, APScheduler chạy trong process sẽ cần được xem xét lại (chạy schedule trùng lặp trên nhiều replica).

---

## Phân công

> **Ghi chú:** Sprint 1–3 chưa ghi lại phân công theo member (chỉ có Bùi Cao Chinh commit). Bổ sung từ Sprint 4 trở đi khi Bùi Đức Thắng và Bùi Đức Tiến tham gia.

### Sprint 4 — 20/04 → 26/04/2026

| Task | Người làm | Trạng thái |
|------|-----------|------------|
| Frontend: AppShell, dark mode, theme, Tailwind, layout | Bùi Đức Thắng | Hoàn thành |
| Frontend: login attributes, parsing, system prompt | Bùi Đức Thắng | Hoàn thành |
| Backend: analytics, explain flow, study session | Bùi Cao Chinh | Hoàn thành |
| Hotfix login, deploy ổn định | Bùi Cao Chinh | Hoàn thành |

### Sprint 5 — 27/04 → 03/05/2026

| Task | Người làm | Trạng thái |
|------|-----------|------------|
| Adaptive card pipeline (dedup + quality filter) | Bùi Đức Tiến | Hoàn thành |
| Chatbot update (PR #52) | Bùi Đức Thắng | Hoàn thành |
| Deploy pilot: Docker Swarm, bootstrap/redeploy scripts | Bùi Cao Chinh | Hoàn thành |
| PROJECT_CONTEXT.md, ingestion backend, integrations routes | Bùi Cao Chinh | Hoàn thành |

### Sprint 6 — 04/05 → 09/05/2026

| Task | Người làm | Trạng thái |
|------|-----------|------------|
| Ingestion module (PR #54–#60) | Bùi Đức Thắng | Hoàn thành |
| Notion integration MVP (PR #63–#69) | Bùi Đức Thắng | Hoàn thành |
| Diagrams update, worklog (PR #76–#77) | Bùi Đức Thắng | Hoàn thành |
| Image Flashcard / DALL-E end-to-end (PR #78–#79) | Bùi Đức Tiến | Hoàn thành |
| Daily limits + timezone (PR #62, #70–#71) | Bùi Cao Chinh | Hoàn thành |
| Game loop Adventure Campaign (PR #73) | Bùi Cao Chinh | Hoàn thành |
| Memio Coach end-to-end (PR #74) | Bùi Cao Chinh | Hoàn thành |
| Auth JWT Bearer migration (PR #81) | Bùi Cao Chinh | Hoàn thành |
| Hệ thống XP (PR #82) | Bùi Cao Chinh | Hoàn thành |

### Sprint 7 — 10/05 → 16/05/2026

| Task | Người làm | Deadline | Trạng thái |
|------|-----------|----------|------------|
| Semantic Clustering / Learning Intelligence | Bùi Cao Chinh | 10/05 | Hoàn thành |
| Notification System (in-app + Telegram) | Bùi Cao Chinh | 10/05 | Hoàn thành |
| Vocab Mode | Bùi Cao Chinh | 10/05 | Hoàn thành |
| Skeleton Loading UI | Bùi Cao Chinh | 10/05 | Hoàn thành |
| Streak Feature | Bùi Cao Chinh | 10/05 | Hoàn thành |
| Chuyển APScheduler, dọn Celery legacy | Bùi Cao Chinh | 11/05 | Hoàn thành |
| Ổn định sau đợt thay đổi lớn + smoke test | — | 16/05 | Đang làm |

---

## Brainstorming

### Brainstorm: Nâng cấp scheduling algorithm từ SM-2 sang FSRS — 06/05/2026

**Câu hỏi:** SM-2 có đủ tốt về lâu dài không, hay nên chuyển sang FSRS khi đã có nhiều review history?

**Các ý tưởng:**

- **Giữ nguyên SM-2:** Đơn giản, đã hoạt động ổn trong pilot. Không cần thay đổi khi chưa có benchmark thực tế.
- **Chuyển sang FSRS:** Tốt hơn về mặt lý thuyết khi có đủ dữ liệu. Cần thêm `review_logs`, `scheduler_type`, và metadata như `stability`, `difficulty`, `desired_retention`.
- **Hybrid:** Giữ SM-2 làm mặc định, thêm `scheduler_type` để người dùng chọn — phức tạp hơn cần thiết ở giai đoạn này.

**Kết luận:** Chưa triển khai. Ưu tiên thu thập review logs sạch trước khi benchmark FSRS. Xem xét lại khi có đủ dữ liệu thực tế từ người dùng pilot.

---

### Brainstorm: Thiết kế hệ thống XP và Gamification — 08/05/2026

**Câu hỏi:** Làm thế nào để XP không bị "farm" và thực sự phản ánh tiến độ học?

**Các ý tưởng:**

- **XP cố định mỗi thẻ:** Đơn giản nhưng dễ farm bằng cách bấm nhanh qua nhiều thẻ.
- **XP theo quality của câu trả lời:** Câu đúng chất lượng cao được nhiều XP hơn — phức tạp hơn cần thiết ở giai đoạn này.
- **XP theo session + game:** Study session thưởng `cards_reviewed × 2` XP; game campaign thưởng theo `xp_earned` được tính trong AI campaign.

**Kết luận:** Chọn cách thứ 3 — đơn giản, đủ để tạo động lực, và gắn XP với hành động học thật. Lưu `total_xp` trực tiếp vào `users` table, cộng dồn mỗi session/game.

---

## Rủi ro và bài học quan trọng

### Bảo mật: Rò rỉ dữ liệu giữa người dùng nếu quên filter `user_id` — ghi nhận đợt 20/04 → 26/04

- **Triệu chứng:** Query deck/card nếu không filter theo `user_id` sẽ gây lộ dữ liệu giữa các user.
- **Nguyên nhân gốc:** Auth legacy dựa vào `user_id` truyền qua query/body, không có auth middleware thật sự cho toàn bộ hệ thống.
- **Cách xử lý:**
  - Mọi query multi-tenant phải check ownership.
  - Service layer ưu tiên có helper `_require_owned_*`.
  - Docs và review phải xem đây là invariant bắt buộc, không phải "best effort".
- **Bài học:** Khi pilot chưa chốt auth, isolation theo `user_id` phải được xem là yêu cầu bắt buộc mỗi lần sửa route/service. *(Đã giải quyết hoàn toàn bằng JWT Bearer migration — ADR-17.)*

---

### Infrastructure: Celery Beat không ổn định trên môi trường pilot nhỏ — 10/05/2026

- **Triệu chứng:** Celery Beat container fail liên tục khi deploy, cần hotfix 6 lần trong một ngày mà vẫn không ổn định.
- **Nguyên nhân gốc:** Resource limits của pilot server (2GB RAM) quá chật cho cả stack Celery + Beat + Redis khi có thêm các service khác.
- **Cách xử lý:** Chuyển sang APScheduler nhúng trong backend, bỏ Beat container riêng (ADR-19).
- **Bài học:** Không nên chọn giải pháp "enterprise-grade" cho pilot nhỏ. Giữ stack đơn giản nhất có thể cho đến khi thực sự cần scale.

---

## Template

Xem `docs/templates/WORKLOG.template.md`.
