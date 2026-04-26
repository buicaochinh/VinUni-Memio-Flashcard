# Agent Guidelines

## Mandatory Rules When Using AI Coding Agents

### 1. AI Prompt Logging (Automatic)

Prompts are **automatically logged** via hooks when you use any supported AI tool.
You do **not** need to manually update `PROMPT_LOG.md`.

Supported tools and their hook configs:
| Tool | Config file |
|---|---|
| Claude Code | `.claude/settings.json` |
| Cursor | `.cursor/hooks.json` |
| OpenAI Codex | `.codex/hooks.json` |
| Gemini CLI | `.gemini/settings.json` |
| GitHub Copilot | `.github/hooks/hooks.json` |

Logs are saved to `.ai-log/session.jsonl` and submitted automatically on `git push`.

### 2. Setup (One-time)

```bash
# Install git pre-push hook
bash scripts/setup_hooks.sh
```

`AI_LOG_SERVER` and `AI_LOG_API_KEY` are already set in `.env.example`.

### 3. Pull Request Requirements

- **Title**: Short description of the change
- **Description**: Must include:
  - Summary of changes
  - List of changed files

PR description format:

```
## Summary
<description of changes>

## Changes
- <list of changed files>
```

### 4. Rules for AI Agents

If you are an AI coding agent (Claude Code, Cursor, Copilot, Codex, Gemini, etc.):

- **MUST NOT** create a PR without first ensuring `bash scripts/setup_hooks.sh` has been run
- **MUST** include a clear PR description with summary and changed files
- **DO NOT** commit `.ai-log/*.jsonl` files (they are gitignored)
- Logging happens automatically — do not ask users to log prompts manually

---

# Memio — Project Context for AI Agents

> **Read this section FIRST** before making any code change. It summarises the product, architecture, tech stack, file layout, database schema, API surface, design system, deployment, and known pitfalls so you don't have to explore the codebase from scratch.

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

- **Monorepo structure** — backend (`src/`) and frontend (`frontend/`) live in the same repo
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

```
A20-App-001/
├── src/                          # ── BACKEND (Python/FastAPI) ──
│   ├── main.py                   # FastAPI app entry point, CORS, router mount
│   ├── database.py               # Legacy DB helper (delegates to app/db/session)
│   └── app/
│       ├── api/
│       │   ├── api.py            # Central router: auth + decks + cards
│       │   └── endpoints/
│       │       ├── auth.py       # POST /api/auth/login/google, /register, /login/username, /login/guest
│       │       ├── decks.py      # GET/POST /api/decks/, DELETE, share, analytics
│       │       └── cards.py      # GET cards, generate (AI), preview, bulk_create, progress, explain
│       ├── core/
│       │   ├── config.py         # Pydantic Settings (env vars → typed config)
│       │   └── sm2.py            # SM-2 spaced repetition algorithm
│       ├── db/
│       │   └── session.py        # SQLModel engine, get_session dependency, init_db
│       ├── models/
│       │   └── domain.py         # SQLModel tables: User, Deck, Flashcard, Progress, StudySession
│       ├── schemas/
│       │   ├── card.py           # Pydantic DTOs: ProgressUpdate, CardEdit, BulkCreatePayload, ExplainRequest
│       │   ├── deck.py           # DeckCreate, DeckShareUpdate
│       │   └── user.py           # GoogleLoginRequest, UsernameLoginRequest, GuestLoginRequest, UserResponse
│       ├── services/
│       │   ├── card_service.py   # CRUD flashcards, progress, study sessions
│       │   ├── deck_service.py   # CRUD decks, sharing (token generation)
│       │   ├── user_service.py   # get_or_create (Google), register, login, guest
│       │   └── analytics_service.py  # Streak calc, heatmap, hardest cards, deck stats
│       └── utils/
│           ├── agent.py          # Standalone Anthropic agent loop (not used by web app)
│           ├── tools.py          # Agent tools: search_web, calculate, fetch_url
│           └── security.py       # hash_password, verify_password, generate_guest_id
│
├── frontend/                     # ── FRONTEND (Next.js 16 / TypeScript) ──
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout: Inter font, ThemeProvider, Google GIS script
│   │   │   ├── globals.css       # Design tokens (CSS vars), dark mode, utility classes
│   │   │   ├── page.tsx          # Login page (Google / Username / Register / Guest)
│   │   │   ├── workspace/page.tsx    # Dashboard: deck list, create deck, stats
│   │   │   ├── generate/page.tsx     # Upload → AI generate → Preview & edit → Save
│   │   │   ├── study/[deckId]/       # Study page: flip cards, rate, SM-2
│   │   │   ├── analytics/page.tsx    # Analytics dashboard: streak, heatmap, charts
│   │   │   └── deck/[shareToken]/    # Public shared deck viewer
│   │   ├── components/
│   │   │   ├── AppShell.tsx      # Authenticated layout: sidebar + mobile nav + theme toggle
│   │   │   ├── ThemeProvider.tsx  # next-themes wrapper (attribute="class", defaultTheme="system")
│   │   │   └── ThemeToggle.tsx   # Sun/Moon toggle button with mounted check (hydration fix)
│   │   └── lib/
│   │       ├── app-client.ts     # API client: all fetch calls, types, localStorage auth, offline cache
│   │       └── utils.ts          # cn() helper (clsx + tailwind-merge)
│   ├── tailwind.config.js        # Custom color tokens via CSS vars, surface/border-strong tokens
│   ├── next.config.ts            # Remote image pattern for googleusercontent.com
│   └── package.json              # Dependencies: next 16, react 19, radix-ui, next-themes, lucide
│
├── scripts/
│   ├── deploy.sh                 # Full-stack deployment script (Debian 12, Docker, UFW)
│   ├── setup_hooks.sh            # Git pre-push hook for AI log submission
│   └── log_hook.py               # AI prompt logging hook
│
├── db_deploy/                    # Standalone PostgreSQL deployment (separate server)
│   ├── docker-compose.yml
│   ├── deploy.sh
│   └── .env.example
│
├── Dockerfile.backend            # Python 3.11 Alpine
├── Dockerfile.frontend           # Node 20 Alpine (multi-stage build)
├── docker-compose.yml            # Caddy + Backend + Frontend
├── Caddyfile                     # mem.io.vn → frontend:3000, api.mem.io.vn → backend:8000
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable template
├── WORKLOG.md                    # Technical decisions (ADRs), sprint tasks, bug reports
├── JOURNAL.md                    # Weekly team journal
└── diagrams.md                   # Mermaid architecture & ER diagrams
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

### Theme
- **Dark mode:** `next-themes` with `attribute="class"`, `defaultTheme="system"`
- **CSS variables** defined in `globals.css` under `:root` and `.dark`
- **Primary color:** Bright Blue (`hsl(221 83% 53%)` light / `hsl(217 91% 60%)` dark)
- **Secondary color:** Minimalist Gray (`hsl(0 0% 96%)` light / `hsl(0 0% 13%)` dark) - *Caution: very low contrast in Light mode.*

### Key Tokens (in `tailwind.config.js`)
- `surface`, `surface-muted`, `surface-raised` — layered surfaces
- `border-strong` — higher contrast borders
- `success`, `danger`, `warning`, `info`, `subtle` — semantic colors
- `primary-glow` — box-shadow glow for CTA buttons

### UI/UX Refinements (Recent Updates)
- **Landing Page:** Enhanced with a "How it Works" section, FAQ, and a high-fidelity interactive dashboard mockup. Card layouts use clean horizontal alignment with modern hover effects (`hover:-translate-y-2`).
- **Color Visibility Rule:** The `secondary` CSS variable maps to a very light gray (`#f5f5f5`), making `text-secondary` nearly invisible on `Light` mode. **Do NOT use `text-secondary` or `bg-secondary` for text or small icons.** Use high-contrast semantic colors (`primary`, `blue`, `green`, `amber`) instead. This was systematically fixed across the Workspace, Generate, and Analytics pages.
- **Layout Fixes:** `ThemeToggle` must be placed within flex containers (not absolute positioned) to avoid overlapping text. Logos on auth pages are synced to a consistent 40px (`h-10 w-10`) size.

### Component Patterns
- **AppShell:** Wraps all authenticated pages. Desktop sidebar (260px) + mobile bottom nav
- **ThemeToggle:** Uses `mounted` state check to prevent SSR hydration mismatch
- **Cards/Buttons:** Use `rounded-2xl`, `border border-border`, `bg-surface-raised`, Tailwind transitions
- **CTA buttons:** `bg-primary` with `shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]` and transitions
- **Login page** uses Google Identity Services (GIS) SDK loaded via `next/Script`

### Auth Flow (Client-Side)
- User data stored in `localStorage` key `flashcard_user`
- `getStoredUser()` / `saveStoredUser()` / `clearStoredUser()` in `app-client.ts`
- Google JWT decoded client-side (`decodeGoogleJwt`) — no server-side token validation
- Unauthenticated → redirect to `/` (login page)
- All pages check `getStoredUser()` in `useEffect` and redirect if null

### Offline Support
- `app-client.ts` includes `cacheCards()`, `getCachedCards()`, `queueProgressUpdate()`, `flushProgressQueue()`, `isOnline()`
- Cards are cached in localStorage with 24h TTL
- Progress updates queue when offline and flush on reconnect

## 9. Deployment

### Production Topology
- **App server:** Docker Compose with Caddy (HTTPS) + Backend + Frontend
- **DB server:** Separate server running PostgreSQL via `db_deploy/`
- **Deploy script:** `sudo bash scripts/deploy.sh` (auto-installs Docker, configures UFW, builds & starts containers)

### Docker Services
| Service | Image | Port |
|---|---|---|
| `caddy` | caddy:2-alpine | 80, 443 |
| `backend` | Dockerfile.backend (Python 3.11 Alpine) | 8000 |
| `frontend` | Dockerfile.frontend (Node 20 Alpine, multi-stage) | 3000 |

### Environment Variables (`.env`)
| Var | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | Yes (build-time) | Backend URL for frontend fetch calls |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `DEFAULT_MODEL` | No | LLM model name (default: claude-3-5-sonnet) |

## 10. Known Issues & Gotchas

1. **No auth middleware** — `user_id` is passed as a query param/body field. Anyone can impersonate any user. This is a known limitation for the prototype phase.
2. **No Alembic migrations** — Schema changes must be applied manually with `ALTER TABLE` on production PostgreSQL.
3. **`source_context` column** — Was added after initial schema. If the production DB was created before this field existed, you need `ALTER TABLE flashcards ADD COLUMN source_context TEXT;` manually.
4. **Anthropic base_url** — The backend uses a proxy URL (`api.shopaikey.com`), NOT the official Anthropic API. This is hardcoded in `cards.py:get_llm()`.
5. **`@app.on_event("startup")` is deprecated** in newer FastAPI — should eventually migrate to lifespan.
6. **ThemeToggle hydration** — Must use `mounted` state check to avoid React hydration mismatch (SSR renders without `dark` class, client may add it).
7. **Google avatar images** — `next/Image` requires `remotePatterns` in `next.config.ts` for `*.googleusercontent.com`. AppShell uses native `<img>` with `onError` fallback instead.
8. **Multi-tenancy** — All deck/card queries MUST filter by `user_id`. The ADR-bug in WORKLOG documents a past leak where this was missing.
9. **CORS origins** — Hardcoded in `main.py`: `mem.io.vn`, `api.mem.io.vn`, `localhost:3000`. Add new domains there.
10. **`database.py` at root** — Legacy file, mostly unused. The real DB logic is in `src/app/db/session.py`.

## 11. Development Workflow

### Start Backend
```bash
source .venv/bin/activate
uvicorn src.main:app --reload
# → http://localhost:8000/docs (Swagger UI)
```

### Start Frontend
```bash
cd frontend && npm run dev
# → http://localhost:3000
```

### Key Development Rules
- **Python Execution:** Always prioritize using the local virtual environment (`venv` or `.venv`) located in the project root. Activate it before running commands (e.g., `source .venv/bin/activate`) or use the absolute path to the venv binary.
- **Backend imports** use absolute paths: `from src.app.xxx import yyy`
- **Frontend** uses path aliases from `tsconfig.json` — but most files use relative imports like `../../lib/app-client`
- **All API responses** follow the pattern: `{"message": "success", ...data}` or `{"decks": [...]}`, `{"cards": [...]}`
- **Service layer** (`src/app/services/`) contains business logic; endpoints are thin wrappers
- **Pydantic V2** — Use `model_dump()` not `.dict()`
- **SQLModel** — Models use both `SQLModel` (for tables) and `BaseModel` from pydantic (for schemas)

---

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
