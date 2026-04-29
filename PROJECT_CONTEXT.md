# Memio — Project Context for AI Agents

> **Read this FIRST** before making any code change. It summarises the product, architecture, file layout, DB schema, API surface, design system, deployment, and known pitfalls so you don't have to explore the codebase from scratch.

> **Product Stage: PILOT (team decision, effective 2026-04-29).**
> Treat this project as a pilot deployment: usable by a controlled group of real users, with known limitations, and prioritized stability/feedback before broad production scale.

## 1. Product Overview

**Memio** is an AI-powered flashcard learning platform. Users upload PDF/DOCX/TXT documents, the AI (Anthropic Claude) extracts key concepts and generates flashcards, and users study them with the SM-2 spaced-repetition algorithm.

**Core user flow:**
1. Login (Google OAuth / Username-Password / Guest)
2. Create a Deck (topic) in the Workspace
3. Upload documents → AI generates flashcards → User reviews & edits → Save
4. Study with flip-card UI (rate 0-3) → SM-2 schedules next review
5. View Analytics (streak, heatmap, hardest cards, forgetting rate)
6. Optionally share decks via public link

**Live domain:** `mem.io.vn` (frontend) / `api.mem.io.vn` (backend)

## 2. Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   Next.js 16    │◄─────►│   FastAPI        │◄─────►│   PostgreSQL     │
│   (Frontend)    │  HTTP │   (Backend)      │  SQL  │   (Remote DB)    │
│   Port 3000     │       │   Port 8000      │       │   Port 5432      │
└────────┬────────┘       └────────┬─────────┘       └──────────────────┘
         │                         │
         │ GIS SDK                 │ Anthropic API
         ▼                         ▼
   Google OAuth             Claude 3.5 Sonnet
```

- **Monorepo** — backend (`src/`) and frontend (`frontend/`) live in the same repo
- **No JWT/session tokens** — authentication is client-side localStorage based (`flashcard_user`)
- **User identity** is passed via `user_id` query parameter or request body (not via auth header)
- **Caddy** serves as reverse proxy in production (auto HTTPS via Let's Encrypt)

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js (App Router, TypeScript) | 16.2.3 |
| **Styling** | Tailwind CSS 3.4 + CSS Variables + `next-themes` | darkMode: `"class"` |
| **UI primitives** | Radix UI (Dialog, Tabs), Lucide icons | — |
| **Backend** | FastAPI (Python) | 0.115+ |
| **ORM** | SQLModel (SQLAlchemy + Pydantic hybrid) | — |
| **Database** | PostgreSQL (remote server) | — |
| **AI** | Anthropic Claude via `langchain-anthropic` | claude-3-5-sonnet |
| **Doc parsing** | PyPDFLoader, Docx2txtLoader, TextLoader | — |
| **Containerisation** | Docker Compose + Caddy | Alpine images |
| **Password hashing** | passlib[bcrypt] | — |

## 4. File Structure Map

Only entrypoints / index files are listed. Use Glob/Grep for the rest.

```
A20-App-001/
├── src/                              # BACKEND (FastAPI)
│   ├── main.py                       # App entry: CORS, init_db, mount /api
│   └── app/
│       ├── api/
│       │   ├── api.py                # Central router (auth/decks/cards)
│       │   └── endpoints/{auth,decks,cards}.py
│       ├── core/{config.py, sm2.py}  # Settings + SM-2 algorithm
│       ├── db/session.py             # SQLModel engine, get_session, init_db
│       ├── models/domain.py          # 5 SQLModel tables (see §5)
│       ├── schemas/{user,deck,card}.py   # Pydantic DTOs
│       ├── services/                 # Business logic (CRUD + analytics)
│       └── utils/{security,agent,tools}.py
├── frontend/                         # FRONTEND (Next.js 16)
│   └── src/
│       ├── app/                      # Routes: page.tsx, login, signup,
│       │                             # workspace, generate, analytics,
│       │                             # study/[deckId], deck/[shareToken]
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

**Schema is auto-created** by `SQLModel.metadata.create_all()` in `init_db()` on app startup.

> ⚠️ **No migration tool** (e.g., Alembic) is configured. Schema changes require manual `ALTER TABLE` on production or dropping/recreating tables.

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

## 7. AI Integration

- **Provider:** Anthropic Claude via `langchain-anthropic.ChatAnthropic`
- **Base URL:** `https://api.shopaikey.com` (proxy, configured in `cards.py:get_llm()`)
- **Card generation prompt** (`CARD_PROMPT`): Generates N flashcards as JSON array, auto-detects language, includes `source_context` for citation grounding
- **Explain prompt** (`EXPLAIN_PROMPT`): Tutor-style explanation with `[1]`, `[2]` citation markers + JSON response with `{answer, citations[{id, text, source}]}`
- **Chunked generation:** Documents are split into chunks of 4 pages, each generating 8-30 cards

## 8. Frontend Design System

- **Theme:** `next-themes` with `attribute="class"`, `defaultTheme="system"`. CSS vars in `globals.css` under `:root` and `.dark`. Primary = bright blue.
- **Tailwind tokens** (in `tailwind.config.js`): `surface`, `surface-muted`, `surface-raised`, `border-strong`, `success/danger/warning/info/subtle`, `primary-glow`.
- **Color visibility rule (CRITICAL):** `secondary` maps to a very light gray (`#f5f5f5`). **Do NOT use `text-secondary` or `bg-secondary` for text or small icons** — invisible in light mode. Use `primary`, `blue`, `green`, `amber` for high-contrast text/icons.
- **Component patterns:**
  - `AppShell` wraps authenticated pages (sidebar 260px desktop + mobile bottom nav).
  - `ThemeToggle` uses `mounted` state to prevent SSR hydration mismatch.
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
  - Mỗi lần deploy hằng ngày: `bash scripts/redeploy.sh` — KHÔNG cần sudo. Flow: pre-check disk (prune build cache nếu free `<6GB`), build local image qua `docker compose build backend frontend` (không `--no-cache`), `docker stack deploy --resolve-image=never -c docker-stack.yml memio`. Swarm tự rolling update theo `update_config` (`start-first` cho stateless, `stop-first` cho `beat`).
  - Wrapper cũ `sudo bash scripts/deploy.sh` vẫn dùng được (tự bootstrap nếu cần rồi gọi redeploy bằng user thường).
- **Files chính:**
  - `docker-compose.yml`: chỉ dùng để **build image local** (gắn `image: a20-app-001-{backend,frontend}:pilot`), worker/beat tái dùng image backend.
  - `docker-stack.yml`: file deploy cho Swarm — `deploy.resources.limits.{memory,cpus}`, `replicas: 1`, `update_config` rolling.
- **Resource limits (đặt trong `docker-stack.yml > deploy.resources.limits`):** `backend 512M/1.0`, `frontend 384M/0.75`, `worker 384M/0.75`, `beat 128M/0.25`, `caddy 128M/0.25`, `redis 128M/0.25`. Tổng ~1.7GB, vừa với RAM 2GB + swap 2GB.
- **Image pipeline hiện tại:** build local trên chính server (chưa dùng GHCR). Có thể chuyển sang GHCR pull-only sau khi cần giảm RAM peak khi deploy.

| Service | Image | Port |
|---|---|---|
| `caddy` | caddy:2-alpine | 80, 443 |
| `backend` | Dockerfile.backend (Python 3.11 Alpine) | 8000 |
| `frontend` | Dockerfile.frontend (Node 20 Alpine, multi-stage) | 3000 |

| Env Var | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Yes (build-time) | Backend URL for frontend fetch calls |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `DEFAULT_MODEL` | No | LLM model name (default: claude-3-5-sonnet) |

## 10. Known Issues & Gotchas

1. **No auth middleware** — `user_id` is passed as a query param/body field. Anyone can impersonate any user. Known prototype-phase limitation.
2. **No Alembic migrations** — Schema changes must be applied manually with `ALTER TABLE` on production PostgreSQL.
3. **`source_context` column** — Added after initial schema. If production DB was created before, run `ALTER TABLE flashcards ADD COLUMN source_context TEXT;` manually.
4. **Anthropic base_url** — Backend uses a proxy (`api.shopaikey.com`), NOT the official Anthropic API. Hardcoded in `cards.py:get_llm()`.
5. **`@app.on_event("startup")` is deprecated** in newer FastAPI — should eventually migrate to lifespan.
6. **ThemeToggle hydration** — Must use `mounted` state check to avoid React hydration mismatch (SSR renders without `dark` class).
7. **Google avatar images** — `next/Image` requires `remotePatterns` in `next.config.ts` for `*.googleusercontent.com`. AppShell uses native `<img>` with `onError` fallback instead.
8. **Multi-tenancy** — All deck/card queries MUST filter by `user_id`. WORKLOG documents a past leak where this was missing.
9. **CORS origins** — Hardcoded in `main.py`: `mem.io.vn`, `api.mem.io.vn`, `localhost:3000`. Add new domains there.
10. **`database.py` at root** — Legacy file, mostly unused. Real DB logic is in `src/app/db/session.py`.

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
