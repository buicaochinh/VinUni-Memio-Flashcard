# Memio — Project Context for AI Agents

> **Read this FIRST** before making any code change. It summarises the product, architecture, file layout, DB schema, API surface, design system, deployment, and known pitfalls so you don't have to explore the codebase from scratch.

> **Product Stage: PILOT (team decision, effective 2026-04-29).**
> Treat this project as a pilot deployment: usable by a controlled group of real users, with known limitations, and prioritized stability/feedback before broad production scale.

## 0. Quick Rehydrate (≤ 60s)

Đọc nhanh phần này khi bạn bị “mất context” và cần tiếp tục flow ngay.

- **Dev (local)**:
  - Backend: `uvicorn src.main:app --reload` → Swagger tại `http://localhost:8000/docs`
  - Frontend: `cd frontend && npm run dev` → `http://localhost:3000`
- **Auth (đã migrate sang JWT Bearer — 2026-05-09)**:
  - Tất cả protected endpoints dùng `Depends(get_current_user_id)` từ `src/app/api/deps.py`.
  - Frontend dùng `authFetch()` (tự gắn Bearer token, tự refresh on 401).
  - Public (không cần auth): `GET /decks/shared/{token}`, tất cả `/auth/*`, Telegram webhook.
- **DB / migrations**:
  - DB: PostgreSQL
  - **Alembic là chuẩn**: `alembic upgrade head` (runtime `create_all()` đã tắt)
  - Latest migration: `0015_user_xp` (thêm `total_xp` vào `users`)
- **Health check**: `GET /health` → `{"status": "ok"}` (used by Docker HEALTHCHECK)
- **Deploy (pilot)**:
  - Docker Swarm single-node; deploy qua `scripts/bootstrap.sh` (one-time) + `scripts/redeploy.sh` (hằng ngày)
- **Docs entrypoints**:
  - `README.md` (quickstart + links), `docs/INDEX.md` (docs map), `WORKLOG.md` (ADR), `handoff/SESSION_NOTES.md` (handoff)

## 0.1 Current Invariants (để không drift)

- **Source of truth kỹ thuật/vận hành**: `PROJECT_CONTEXT.md` (file này). Tài liệu khác chỉ link/tóm tắt.
- **Templates**: `docs/templates/*` (không nhúng template lặp ở `JOURNAL.md`/`WORKLOG.md`).
- **Migrations**: thay đổi schema → tạo/áp dụng Alembic; không dựa vào auto-create runtime.
- **Deploy**: pilot deploy theo Swarm + scripts; cập nhật deploy flow thì cập nhật file này trước.
- **Auth**: đã migrate hoàn toàn sang JWT Bearer (2026-05-09). Mọi endpoint mới phải dùng `Depends(get_current_user_id)`, không truyền `user_id` qua query/body.

## 0.2 AI Logging (Mandatory)
- **Hook mechanism**: Every AI tool (Claude Code, Cursor, Gemini, Antigravity) is configured to call `scripts/log_hook.py`.
- **Antigravity support**: As Antigravity lacks a programmatic hook system, it is manually triggered at the end of each task using `AI_TOOL_NAME=antigravity`.
- **Auto-scan**: Use `python3 scripts/log_antigravity.py --auto` to sync any missed sessions.
- **Log location**: `.ai-log/session.jsonl` (gitignored, submitted via pre-push hook).



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
8. Create visual "Đuổi Hình Bắt Chữ" cards from documents or add DALL-E 3 images to existing visual cards
9. Optionally share decks via public link

**Current product improvement focus (Sprint 6):** Memio now supports exam goals per deck. Workspace can prioritize deadline-aware study plans, and Memio Coach receives learning goal context so it can answer planning questions such as whether the learner can finish before an exam date.

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
- **Auth (fully JWT Bearer as of 2026-05-09)**:
  - All protected endpoints use `Depends(get_current_user_id)` — identity extracted from Bearer token server-side.
  - Frontend uses `authFetch()` for all protected calls (auto-attaches Bearer token, auto-refresh on 401).
  - Tokens stored in `localStorage` key `flashcard_tokens`; user info in `flashcard_user`.
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
│       └── utils/{security,jwt_auth,card_pipeline,image_generator}.py
├── frontend/                         # FRONTEND (Next.js 16)
│   └── src/
│       ├── app/                      # Routes: page.tsx, login, signup,
│       │                             # workspace, generate, analytics,
│       │                             # study/[deckId], play/[deckId], coach, images,
│       │                             # generate/images,
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
| `users` | `id`, `google_id` (unique), `username` (unique), `password_hash`, `name`, `email`, `photo_url`, `auth_type`, `is_guest`, `total_xp` (int, default 0) | Supports Google, username/password, and guest auth. `total_xp` accumulates from study sessions and games. |
| `decks` | `id`, `user_id` (FK→users), `name`, `description`, `is_public` (int 0/1), `share_token` (unique), `created_at` | Multi-tenant: always filter by `user_id` |
| `flashcards` | `id`, `deck_id` (FK→decks), `front`, `back`, `difficulty`, `source_context`, `image_type`, `image_url`, `diagram_spec`, `created_at` | `source_context` stores original text for citations; image fields support Đuổi Hình / DALL-E cards |
| `progress` | `id`, `user_id` (FK), `card_id` (FK), `interval`, `repetition`, `ease_factor`, `last_quality`, `last_reviewed`, `next_review` | UniqueConstraint on (user_id, card_id) |
| `study_sessions` | `id`, `user_id`, `deck_id`, `session_date`, `cards_reviewed`, `avg_quality` | UniqueConstraint on (user_id, deck_id, session_date) |
| `game_sessions` | `id`, `user_id`, `deck_id`, `mode`, `status`, `campaign_json`, `score`, `xp_earned`, `accuracy`, `total_questions`, `correct_answers`, `started_at`, `completed_at`, `created_at` | Stores AI Adventure Campaign payloads and final score/XP |
| `coach_threads` | `id`, `user_id`, `title`, `context_deck_id`, `created_at`, `updated_at` | Memio Coach conversation threads |
| `coach_messages` | `id`, `thread_id`, `user_id`, `role`, `content`, `citations_json`, `actions_json`, `created_at` | Stored Coach messages, citations, and suggested actions |
| `user_settings` | `id`, `user_id`, `daily_new_limit`, `daily_review_limit`, `timezone` | Per-user study limits and IANA timezone for local-date features |
| `learning_goals` | `id`, `user_id`, `deck_id`, `goal_type`, `target_date`, `desired_mastery`, `daily_workload`, `status`, `created_at`, `updated_at` | Exam/deadline goals per deck; unique on `(user_id, deck_id)` |

**Schema is managed via Alembic migrations. Latest: `0015_user_xp`.**

- Legacy auto-create at runtime has been disabled (see `src/app/db/session.py:init_db()`).
- Apply migrations with `./.venv/bin/alembic upgrade head`.
- Migration history: 0001 baseline → … → 0014 learning_goals → 0015 user_xp.

## 6. API Endpoints

Base: `/api` (mounted in `src/main.py`)

> **Auth convention (2026-05-09+):** All protected endpoints use `Depends(get_current_user_id)` — no `user_id` in query params or body. Frontend uses `authFetch()`. Params tables below show the JWT-migrated signatures.

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
| GET | `/` | — | List user's decks (user from JWT) |
| POST | `/` | `{name, description}` | Create deck |
| DELETE | `/{deck_id}` | — | Delete deck + its flashcards (ownership checked) |
| POST | `/{deck_id}/share` | — | Enable sharing, returns token (ownership checked) |
| DELETE | `/{deck_id}/share` | — | Disable sharing (ownership checked) |
| GET | `/shared/{token}` | — | **Public** (no auth): get shared deck + cards |
| GET | `/analytics` | — | Global analytics for current user |

### Cards (`/api/cards/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/{deck_id}` | — | Get cards with progress (LEFT JOIN) |
| POST | `/{deck_id}/preview` | `files` (multipart), `count` | AI generate → return without saving |
| POST | `/{deck_id}/generate` | `files` (multipart), `count` | AI generate → save to DB |
| POST | `/{deck_id}/generate_image_cards` | `files` (multipart), `count` | AI selects visual concepts → DALL-E images/diagram specs → save visual cards |
| POST | `/{deck_id}/generate_images` | — | Classify existing cards and generate missing DALL-E images for visual cards |
| POST | `/{deck_id}/bulk_create` | `{cards: [...]}` | Save reviewed preview cards |
| PUT | `/{card_id}` | `{front, back, difficulty}` | Edit a card |
| DELETE | `/{card_id}` | — | Delete card + progress |
| POST | `/progress` | `{card_id, quality, ease_factor, ...}` | Update SM-2 progress |
| POST | `/session` | `{deck_id, cards_reviewed, avg_quality}` | Log study session → awards XP, returns `{xp_earned, total_xp}` |
| POST | `/explain` | `{front, back, message, source_context?, history[]}` | AI explain card with citations |
| GET | `/{deck_id}/analytics` | — | Per-deck analytics |

### Games (`/api/games/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| POST | `/campaign/{deck_id}/start` | `{card_count}` | AI creates Adventure Campaign from deck cards; saves `game_sessions` row |
| POST | `/campaign/{session_id}/complete` | `{score, xp_earned, accuracy, total_questions, correct_answers}` | Mark campaign complete, persist score/XP, **add xp_earned to user's total_xp** |
| GET | `/sessions` | `?limit=10` | List recent game sessions for current user |

### Users (`/api/users/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/me/settings` | — | Get daily limits and timezone |
| PUT | `/me/settings` | `{daily_new_limit, daily_review_limit, timezone?}` | Update study limits |
| PATCH | `/me/settings/timezone` | `{timezone}` | Update timezone only |
| GET | `/me/xp` | — | Get XP and level info: `{total_xp, level, level_name, xp_in_level, xp_to_next, progress_pct, is_max_level}` |

### Coach (`/api/coach/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/threads` | `?limit=20` | List Memio Coach threads |
| GET | `/threads/{thread_id}/messages` | — | List stored messages for a thread |
| GET | `/learning-intelligence` | `?limit=4` | Return weak concept clusters computed from flashcards + progress |
| POST | `/message` | `{message, thread_id?, context_deck_id?, mode?}` | Send a message to Memio Coach; returns answer, citations, and suggested actions |
| POST | `/quiz/start` | `{deck_id?, card_ids?, count}` | Build an inline multiple-choice quiz for Coach chat |
| POST | `/quiz/summary` | `{summary, thread_id?, context_deck_id?, actions[]}` | Persist an inline quiz result summary into a Coach thread |

### Learning Goals (`/api/goals/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/` | — | List active exam/deadline goals with workload estimates |
| POST | `/` | `{deck_id, target_date, desired_mastery, daily_workload}` | Create/update the exam goal for a deck |
| DELETE | `/{goal_id}` | — | Delete a learning goal |
| GET | `/notification-strategy` | — | Spec-only notification strategy for reminders, quiet hours, and future channels |

### Notifications (`/api/notifications/`)
| Method | Path | Params/Body | Description |
|---|---|---|---|
| GET | `/me/notifications` | — | Return due-card / streak-risk / exam-urgency alerts for current user |
| POST | `/trigger` | header `x-cron-secret` | Send Telegram notifications to all linked users (cron endpoint); guarded by `CRON_SECRET` env var |

## 7. AI Integration

- **Provider:** OpenAI via `langchain_openai.ChatOpenAI`
- **Model:** `gpt-4o-mini` in `cards.py:get_llm()`
- **API key:** `OPENAI_API_KEY` loaded from environment / `.env`
- **Card generation prompt** (`CARD_PROMPT`): Generates N flashcards as JSON array, auto-detects language, includes `source_context` for citation grounding
- **Visual card prompt** (`IMAGE_CARD_PROMPT` in `src/app/api/endpoints/cards.py`): Generates "Đuổi Hình Bắt Chữ" cards from documents, classifies each as `real_image` or `diagram`, and creates an `image_prompt`.
- **Image generation:** `src/app/utils/image_generator.py` calls DALL-E 3 for `real_image` cards, downloads temporary image URLs immediately, and stores permanent files under `frontend/public/generated-images/{uuid}.png`. DB stores the relative URL `/generated-images/{uuid}.png`.
- **Image feature flag:** `OPENAI_IMAGE_ENABLED` can disable DALL-E generation while still allowing visual card creation/diagram metadata.
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
- **XP persistence:** when a campaign completes, `xp_earned` is added to `users.total_xp` via `xp_service.award_xp()`. Study sessions also award `cards_reviewed * 2` XP. Level system (10 levels) defined in `src/app/services/xp_service.py`.
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
- **Learning Intelligence (Semantic Clustering):** `GET /api/coach/learning-intelligence` computes weak concept clusters. Cards are scored by `last_quality`, `ease_factor`, repetition, and difficulty. Grouping uses **OpenAI `text-embedding-3-small` embeddings + greedy cosine similarity clustering** (threshold 0.70) — cards with semantic similarity > threshold join the same cluster. Cluster label = front of the card nearest to centroid (no extra LLM call). Falls back to token-frequency grouping when `OPENAI_API_KEY` is absent or embedding call fails. `numpy>=1.26` required.
- **Workspace weak clusters:** the Daily Mission area shows the top weak concept clusters. Users can ask Coach to explain a cluster or start an inline quiz scoped to cluster card ids.
- **Quiz citations:** `build_inline_quiz` returns `source_context` per question. CoachChat renders a "Nguồn tham chiếu" block (emerald styling) below the explanation after the user answers.
- **Exam goals:** `learning_goals` stores one active exam/deadline goal per deck. Workspace deck cards can create a goal inline, the Daily Mission prioritizes urgent goals, and Coach receives goal/workload/readiness context via `build_context`.
- **Notifications:** `notification_service.py` computes due-card / streak-risk / exam-urgency alerts and delivers via Telegram (`ChatIntegration` model, dedup via `sent_today_date`). In-app bell icon in header shows alerts; clicking dismisses client-side. Cron endpoint `POST /api/notifications/trigger` (guarded by `CRON_SECRET`) triggers bulk delivery.
- **Citations:** if the model omits `citation_ids`, backend attaches the most relevant internal card citations as fallback.
- **Action model:** Coach returns suggested actions such as `start_study`, `start_challenge`, `create_cards`, and `quiz_in_chat`. Backend sanitizes all actions against decks owned by the user before returning them.
- **Quick actions:** "Hôm nay học gì?", "Quiz tôi", "Giải thích thẻ khó", "Tạo thử thách".

## 7.3 Image Flashcards / Đuổi Hình Bắt Chữ

- **Product scope:** Pro-style visual flashcards. User uploads PDF/DOCX/TXT, AI chooses concepts that can be vividly illustrated, and saves picture-to-word cards into a selected deck.
- **Frontend routes:**
  - `frontend/src/app/images/page.tsx`: upload documents, select deck, choose 5-20 cards, generate visual cards.
  - `frontend/src/app/generate/images/page.tsx`: add missing DALL-E images to existing cards in a deck.
  - Study route renders `card.image_url` on the front side when available.
- **Backend endpoints:** `POST /api/cards/{deck_id}/generate_image_cards` and `POST /api/cards/{deck_id}/generate_images`.
- **Data model:** `Flashcard.image_type` is `"real_image"` or `"diagram"`; `image_url` stores generated static image paths; `diagram_spec` stores future diagram renderer specs.
- **Cost behavior:** DALL-E 3 is called only for `real_image` cards and is limited with an async semaphore of 3. UI shows estimated cost at roughly `$0.04` per image.
- **Docs:** detailed implementation notes live in `docs/image-flashcard-feature.md`.

## 8. Frontend Design System

- **Theme:** `next-themes` with `attribute="class"`, `defaultTheme="system"`. CSS vars in `globals.css` under `:root` and `.dark`. Primary = bright blue.
- **Tailwind tokens** (in `tailwind.config.js`): `surface`, `surface-muted`, `surface-raised`, `border-strong`, `success/danger/warning/info/subtle`, `primary-glow`.
- **Color visibility rule (CRITICAL):** `secondary` maps to a very light gray (`#f5f5f5`). **Do NOT use `text-secondary` or `bg-secondary` for text or small icons** — invisible in light mode. Use `primary`, `blue`, `green`, `amber` for high-contrast text/icons.
- **Component patterns:**
  - `AppShell` wraps authenticated pages. Desktop: collapsible sidebar (280px expanded / 72px icon-only collapsed), toggled via a button on the right border; state persisted in `localStorage("sidebar_collapsed")`; uses lazy `useState` initializer + `transitionReady` flag to prevent animation flash on navigation. Mobile: bottom nav bar. Top sticky header (h-14) contains: left = page title (desktop) / logo (mobile); right = notification bell, settings icon, ThemeToggle.
  - Notification bell in header fetches `GET /api/notifications/me/notifications`; shows badge count; dropdown dismisses individual alerts client-side.
  - `/settings` page (replaces removed `UserSettingsModal`) — daily new/review limit sliders, timezone dropdown, Telegram notification info.
  - Daily Mission card shows streak badge 🔥 (from `fetchAnalytics()`) alongside the eyebrow label when streak > 0.
  - `ThemeToggle` uses `mounted` state to prevent SSR hydration mismatch.
  - Workspace hero is action-first: the Daily Mission module shows one primary next action, compact supporting stats, and secondary Coach/deck actions.
  - `CoachLauncher` floats above mobile bottom nav (`bottom-24`) and returns to lower-right on desktop (`md:bottom-6`).
  - Study cards display a generated image above the question when `image_url` is present.
  - Cards/buttons use `rounded-2xl`, `border border-border`, `bg-surface-raised`.
  - CTA buttons: `bg-primary` + `shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]`.
- **Auth flow (client-side):** user info stored in `localStorage` key `flashcard_user`; tokens (access + refresh) in `flashcard_tokens`. Helpers: `getStoredUser()`, `saveStoredUser()`, `clearStoredUser()`, `authFetch()` in `app-client.ts`. All private pages check `getStoredUser()` in `useEffect` and redirect to `/` if null. `authFetch()` auto-attaches `Authorization: Bearer {access_token}` and retries with refresh token on 401. Google JWT decoded client-side (`decodeGoogleJwt`) — no server-side validation of Google credential.
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
| `backend` | Dockerfile.backend (Python 3.11 Alpine, multi-stage, non-root user, HEALTHCHECK) | 8000 |
| `frontend` | Dockerfile.frontend (Node 20 Alpine, multi-stage) | 3000 |

| Env Var | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | API key for OpenAI card generation, explanations, Adventure Campaign, and semantic clustering embeddings |
| `OPENAI_IMAGE_ENABLED` | No | Feature flag for DALL-E image generation; set `false` to skip paid image generation |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Yes (build-time) | Backend URL for frontend fetch calls |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `DEFAULT_MODEL` | No | LLM model name (default: gpt-4o-mini) |
| `APP_TIMEZONE` | No | Default IANA timezone for local-date features such as study day, due cards, analytics, and Celery schedules (default: `Asia/Ho_Chi_Minh`) |
| `CRON_SECRET` | No | Secret header value for `POST /api/notifications/trigger`; if empty, endpoint is open |
| `APP_URL` | No | Base URL of the deployed app (default: `https://mem.io.vn`); used in Telegram notification links |

## 10. Known Issues & Gotchas

1. ~~**No auth middleware**~~ — **Resolved 2026-05-09.** All endpoints now use `Depends(get_current_user_id)`.
2. ~~**OpenAI generation model hardcoded**~~ — **Resolved 2026-05-10.** `cards.py:get_llm()` now reads `DEFAULT_MODEL` from `src/app/core/config.py`.
3. ~~**`@app.on_event("startup")` deprecated**~~ — **Resolved 2026-05-10.** `main.py` now uses FastAPI `lifespan` context manager.
4. ~~**Google avatar `<img>` fallback**~~ — **Resolved.** `next.config.ts` has `remotePatterns` for `*.googleusercontent.com`; AppShell uses `next/Image` with `onError` fallback.
5. ~~**`database.py` at root**~~ — **Resolved.** File no longer exists; real DB logic is in `src/app/db/session.py`.
6. **Semantic clustering cold-start cost** — `build_learning_intelligence` calls `text-embedding-3-small` on up to 80 cards per request (~$0.001, ~500ms). Silently falls back to token-based clustering when `OPENAI_API_KEY` is absent.
7. **Alembic is required for schema changes** — Runtime `create_all()` is disabled; run `./.venv/bin/alembic upgrade head` after pulling migrations.
8. **`source_context` column** — Added after initial schema. If production DB was created before migration `0007`, run `ALTER TABLE flashcards ADD COLUMN source_context TEXT;` manually.
9. **Image flashcard columns** — Added in Alembic `0013_add_image_fields`: `image_type`, `image_url`, `diagram_spec`. Run `alembic upgrade head` before using `/images` or `/generate/images`.
10. **DALL-E image URLs are temporary** — `image_generator.py` downloads them immediately into `frontend/public/generated-images/`; do not store raw temporary OpenAI image URLs as durable card URLs.
11. **ThemeToggle hydration** — Must use `mounted` state check to avoid React hydration mismatch (SSR renders without `dark` class).
12. **Multi-tenancy** — All deck/card queries MUST filter by `user_id`. WORKLOG documents a past leak where this was missing.
13. **Adventure Campaign migration** — Missing `game_sessions` causes `psycopg2.errors.UndefinedTable`; fix by running `./.venv/bin/alembic upgrade head` to apply `0011_game_sessions`.
14. **Memio Coach migration** — Missing `coach_threads`/`coach_messages` means migration `0012_coach_threads` has not been applied; run `./.venv/bin/alembic upgrade head`.
15. **CORS origins** — Hardcoded in `main.py`: production domains plus local dev origins (`localhost`/`127.0.0.1` on 3000/3001). Add new domains there.

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
