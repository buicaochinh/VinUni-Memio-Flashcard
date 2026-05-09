# Worklog

Ghi lai cac quyet dinh ky thuat, rui ro, va cac moc phat trien quan trong cua du an Memio.

> Nguyen tac cap nhat:
> - Timeline phai bam commit/merge thuc te trong git.
> - ADR danh so duy nhat, khong trung lap.
> - Neu co thay doi kien truc, deploy, auth, schema, hoac AI provider thi cap nhat tai day cung luc.

---

## Timeline thuc te theo git

### Moc nen tang

- `2026-04-02` - `e49dfbd` - root commit: initial setup, starter app, AI logging hooks.
- `2026-04-10` - `13dccb6` - demo dau tien (`first_demo`).
- `2026-04-10` - `94b102d` - merge PR #1 vao `main`.

### Sprint 1 - 02/04 -> 05/04/2026

- Muc tieu: dung repo, chot skeleton, bat logging/hook.
- Moc git:
  - `02/04` - root commit `e49dfbd`.
- Ket qua:
  - Co repo chay duoc va nen tang de nhom tiep tuc mo rong.

### Sprint 2 - 06/04 -> 12/04/2026

- Muc tieu: co demo end-to-end dau tien va on dinh lai sau demo.
- Moc git:
  - `10/04` - `13dccb6` demo dau tien.
  - `10/04` - `94b102d` merge PR #1.
  - `11/04` - loat commit refactor/UI/readme/deploy (`e892cc2`, `d26165d`, `e33c635`, `c145f81`, `cefe4ca`, ...).
  - `11/04` - merge PR #2 (`e39614e`).
- Ket qua:
  - Da co mot luong san pham demo duoc.
  - Bat dau xuat hien nhu cau tach ro demo artifact va kien truc that.

### Sprint 3 - 13/04 -> 19/04/2026

- Muc tieu: chuan hoa cach deploy va dieu chinh huong AI/UI.
- Moc git:
  - `14/04` - bo sung/cap nhat hook va agent rules (`8c599bb`, `45b8da0`, `573c390`).
  - `16/04` - merge PR #5, #6, #7 lien quan deployment/db/script (`e1cd2a6`, `93574f9`, `776a57c`).
  - `18/04 -> 19/04` - doi huong provider + UI (`bdb5d8b`, `4426435`).
  - `19/04` - merge PR #8 va #9 (`b350b85`, `196bc01`).
- Ket qua:
  - Deployment method bang Caddy + Docker duoc dinh hinh ro hon.
  - Bat dau co quyet dinh o muc provider/model thay vi chi sua prompt.

### Sprint 4 - 20/04 -> 26/04/2026

- Muc tieu: cung co data model, giam loi multi-tenancy, nang cap UX hoc tap.
- Moc git:
  - `20/04` - merge PR #10, #11; cap nhat SQL ORM, deploy, env (`4d48bb7`, `7ac3ccb`, `08283f7`, `967ea6b`).
  - `21/04` - merge PR #12 -> #28; chatbot, explain, survey, worklog, diagrams, dark mode, AppShell, theme provider/tokens.
  - `22/04` - merge PR #29 -> #36; tiep tuc worklog, parsing, login attributes, requirement updates.
  - `23/04` - `6cd55dc` hotfix login.
  - `25/04` - dark theme fixes, merge PR #37 (`e87990d`).
  - `26/04` - dot cap nhat lon ve frontend, analytics, login/signup, AppShell, agents instructions.
- Ket qua:
  - Study/chat/explain flow duoc day manh.
  - Theme system va shell frontend duoc hinh thanh ro.
  - Rui ro multi-tenancy bat dau duoc ghi nhan ro trong docs/worklog.

### Sprint 5 - 27/04 -> 03/05/2026

- Muc tieu: dua du an sang trang thai pilot, chuan hoa migrations, docs, deploy, integrations.
- Moc git:
  - `27/04` - dua Alembic, auth JWT/session, integrations Telegram, worker, handoff vao repo; merge PR #38 (`dfaf8a1`).
  - `28/04` - merge PR #39 -> #44; migrations `0002` -> `0006`, route integrations, docs folder, adaptive card pipeline.
  - `29/04` - merge PR #45 -> #47; them `docker-stack.yml`, `bootstrap.sh`, `redeploy.sh`, toi uu deploy pilot.
  - `30/04` - merge PR #48 -> #52; upgrade UI, fix redeploy, move docs, chatbot update.
  - `04/05` - merge PR #53 -> #61; docs refactor, ingestion module, Telegram QR, i18n integrations.
- Ket qua:
  - Du an chuyen sang pilot deployment model.
  - `PROJECT_CONTEXT.md`, `docs/INDEX.md`, handoff workflow, docs folder duoc chuan hoa.
  - Ingestion/integrations tro thanh mot nhanh chuc nang ro rieng.

### Sprint 6 - 05/05 -> 09/05/2026

- Muc tieu: bo sung learning loop, Notion flow, timezone, coach, game, va docs product improvement.
- Moc git:
  - `05/05` - merge PR #62; gioi han daily study + user settings (`7c6b2a4`).
  - `05/05` - merge PR #63 -> #69; Notion integration MVP, UX import deck tu Notion, fonts/workspace updates.
  - `06/05` - merge PR #70, #71; user-level timezone, hook JSON fix, study tutor/settings/auth fixes.
  - `07/05` - merge PR #72; docs OpenAI provider.
  - `07/05` - merge PR #73; game sessions / play route / campaign flow.
  - `07/05` - merge PR #74; Memio Coach end-to-end.
  - `08/05` - merge PR #75; docs sprint plan/execution/PRD cho product improvement.
  - `08/05` - `3dbb160` update diagrams.
  - `09/05` - merge PR #82; he thong XP (`0015_user_xp`), service, va UI users (`d63214b`).
  - `09/05` - merge PR #83; cap nhat UI Image Flashcard (`19ad85f`).
  - `09/05` - fix `scripts/log_hook.py` ho tro `antigravity` tool (`de79015`).
- Ket qua:
  - He thong da co them 3 tru cot moi: daily limits/settings, game loop, coach loop.
  - He thong XP da san sang: thuong XP cho study session va game.
  - Hook logging da on dinh cho moi tool AI (Claude, Cursor, Gemini, Antigravity).
  - Docs san pham va docs ky thuat da bieu dien dung hon trang thai hien tai.



---

## ADR va quyet dinh ky thuat

### [ADR-1] Dung FastAPI + Next.js trong cung mot monorepo - 02/04/2026

- Boi canh: can len MVP nhanh, backend va frontend can di cung nhau.
- Quyet dinh: dat backend trong `src/`, frontend trong `frontend/`, quan ly chung trong mot repo.
- He qua: de ship nhanh va dong bo schema/API, nhung docs va context phai ro de tranh drift.

### [ADR-2] Chon SM-2 lam scheduler ban dau - truoc 10/04/2026

- Boi canh: can co spaced repetition som de demo duoc luong hoc.
- Quyet dinh: dung SM-2 vi don gian, de implement va de debug.
- He qua: du hop pilot, nhung ve sau co the can scheduler tot hon khi co du review history.

### [ADR-3] Dieu chinh AI provider trong giai doan 18/04 -> 19/04 - 19/04/2026

- Boi canh: nhom thu nghiem thay doi provider/model de cai thien card generation va reasoning.
- Bang chung git:
  - `d8b23c4` update OpenRouter API key
  - `bdb5d8b` update change to anthropic
  - `f50c226` update model api key
- Quyet dinh: giai doan nay he thong tam thoi chuyen huong sang Anthropic/OpenRouter de thu nghiem.
- He qua: docs va config trong giai doan sau can duoc lam sach lai de phan biet "thu nghiem provider" va "provider dang dung that".

### [ADR-4] Tich hop citations cho luong Explain - 21/04/2026

- Boi canh: nguoi dung can biet AI lay thong tin giai thich tu dau.
- Bang chung git:
  - `6c56354` update explain button
  - cac merge PR ngay `21/04` cho chatbot/explain/worklog/diagram
- Quyet dinh: giu `source_context` tren flashcard va day explain flow theo huong co trich dan.
- He qua: schema va prompt AI phai mang theo context; frontend can xu ly phan hien thi/citation UX.

### [ADR-5] Trien khai dark mode bang `next-themes` + CSS variables - 21/04/2026

- Boi canh: sau dot UI update, can mot cach theming dong bo toan app thay vi sua tung component.
- Bang chung git:
  - `54a21af` add theme toggle
  - `8c3e22a` add theme provider
  - `893dfd4` tailwind update
  - `1db4ffb` feat: update dark theme
- Quyet dinh: dung `next-themes`, `darkMode: "class"`, va color tokens qua CSS variables.
- He qua: can tranh dung mau low-contrast sai quy uoc, va phai xu ly hydration cho `ThemeToggle`.

### [ADR-6] Chuan hoa migrations bang Alembic, khong dua vao runtime create_all - 27/04/2026

- Boi canh: schema da bat dau phinh to voi auth sessions, integrations, workers, game, coach.
- Bang chung git:
  - `9465969` add `alembic.ini`
  - `05ea14c` add `alembic/`
  - chuoi migrations `0002` -> `0012`
- Quyet dinh: schema thay doi phai qua Alembic; runtime auto-create khong con la source of truth.
- He qua: moi thay doi DB can co migration di kem va docs phai nhac ro lenh `alembic upgrade head`.

### [ADR-7] Chon Docker Swarm single-node cho pilot deploy - 29/04/2026

- Boi canh: can pilot deploy on dinh hon Compose thuan, nhung ha tang van don gian.
- Bang chung git:
  - `6712c14` add `docker-stack.yml`
  - `743c9fe` add `scripts/bootstrap.sh`
  - `34dd52b` add `scripts/redeploy.sh`
- Quyet dinh: dung Docker Swarm single-node de co rolling deploy co kiem soat; Compose dung de build image.
- He qua: can bootstrap server, can quy uoc image/tag ro, va docs deploy phai day du.

### [ADR-8] Dung local images + retag theo deploy ID de ep rollout - 29/04/2026

- Boi canh: build image tren server, khong co registry trung gian.
- Bang chung git:
  - cac cap nhat `scripts/redeploy.sh` ngay `29/04` va `30/04`
- Quyet dinh: retag image theo `DEPLOY_ID` trong redeploy flow de Swarm rollout that su.
- He qua: ton nhieu image hon, doi lai trace deploy ro hon va tranh tinh trang "deploy xong nhung container khong doi".

### [ADR-9] Them disk pre-check va cleanup co nguong trong redeploy - 29/04/2026

- Boi canh: pilot server nho, de het disk khi build image lien tuc.
- Quyet dinh: pre-check disk, prune khi xuong duoi nguong an toan truoc khi build.
- He qua: giam nguy co fail deploy vi het dung luong, nhung co the lam mat cache build mot phan.

### [ADR-10] Caddy lam reverse proxy theo domain tach frontend/backend - 29/04/2026

- Boi canh: can HTTPS tu dong va route ro rang cho `mem.io.vn` va `api.mem.io.vn`.
- Quyet dinh: dung Caddy lam reverse proxy theo domain.
- He qua: DNS/CORS/domain config phai dong bo; deploy don gian hon so voi tu quan ly TLS thu cong.

### [ADR-11] `PROJECT_CONTEXT.md` tro thanh source of truth ky thuat/van hanh - 29/04/2026

- Boi canh: repo chuyen nhanh, co backend, frontend, deploy, worker, integrations, docs.
- Bang chung git:
  - `a00a750`, `bf6cb97`, `19e1614`, `775edd3`, `5206ace`, `7fd35c9`
- Quyet dinh: `PROJECT_CONTEXT.md` la tai lieu can doc dau tien; `docs/diagrams.md`, `docs/INDEX.md`, handoff docs phai dong bo voi file nay.
- He qua: moi thay doi kien truc/API/deploy/schema phai cap nhat docs ngay, neu khong se drift rat nhanh.

### [ADR-12] Giu auth o trang thai chuyen tiep: legacy `user_id` + JWT session cho mot so route - 27/04/2026

- Boi canh: san pham dang o pilot, trong khi integrations can auth chac chan hon som hon phan con lai.
- Quyet dinh: chap nhan mo hinh auth hon hop trong giai doan chuyen tiep.
- He qua: can ghi ro route nao dung Bearer auth, route nao van dung `user_id`; rui ro impersonation van ton tai o legacy flows.

### [ADR-13] Them ingestion va integrations nhu mot module rieng - 04/05/2026

- Boi canh: can dong bo hoc tap voi nguon ngoai va chatbot/integration surfaces.
- Bang chung git:
  - `73cf63a` add ingestion module tables
  - PR #54 -> #61
- Quyet dinh: tao nhom tables/services/routes rieng cho ingestion/integrations thay vi nhung vao card service cu.
- He qua: he thong ro ranh gioi hon, nhung docs va migration complexity tang len.

### [ADR-14] Ap dung user-level study limits va timezone - 05/05 -> 06/05/2026

- Boi canh: can lam Daily Mission va daily queue dung theo nguoi dung, khong chi theo server time.
- Bang chung git:
  - `e3fffdb` migration `0008_add_daily_limits`
  - `c81ab98` them users endpoint cho settings
  - `e32fa50` add user-level timezone handling
- Quyet dinh: gioi han new/review va timezone duoc dat theo user.
- He qua: cac tinh toan queue, analytics, va local-day features phai dua tren timezone cua user.

### [ADR-15] Chot OpenAI la provider chinh hien tai - 07/05/2026

- Boi canh: sau giai doan thu nghiem provider, tai lieu va implementation hien tai da quay ve OpenAI.
- Bang chung git:
  - `d8c6397` update OpenAI provider documentation
  - `ca0bae1` merge PR #72
  - `PROJECT_CONTEXT.md` hien tai xac dinh `langchain_openai.ChatOpenAI` + `gpt-4o-mini`
- Quyet dinh: OpenAI la provider AI chinh cho card generation, explain, campaign, coach trong trang thai hien tai.
- He qua: docs, `.env.example`, loi huong dan van hanh, va cac assumptions ky thuat phai phan anh OpenAI la source of truth hien tai.

### [ADR-16] Them game loop Adventure Campaign - 07/05/2026

- Boi canh: can tang engagement va tao mot learning surface khac study mode thong thuong.
- Bang chung git:
  - `149d036` migration `0011_game_sessions`
  - `f3307d2` play route
  - `c852595` games endpoint
  - `e41838c` game service
- Quyet dinh: game campaign duoc tao mot lan khi start, luu vao `game_sessions`, va map ket qua nguoc ve SM-2 quality.
- He qua: can fallback campaign khi OpenAI loi; game tro thanh mot phan cua learning loop, khong chi la mini-game tach biet.

### [ADR-17] Them Memio Coach nhu lop dieu phoi hoc tap - 07/05/2026

- Boi canh: can mot giao dien hoi dap/chu dong de noi decks, progress, quiz, challenge, va guidance.
- Bang chung git:
  - `990dae0` migration `0012_coach_threads`
  - `f5dbe12` coach page
  - `4752d08` `CoachChat`
  - `d3ed9c7` `CoachLauncher`
  - `1576fb0` coach endpoint
  - `af65314` coach service
- Quyet dinh: Coach duoc xay nhu mot subsystem rieng co thread/messages, context noi bo uu tien cao hon web fallback.
- He qua: can quan ly citations, actions, va thread continuity; backend phai sanitize action theo quyen so huu deck/user.

### [Future Feature] Can nhac nang cap scheduler tu SM-2 sang FSRS - 06/05/2026

- Boi canh: SM-2 du hop pilot nhung khong toi uu khi da co nhieu lich su review.
- Y tuong:
  - bo sung `review_logs`
  - them `scheduler_type`
  - luu them metadata nhu `stability`, `difficulty`, `desired_retention`
- Huong di:
  - chua thay ngay trong pilot
  - uu tien thu thap review logs sach truoc khi benchmark FSRS

---

## Rui ro va bai hoc quan trong

### Bao mat: ro ri du lieu neu quen filter `user_id` - ghi nhan ro trong dot 20/04 -> 26/04

- Trieu chung: query deck/card neu khong filter theo `user_id` se gay lo du lieu giua users.
- Nguyen nhan goc: auth legacy dua vao `user_id` query/body, khong co auth middleware that su cho toan bo he thong.
- Cach xu ly:
  - moi query multi-tenant phai check ownership
  - service layer uu tien co helper `_require_owned_*`
  - docs va review phai xem day la invariant, khong phai "best effort"
- Bai hoc: khi pilot chua chot auth, isolation theo `user_id` phai duoc xem la yeu cau bat buoc moi lan sua route/service.

---

## Template

Xem `docs/templates/WORKLOG.template.md`.
