# Memio — Project Context for AI Agents

> **Read this FIRST** before making any code change. It summarises the product, architecture, file layout, DB schema, API surface, design system, deployment, and known pitfalls so you don't have to explore the codebase from scratch.

> **Product Stage: PILOT (team decision, effective 2026-04-29).**
> Treat this project as a pilot deployment: usable by a controlled group of real users, with known limitations, and prioritized stability/feedback before broad production scale.

## 0. Quick Rehydrate (≤ 60s)

Đọc nhanh phần này khi bạn bị “mất context” và cần tiếp tục flow ngay.

- **Dev (local)**:
  - Backend: `uvicorn src.main:app --reload` → Swagger tại `http://localhost:8000/docs`
  - Frontend: `cd frontend && npm run dev` → `http://localhost:3000`
- **Auth (trạng thái hiện tại)**:
  - **Legacy**: user ở `localStorage` (`flashcard_user`), backend nhận `user_id` qua query/body.
  - **JWT session**: một số route (đặc biệt integrations) dùng Bearer access token + refresh.
- **DB / migrations**:
  - DB: PostgreSQL
  - **Alembic là chuẩn**: `alembic upgrade head` (runtime `create_all()` đã tắt)
- **Deploy (pilot)**:
  - Docker Swarm single-node; deploy qua `scripts/bootstrap.sh` (one-time) + `scripts/redeploy.sh` (hằng ngày)
- **Docs entrypoints**:
  - `README.md` (quickstart + links), `docs/INDEX.md` (docs map), `WORKLOG.md` (ADR), `handoff/SESSION_NOTES.md` (handoff)

## 0.1 Current Invariants (để không drift)

- **Source of truth kỹ thuật/vận hành**: `PROJECT_CONTEXT.md` (file này). Tài liệu khác chỉ link/tóm tắt.
- **Templates**: `docs/templates/*` (không nhúng template lặp ở `JOURNAL.md`/`WORKLOG.md`).
- **Migrations**: thay đổi schema → tạo/áp dụng Alembic; không dựa vào auto-create runtime.
- **Deploy**: pilot deploy theo Swarm + scripts; cập nhật deploy flow thì cập nhật file này trước.
- **Auth**: đang ở giai đoạn chuyển tiếp (legacy + JWT). Khi sửa auth/API, cần ghi rõ “đang áp dụng cho route nào”.

## 0.2 Handoff workflow (ít token)

Nếu không dùng hooks, vẫn có thể chống “mất context” bằng workflow nhẹ:

- Khi kết thúc một đợt làm việc: yêu cầu agent append mục handoff vào `handoff/SESSION_NOTES.md`.
- Template + nguyên tắc tối ưu: xem `handoff/HANDOFF_WORKFLOW.md`.

## 1. Product Overview

**Memio** is an AI-powered flashcard learning platform. Users upload PDF/DOCX/TXT documents, the AI (OpenAI via `langchain-openai`) extracts key concepts and generates flashcards, and users study them with the SM-2 spaced-repetition algorithm.

**Core user flow:**
1. Login (Google OAuth / Username-Password / Guest)
2. Create a Deck (topic) in the Workspace
3. Upload documents → AI generates flashcards → User reviews & edits → Save
4. Study with flip-card UI (rate 0-3) → SM-2 schedules next review
5. View Analytics (streak, heatmap, hardest cards, forgetting rate)
6. Ask Memio Coach for personalized guidance, explanations, quizzes, citations, and next actions
7. Play an AI Adventure Campaign from a deck → answer staged quiz challenges, update SM-2, save score/XP
8. Optionally share decks via public link

**Current product improvement focus (Sprint 1):** Workspace now uses a Daily Mission / best-next-action module instead of a passive summary. It computes the priority deck from due/new cards, shows estimated study time, and routes the primary CTA to create a deck, generate cards, study, or challenge based on the user's state.

**Live domain:** `mem.io.vn` (frontend) / `api.mem.io.vn` (backend)

## 2. Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   Next.js 16    │◄─────►│   FastAPI        │◄─────►│   PostgreSQL     │
│   (Frontend)    │  HTTP │   (Backend)      │  SQL  │   (Remote DB)    │
│   Port 3000     │       │   Port 8000      │       │   Port 5432      │
└────────┬────────┘       └────────┬─────────┘       └──────────────────┘
         │                         │
         │ GIS SDK                 │ OpenAI API
         ▼                         ▼
   Google OAuth             GPT-4o mini
```

- **Monorepo** — backend (`src/`) and frontend (`frontend/`) live in the same repo
- **Auth today is mixed**:
  - **Legacy** flows are client-side localStorage based (`flashcard_user`) and pass identity via `user_id` query/body (no auth header).
  - **JWT session** flows exist for some routes (notably integrations): frontend stores access/refresh tokens and uses Bearer auth.
- **Caddy** serves as reverse proxy in production (auto HTTPS via Let's Encrypt)

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js (App Router, TypeScript) | 16.2.4 |
| **Styling** | Tailwind CSS 3.4 + CSS Variables + `next-themes` | darkMode: `"class"` |
| **UI primitives** | Radix UI (Dialog, Tabs), Lucide icons | — |
| **Backend** | FastAPI (Python) | 0.115+ |
| **ORM** | SQLModel (SQLAlchemy + Pydantic hybrid) | — |
| **Database** | PostgreSQL (remote server) | — |
| **AI** | OpenAI via `langchain-openai` | gpt-4o-mini |
| **Doc parsing** | PyPDFLoader, Docx2txtLoader, TextLoader | — |
| **Containerisation** | Docker Compose + Caddy | Alpine images |
| **Password hashing** | passlib[bcrypt] | — |

## 4. File Structure Map

Only entrypoints / index files are listed. Use Glob/Grep for the rest.

```
A20-App-001/
├── src/                              # BACKEND (FastAPI)
│   ├── main.py                       # App entry: CORS, init_db, mount /api
│   ├── agent/                        # Agent subsystem (runtime + tools); app calls it via services/agent_service.py
│   └── app/
│       ├── api/
│       │   ├── api.py                # Central router (auth/decks/cards/games/coach/etc.)
│       │   └── endpoints/{auth,decks,cards,games,coach}.py
│       ├── core/{config.py, sm2.py}  # Settings + SM-2 algorithm
│       ├── db/session.py             # SQLModel engine, get_session, init_db
│       ├── models/domain.py          # SQLModel tables (see §5)
│       ├── schemas/{user,deck,card,game,coach}.py   # Pydantic DTOs
│       ├── services/                 # Business logic (CRUD + analytics)
│       └── utils/{security,jwt_auth,card_pipeline}.py
├── frontend/                         # FRONTEND (Next.js 16)
│   └── src/
│       ├── app/                      # Routes: page.tsx, login, signup,
│       │                             # workspace, generate, analytics,
│       │                             # study/[deckId], play/[deckId], coach,
│       │                             # deck/[shareToken]
│       ├── components/{AppShell,ThemeProvider,ThemeToggle}.tsx
│       └── lib/app-client.ts         # API client + localStorage auth + offline cache
├── scripts/{deploy.sh, setup_hooks.sh, log_hook.py}
├── db_deploy/                        # Standalone PostgreSQL Docker deploy
├── docker-compose.yml + Caddyfile    # caddy + backend + frontend
├── Dockerfile.backend + Dockerfile.frontend
└── requirements.txt + .env.example
```

## 5. Database Schema (PostgreSQL via SQLModel)

**Tables defined in `src/app/models/domain.py`:**

| Table | Key Columns | Notes |
|---|---|---|
| `users` | `id`, `google_id` (unique), `username` (unique), `password_hash`, `name`, `email`, `photo_url`, `auth_type`, `is_guest` | Supports Google, username/password, and guest auth |
| `decks` | `id`, `user_id` (FK→users), `name`, `description`, `is_public` (int 0/1), `share_token` (unique), `created_at` | Multi-tenant: always filter by `user_id` |
| `flashcards` | `id`, `deck_id` (FK→decks), `front`, `back`, `difficulty`, `source_context`, `created_at` | `source_context` stores original text for citations |
| `progress` | `id`, `user_id` (FK), `card_id` (FK), `interval`, `repetition`, `ease_factor`, `last_quality`, `last_reviewed`, `next_review` | UniqueConstraint on (user_id, card_id) |
| `study_sessions` | `id`, `user_id`, `deck_id`, `session_date`, `cards_reviewed`, `avg_quality` | UniqueConstraint on (user_id, deck_id, session_date) |
| `game_sessions` | `id`, `user_id`, `deck_id`, `mode`, `status`, `campaign_json`, `score`, `xp_earned`, `accuracy`, `total_questions`, `correct_answers`, `started_at`, `completed_at`, `created_at` | Stores AI Adventure Campaign payloads and final score/XP |
| `coach_threads` | `id`, `user_id`, `title`, `context_deck_id`, `created_at`, `updated_at` | Memio Coach conversation threads |
| `coach_messages` | `id`, `thread_id`, `user_id`, `role`, `content`, `citations_json`, `actions_json`, `created_at` | Stored Coach messages, citations, and suggested actions |
| `user_settings` | `id`, `user_id`, `daily_new_limit`, `daily_review_limit`, `timezone` | Per-user study limits and IANA timezone for local-date features |

**Schema is managed via Alembic migrations.**

- Legacy auto-create at runtime has been disabled (see `src/app/db/session.py:init_db()`).
- Apply migrations with `alembic upgrade head`.

## 6. API Endpoints

Base: `/api` (mounted in `src/main.py`)

### Auth (`/api/auth/`)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/login/google` | `{google_id, name, email, photo_url}` | Google OAuth login (upsert) |
| POST | `/login/username` | `{username, password}` | Username/password login |
| POST | `/register` | `{username, password, email?, name?}` | Create account |
| POST | `/login/guest` | `{guest_name?}` | Create guest user |
| POST | `/login` | (same as google) | Backward compat alias |

### Decks (`/api/decks/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/` | `?user_id=N` | List user's decks |
| POST | `/` | `{user_id, name, description}` | Create deck |
| DELETE | `/{deck_id}` | — | Delete deck + its flashcards |
| POST | `/{deck_id}/share` | — | Enable sharing, returns token |
| DELETE | `/{deck_id}/share` | — | Disable sharing |
| GET | `/shared/{token}` | — | Public: get shared deck + cards |
| GET | `/analytics` | `?user_id=N` | Global analytics |

### Cards (`/api/cards/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/{deck_id}` | `?user_id=N` | Get cards with progress (LEFT JOIN) |
| POST | `/{deck_id}/preview` | `files` (multipart), `count` | AI generate → return without saving |
| POST | `/{deck_id}/generate` | `files` (multipart), `count` | AI generate → save to DB |
| POST | `/{deck_id}/bulk_create` | `{cards: [...]}` | Save reviewed preview cards |
| PUT | `/{card_id}` | `{front, back, difficulty}` | Edit a card |
| DELETE | `/{card_id}` | — | Delete card + progress |
| POST | `/progress` | `{user_id, card_id, quality, ease_factor, ...}` | Update SM-2 progress |
| POST | `/session` | `{user_id, deck_id, cards_reviewed, avg_quality}` | Log study session |
| POST | `/explain` | `{front, back, message, source_context?, history[]}` | AI explain card with citations |
| GET | `/{deck_id}/analytics` | `?user_id=N` | Per-deck analytics |

### Games (`/api/games/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| POST | `/campaign/{deck_id}/start` | `{user_id, card_count}` | AI calls OpenAI once to create an Adventure Campaign from deck cards; saves `game_sessions` row |
| POST | `/campaign/{session_id}/complete` | `{user_id, score, xp_earned, accuracy, total_questions, correct_answers}` | Mark campaign complete and persist score/XP |
| GET | `/sessions` | `?user_id=N&limit=10` | List recent game sessions |

### Coach (`/api/coach/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/threads` | `?user_id=N&limit=20` | List Memio Coach threads |
| GET | `/threads/{thread_id}/messages` | `?user_id=N` | List stored messages for a thread |
| POST | `/message` | `{user_id, message, thread_id?, context_deck_id?, mode?}` | Send a message to Memio Coach; returns answer, citations, and suggested actions |
| POST | `/quiz/start` | `{user_id, deck_id?, count}` | Build an inline multiple-choice quiz for Coach chat from weak/due cards |
| POST | `/quiz/summary` | `{user_id, summary, thread_id?, context_deck_id?, actions[]}` | Persist an inline quiz result summary into a Coach thread |

## 7. AI Integration

- **Provider:** OpenAI via `langchain_openai.ChatOpenAI`
- **Model:** `gpt-4o-mini` in `cards.py:get_llm()`
- **API key:** `OPENAI_API_KEY` loaded from environment / `.env`
- **Card generation prompt** (`CARD_PROMPT`): Generates N flashcards as JSON array, auto-detects language, includes `source_context` for citation grounding
- **Explain prompt** (`EXPLAIN_PROMPT`): Tutor-style explanation with `[1]`, `[2]` citation markers + JSON response with `{answer, citations[{id, text, source}]}`
- **Chunked generation:** Documents are split into chunks of 4 pages, each generating 8-30 cards
- **Adventure Campaign prompt** (`CAMPAIGN_PROMPT` in `src/app/api/endpoints/games.py`): Calls OpenAI once at game start, returns a staged multiple-choice campaign with title, premise, final goal, stages, questions, smart distractors, hints, and explanations.
- **Game fallback:** if OpenAI fails during campaign start, backend builds a deterministic fallback campaign from deck cards so the play route can still start.
- **Memio Coach prompt** (`COACH_SYSTEM_PROMPT` in `src/app/services/coach_service.py`): AI study companion that prioritizes internal decks/cards/progress/analytics, uses `source_context` citations, falls back to web search when needed, and returns structured JSON `{answer, citation_ids, actions}`.

## 7.1 Gamification / Adventure Campaign

- **Frontend route:** `frontend/src/app/play/[deckId]/page.tsx`
- **Entry points:** Workspace summary and each deck card expose a `Chơi` action when the deck has at least 2 cards.
- **Backend router:** `src/app/api/endpoints/games.py`, mounted at `/api/games`.
- **Service:** `src/app/services/game_service.py` normalizes AI output, builds fallback campaigns, creates/completes `game_sessions`, and lists sessions.
- **Session storage:** campaign JSON + score/XP/accuracy are persisted in `game_sessions`.
- **Learning integration:** each answer maps to existing SM-2 quality and calls `/api/cards/progress`:
  - correct without hint → quality `3`
  - correct with hint → quality `2`
  - wrong with hint → quality `1`
  - wrong without hint → quality `0`
- **MVP scope:** solo Adventure Campaign only; no multiplayer, public leaderboard, or anti-cheat yet.

## 7.2 Memio Coach

- **UI name:** Memio Coach.
- **Frontend surfaces:** floating panel in `AppShell` (`CoachLauncher`) and full-page route `frontend/src/app/coach/page.tsx`.
- **Proactive launcher:** `CoachLauncher` fetches the user's decks and study summaries to show one non-blocking suggestion before chat is opened, such as create deck, add cards, review due cards, start challenge, or quiz in chat.
- **Shared chat UI:** `frontend/src/components/CoachChat.tsx`.
- **Thread continuity:** when a floating Coach conversation has a `threadId`, the expand button links to `/coach?threadId={id}` and the full Coach page hydrates stored messages with `/api/coach/threads/{thread_id}/messages`. In-progress client-only chat/quiz state is also mirrored in `localStorage` as `memio_coach_draft_{userId}` so expanding the panel can continue an unfinished inline quiz before it has been summarized to the backend.
- **Backend router:** `src/app/api/endpoints/coach.py`, mounted at `/api/coach`.
- **Service:** `src/app/services/coach_service.py`.
- **Memory:** `coach_threads` and `coach_messages` store conversations globally by user, optionally attached to a deck.
- **Context priority:** internal data (decks, flashcards, progress, analytics, weak cards) → `source_context` citations → web search fallback.
- **Web search:** MVP uses DuckDuckGo Instant Answer API opportunistically when the user asks for web/latest/outside-document help; web citations must not override internal data.
- **Inline quiz:** `quiz_in_chat` stays inside the Coach panel/page, uses `/api/coach/quiz/start`, renders multiple-choice questions in chat, updates SM-2 via `/api/cards/progress` on each answer, then persists a score/XP/weak-question summary via `/api/coach/quiz/summary`.
- **Citations:** if the model omits `citation_ids`, backend attaches the most relevant internal card citations as fallback.
- **Action model:** Coach returns suggested actions such as `start_study`, `start_challenge`, `create_cards`, and `quiz_in_chat`. Backend sanitizes all actions against decks owned by the user before returning them. Navigation/challenge actions do not require confirmation; content-changing actions should require confirmation. Prefer `quiz_in_chat` over redirecting when the user is already chatting.
- **Quick actions:** "Hôm nay học gì?", "Quiz tôi", "Giải thích thẻ khó", "Tạo thử thách".

## 8. Frontend Design System

- **Theme:** `next-themes` with `attribute="class"`, `defaultTheme="system"`. CSS vars in `globals.css` under `:root` and `.dark`. Primary = bright blue.
- **Tailwind tokens** (in `tailwind.config.js`): `surface`, `surface-muted`, `surface-raised`, `border-strong`, `success/danger/warning/info/subtle`, `primary-glow`.
- **Color visibility rule (CRITICAL):** `secondary` maps to a very light gray (`#f5f5f5`). **Do NOT use `text-secondary` or `bg-secondary` for text or small icons** — invisible in light mode. Use `primary`, `blue`, `green`, `amber` for high-contrast text/icons.
- **Component patterns:**
  - `AppShell` wraps authenticated pages (sidebar 260px desktop + mobile bottom nav).
  - `ThemeToggle` uses `mounted` state to prevent SSR hydration mismatch.
  - Workspace hero is action-first: the Daily Mission module shows one primary next action, compact supporting stats, and secondary Coach/deck actions.
  - `CoachLauncher` floats above mobile bottom nav (`bottom-24`) and returns to lower-right on desktop (`md:bottom-6`).
  - Cards/buttons use `rounded-2xl`, `border border-border`, `bg-surface-raised`.
  - CTA buttons: `bg-primary` + `shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]`.
- **Auth flow (client-side):** user stored in `localStorage` key `flashcard_user`. Helpers: `getStoredUser()`, `saveStoredUser()`, `clearStoredUser()` in `app-client.ts`. All private pages check `getStoredUser()` in `useEffect` and redirect to `/` if null. Google JWT decoded client-side (`decodeGoogleJwt`) — no server-side validation.
- **Offline support:** `app-client.ts` exposes `cacheCards()`, `getCachedCards()` (24h TTL), `queueProgressUpdate()`, `flushProgressQueue()`, `isOnline()`.

## 9. Deployment

- **Topology:** App server chạy **Docker Swarm single-node** (`caddy` + `backend` + `frontend` + `worker` + `beat` + `redis`); DB server chạy PostgreSQL riêng qua `db_deploy/`.
- **Tiền điều kiện trên server (do user tự cài, KHÔNG nằm trong script):**
  - Docker engine + compose plugin: cài theo https://docs.docker.com/engine/install/ và https://docs.docker.com/compose/install/linux/.
  - User chạy deploy thuộc group `docker`.
- **Pilot deploy flow (server 2GB RAM / 2 vCPU / 30GB SSD):**
  - One-time bootstrap: `sudo bash scripts/bootstrap.sh` — kiểm tra Docker đã có, ghi `/etc/docker/daemon.json` (BuildKit GC `defaultKeepStorage: 8GB` + log rotation `max-size 10m, max-file 3`), bật swap 2GB (`vm.swappiness=10`), mở UFW 80/443, `docker swarm init` nếu chưa init.
  - Mỗi lần deploy hằng ngày: SSH vào server rồi chạy `bash scripts/redeploy.sh` — KHÔNG cần sudo. Flow: pre-check disk, build local image qua `docker compose build backend frontend`, rồi `docker stack deploy -c docker-stack.yml memio`. Swarm tự rolling update theo `update_config` (`start-first` cho stateless, `stop-first` cho `beat`).
  - Wrapper cũ `sudo bash scripts/deploy.sh` vẫn dùng được (tự bootstrap nếu cần rồi gọi redeploy bằng user thường).
- **Files chính:**
  - `docker-compose.yml`: dùng để build local images (`a20-app-001-backend:pilot`, `a20-app-001-frontend:pilot`).
  - `docker-stack.yml`: file deploy cho Swarm — dùng local image tags, cùng `deploy.resources.limits.{memory,cpus}` và `update_config` rolling.
- **Resource limits (đặt trong `docker-stack.yml > deploy.resources.limits`):** `backend 512M/1.0`, `frontend 384M/0.75`, `worker 384M/0.75`, `beat 128M/0.25`, `caddy 128M/0.25`, `redis 128M/0.25`. Tổng ~1.7GB, vừa với RAM 2GB + swap 2GB.
- **Image pipeline hiện tại:** build trực tiếp trên server (không CI/CD). Quy trình: `git pull --ff-only` rồi `bash scripts/redeploy.sh`.

| Service | Image | Port |
|---|---|---|
| `caddy` | caddy:2-alpine | 80, 443 |
| `backend` | Dockerfile.backend (Python 3.11 Alpine) | 8000 |
| `frontend` | Dockerfile.frontend (Node 20 Alpine, multi-stage) | 3000 |

| Env Var | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | API key for OpenAI card generation, explanations, and Adventure Campaign generation |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Yes (build-time) | Backend URL for frontend fetch calls |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `DEFAULT_MODEL` | No | LLM model name (default: gpt-4o-mini) |
| `APP_TIMEZONE` | No | Default IANA timezone for local-date features such as study day, due cards, analytics, and Celery schedules (default: `Asia/Ho_Chi_Minh`) |

## 10. Known Issues & Gotchas

1. **No auth middleware** — `user_id` is passed as a query param/body field. Anyone can impersonate any user. Known prototype-phase limitation.
2. **Alembic is required for schema changes** — Runtime `create_all()` is disabled; run `./.venv/bin/alembic upgrade head` after pulling migrations.
3. **`source_context` column** — Added after initial schema. If production DB was created before, run `ALTER TABLE flashcards ADD COLUMN source_context TEXT;` manually.
4. **OpenAI generation model** — `cards.py:get_llm()` currently hardcodes `gpt-4o-mini` instead of reading `DEFAULT_MODEL`.
5. **`@app.on_event("startup")` is deprecated** in newer FastAPI — should eventually migrate to lifespan.
6. **ThemeToggle hydration** — Must use `mounted` state check to avoid React hydration mismatch (SSR renders without `dark` class).
7. **Google avatar images** — `next/Image` requires `remotePatterns` in `next.config.ts` for `*.googleusercontent.com`. AppShell uses native `<img>` with `onError` fallback instead.
8. **Multi-tenancy** — All deck/card queries MUST filter by `user_id`. WORKLOG documents a past leak where this was missing.
9. **Adventure Campaign migration** — Missing `game_sessions` causes `psycopg2.errors.UndefinedTable`; fix by running `./.venv/bin/alembic upgrade head` to apply `0011_game_sessions`.
10. **Memio Coach migration** — Missing `coach_threads`/`coach_messages` means migration `0012_coach_threads` has not been applied; run `./.venv/bin/alembic upgrade head`.
11. **CORS origins** — Hardcoded in `main.py`: production domains plus local dev origins (`localhost`/`127.0.0.1` on 3000/3001). Add new domains there.
12. **`database.py` at root** — Legacy file, mostly unused. Real DB logic is in `src/app/db/session.py`.

## 11. Development Workflow

```bash
# Backend
source .venv/bin/activate
uvicorn src.main:app --reload          # → http://localhost:8000/docs

# Frontend
cd frontend && npm run dev              # → http://localhost:3000
```

**Key rules:**
- **Python:** always use the project-root `.venv` (`source .venv/bin/activate`) or its absolute binary path.
- **Backend imports** use absolute paths: `from src.app.xxx import yyy`.
- **Frontend imports** mostly relative (`../../lib/app-client`); path aliases exist in `tsconfig.json`.
- **API responses** follow `{"message": "success", ...data}` or `{"decks": [...]}`, `{"cards": [...]}`.
- **Service layer** (`src/app/services/`) holds business logic; endpoints are thin wrappers.
- **Pydantic V2** — use `model_dump()`, NOT `.dict()`.
- **SQLModel** — models use `SQLModel` (for tables) and `BaseModel` from pydantic (for schemas).
