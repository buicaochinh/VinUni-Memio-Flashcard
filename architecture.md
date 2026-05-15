# Memio — System Architecture

> Tài liệu kiến trúc hệ thống: sơ đồ User, Frontend, Backend/API, Database, AI Agent/LLM và luồng dữ liệu chính.

---

## 1. Tổng quan kiến trúc hệ thống

```mermaid
graph TB
    subgraph USER["👤 USER"]
        Browser["🌐 Trình duyệt Web"]
        Telegram["📱 Telegram Bot"]
    end

    subgraph FRONTEND["🖥️ FRONTEND — Next.js 16 + TypeScript"]
        Pages["App Router Pages"]
        Components["React Components"]
        AppClient["app-client.ts<br/>API Client + Auth + Cache"]
    end

    subgraph REVERSE_PROXY["🔒 REVERSE PROXY"]
        Caddy["Caddy 2<br/>Auto HTTPS (Let's Encrypt)<br/>mem.io.vn → Frontend<br/>api.mem.io.vn → Backend"]
    end

    subgraph BACKEND["⚙️ BACKEND — FastAPI + Uvicorn"]
        direction TB
        APIRouter["API Router<br/>/api/*"]
        AuthMiddleware["JWT Auth<br/>get_current_user_id()"]
        Services["Service Layer"]
        Scheduler["APScheduler<br/>AsyncIOScheduler"]
    end

    subgraph AI_LLM["🤖 AI / LLM Layer"]
        GPT4oMini["GPT-4o-mini<br/>Text Generation"]
        DALLE3["DALL-E 3<br/>Image Generation"]
        Embeddings["text-embedding-3-small<br/>Semantic Clustering"]
    end

    subgraph DATABASE["🗄️ DATABASE"]
        PostgreSQL["PostgreSQL<br/>Remote Server<br/>20+ tables"]
    end

    subgraph EXTERNAL["🌍 EXTERNAL SERVICES"]
        GoogleOAuth["Google OAuth"]
        DuckDuckGo["DuckDuckGo<br/>Instant Answer API"]
        NotionAPI["Notion API"]
        TelegramAPI["Telegram Bot API"]
    end

    subgraph STORAGE["📁 LOCAL STORAGE"]
        ImageFiles["frontend/public/<br/>generated-images/<br/>{uuid}.png"]
    end

    Browser -->|HTTPS| Caddy
    Telegram -->|Webhook| Caddy
    Caddy -->|:3000| Pages
    Caddy -->|:8000| APIRouter
    Pages --> Components
    Components --> AppClient
    AppClient -->|"REST API (JSON/multipart)"| APIRouter
    APIRouter --> AuthMiddleware
    AuthMiddleware --> Services
    Services -->|SQLModel / SQLAlchemy| PostgreSQL
    Services -->|langchain-openai| GPT4oMini
    Services -->|AsyncOpenAI| DALLE3
    Services -->|numpy + cosine| Embeddings
    Services -->|httpx download| ImageFiles
    Services -->|OAuth 2.0| GoogleOAuth
    Services -->|HTTP| DuckDuckGo
    Services -->|REST| NotionAPI
    Services -->|Bot API| TelegramAPI
    Scheduler -->|Cron jobs| Services

    style USER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style FRONTEND fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BACKEND fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style AI_LLM fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style DATABASE fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EXTERNAL fill:#f5f5f5,stroke:#616161,stroke-width:2px
    style REVERSE_PROXY fill:#e0f7fa,stroke:#00838f,stroke-width:2px
    style STORAGE fill:#fff8e1,stroke:#f9a825,stroke-width:2px
```

---

## 2. Sơ đồ luồng dữ liệu chính

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as 🖥️ Frontend<br/>(Next.js 16)
    participant API as ⚙️ Backend<br/>(FastAPI)
    participant DB as 🗄️ PostgreSQL
    participant AI as 🤖 OpenAI<br/>(GPT-4o-mini)

    Note over User,AI: Luồng 1: Đăng nhập & Xác thực
    User->>FE: Đăng nhập (Google / Username / Guest)
    FE->>API: POST /api/auth/login/*
    API->>DB: Upsert user record
    DB-->>API: User data
    API-->>FE: JWT access_token + refresh_token
    FE->>FE: Lưu tokens vào localStorage

    Note over User,AI: Luồng 2: Tạo thẻ từ tài liệu
    User->>FE: Upload PDF/DOCX/TXT + chọn số thẻ
    FE->>API: POST /api/cards/{deck_id}/generate<br/>(multipart/form-data)
    API->>API: LangChain Loaders → chunk text
    API->>AI: CARD_PROMPT + context → GPT-4o-mini
    AI-->>API: JSON [{front, back, difficulty, source_context}]
    API->>API: Parse + dedup + quality filter
    API->>DB: bulk_add_flashcards()
    DB-->>API: Saved cards
    API-->>FE: Cards response
    FE-->>User: Preview & edit cards

    Note over User,AI: Luồng 3: Học tập với SM-2
    User->>FE: Mở deck → Bắt đầu học
    FE->>API: GET /api/cards/{deck_id}
    API->>DB: LEFT JOIN flashcards + progress
    DB-->>API: Cards with SM-2 data
    API-->>FE: Study queue (new + review + ahead)
    User->>FE: Lật thẻ → Chấm điểm (0-3)
    FE->>API: POST /api/cards/progress {card_id, quality}
    API->>API: SM-2 algorithm → new interval, ease_factor
    API->>DB: Upsert progress + next_review
    FE->>API: POST /api/cards/session → log + award XP
```

---

## 3. Frontend Architecture

```mermaid
graph TB
    subgraph NEXTJS["Next.js 16 — App Router"]
        subgraph PAGES["📄 Pages (Routes)"]
            Landing["/  — Landing Page"]
            Login["/login — Đăng nhập"]
            Signup["/signup — Đăng ký"]
            Workspace["/workspace — Workspace chính"]
            Generate["/generate — Tạo thẻ"]
            Study["/study/[deckId] — Học tập"]
            Play["/play/[deckId] — Adventure Campaign"]
            Coach["/coach — Memio Coach"]
            Analytics["/analytics — Thống kê"]
            Images["/images — Đuổi Hình Bắt Chữ"]
            GenImages["/generate/images — Thêm ảnh DALL-E"]
            SharedDeck["/deck/[shareToken] — Deck chia sẻ"]
            Settings["/settings — Cài đặt"]
            Integrations["/integrations — Liên kết"]
        end

        subgraph COMPONENTS["🧩 Components"]
            AppShell["AppShell<br/>Sidebar + Header + Bottom Nav"]
            CoachChat["CoachChat<br/>Shared chat UI"]
            CoachLauncher["CoachLauncher<br/>Floating panel"]
            ThemeToggle["ThemeToggle<br/>Dark/Light mode"]
            ThemeProvider["ThemeProvider<br/>next-themes"]
            SessionComplete["SessionCompleteBoard<br/>XP + stats"]
            DailyLimit["DailyLimitReached<br/>Study limit UI"]
        end

        subgraph LIB["📚 Libraries"]
            AppClientTS["app-client.ts<br/>• authFetch() — auto Bearer token<br/>• getStoredUser() / saveStoredUser()<br/>• cacheCards() / getCachedCards()<br/>• queueProgressUpdate() — offline<br/>• flushProgressQueue() — sync"]
        end
    end

    Landing --> Login
    Landing --> Signup
    Login --> Workspace
    Workspace --> Study
    Workspace --> Play
    Workspace --> Generate
    Workspace --> Coach
    Workspace --> Analytics
    Workspace --> Images
    AppShell --> CoachLauncher
    PAGES --> AppShell
    PAGES --> LIB
    CoachLauncher --> CoachChat
    Coach --> CoachChat

    style NEXTJS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style PAGES fill:#bbdefb,stroke:#1976d2
    style COMPONENTS fill:#c8e6c9,stroke:#388e3c
    style LIB fill:#fff9c4,stroke:#f9a825
```

---

## 4. Backend Architecture

```mermaid
graph TB
    subgraph FASTAPI["FastAPI Backend"]
        Main["main.py<br/>CORS + lifespan + mount /api"]

        subgraph ENDPOINTS["🔌 API Endpoints (/api/*)"]
            AuthEP["auth.py<br/>Login / Register / Guest"]
            DecksEP["decks.py<br/>CRUD + Share + Analytics"]
            CardsEP["cards.py<br/>Generate + Progress + Study"]
            GamesEP["games.py<br/>Adventure Campaign"]
            CoachEP["coach.py<br/>Chat + Quiz + Intelligence"]
            GoalsEP["goals.py<br/>Learning Goals"]
            UsersEP["users.py<br/>Settings + XP"]
            NotifEP["notifications.py<br/>Alerts + Cron trigger"]
            IngestionEP["ingestion.py<br/>Sources pipeline"]
            IntegEP["integrations.py<br/>Telegram / Discord link"]
            NotionEP["notion.py<br/>Notion sync"]
        end

        subgraph SERVICES["🏗️ Service Layer"]
            CardSvc["card_service.py<br/>Study queue + SM-2"]
            CoachSvc["coach_service.py<br/>RAG + context builder"]
            GameSvc["game_service.py<br/>Campaign builder"]
            AnalyticsSvc["analytics_service.py<br/>Streak + heatmap"]
            XPSvc["xp_service.py<br/>Level system (10 levels)"]
            GoalSvc["goal_service.py<br/>Exam deadline planner"]
            NotifSvc["notification_service.py<br/>Due/streak/exam alerts"]
            IngestionSvc["ingestion_service.py<br/>RSS/Notion fetch"]
            DeckSvc["deck_service.py"]
            UserSvc["user_service.py"]
            TelegramSvc["telegram_service.py"]
        end

        subgraph UTILS["🔧 Utilities"]
            SM2["sm2.py<br/>Spaced Repetition Algorithm"]
            Pipeline["card_pipeline.py<br/>Chunking + dedup + filter"]
            ImgGen["image_generator.py<br/>DALL-E 3 + download"]
            JWT["jwt_auth.py<br/>Token create/verify"]
            Security["security.py<br/>Password hashing (bcrypt)"]
        end

        subgraph SCHEDULER["⏰ APScheduler"]
            Job1["send_due_cards<br/>every 5 min"]
            Job2["sync_ingestion<br/>every 10 min"]
            Job3["weekly_report<br/>Mon 08:00"]
        end

        subgraph AUTH["🔐 Auth"]
            Deps["deps.py<br/>get_current_user_id()<br/>JWT Bearer extraction"]
        end
    end

    Main --> ENDPOINTS
    ENDPOINTS --> AUTH
    AUTH --> SERVICES
    SERVICES --> UTILS
    SCHEDULER --> SERVICES

    style FASTAPI fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style ENDPOINTS fill:#ffe0b2,stroke:#ef6c00
    style SERVICES fill:#c8e6c9,stroke:#388e3c
    style UTILS fill:#e1bee7,stroke:#8e24aa
    style SCHEDULER fill:#b3e5fc,stroke:#0288d1
    style AUTH fill:#ffcdd2,stroke:#c62828
```

---

## 5. Database Schema (ER Diagram)

```mermaid
erDiagram
    USERS {
        int id PK
        string google_id UK
        string username UK
        string password_hash
        string name
        string email
        string photo_url
        string auth_type
        bool is_guest
    }

    DECKS {
        int id PK
        int user_id FK
        string name
        string description
        int is_public
        string share_token UK
        datetime created_at
    }

    FLASHCARDS {
        int id PK
        int deck_id FK
        string front
        string back
        string difficulty
        string source_context
        string image_type
        string image_url
        string diagram_spec
        datetime created_at
    }

    PROGRESS {
        int id PK
        int user_id FK
        int card_id FK
        int interval
        int repetition
        float ease_factor
        int last_quality
        string last_reviewed
        string next_review
    }

    STUDY_SESSIONS {
        int id PK
        int user_id FK
        int deck_id FK
        string session_date
        int cards_reviewed
        float avg_quality
    }

    GAME_SESSIONS {
        int id PK
        int user_id FK
        int deck_id FK
        string mode
        string status
        string campaign_json
        int score
        int xp_earned
        float accuracy
        datetime started_at
        datetime completed_at
    }

    COACH_THREADS {
        int id PK
        int user_id FK
        int context_deck_id FK
        string title
        datetime created_at
        datetime updated_at
    }

    COACH_MESSAGES {
        int id PK
        int thread_id FK
        int user_id FK
        string role
        string content
        string citations_json
        string actions_json
        datetime created_at
    }

    USER_SETTINGS {
        int id PK
        int user_id FK
        int daily_new_limit
        int daily_review_limit
        string timezone
    }

    LEARNING_GOALS {
        int id PK
        int user_id FK
        int deck_id FK
        string goal_type
        string target_date
        int desired_mastery
        int daily_workload
        string status
    }

    AUTH_SESSIONS {
        int id PK
        int user_id FK
        string refresh_token_hash
        string device_name
        datetime created_at
        datetime revoked_at
    }

    CHAT_INTEGRATIONS {
        int id PK
        int user_id FK
        string provider
        string provider_user_id
        string dm_chat_id
        string timezone
        string send_window
        int daily_goal
    }

    LINK_CODES {
        int id PK
        string code UK
        string provider
        string provider_user_id
        datetime expires_at
    }

    OAUTH_CONNECTIONS {
        int id PK
        int user_id FK
        string provider
        string access_token
        string workspace_id
    }

    INGESTION_SOURCES {
        int id PK
        int user_id FK
        string provider
        string name
        string status
        int target_deck_id FK
    }

    INGESTION_ITEMS {
        int id PK
        int source_id FK
        string title
        string content_text
        string checksum
    }

    INGESTION_RUNS {
        int id PK
        int source_id FK
        string status
        int fetched_count
        int created_count
    }

    INGESTION_CARD_MAPS {
        int id PK
        int ingestion_item_id FK
        int flashcard_id FK
    }

    EXTERNAL_NOTES {
        int id PK
        int source_id FK
        string external_note_id
        string title
        string content_text
    }

    INGESTION_CURSORS {
        int id PK
        int source_id FK
        string cursor_type
        string cursor_value
    }

    USERS ||--o{ DECKS : "owns"
    USERS ||--o{ PROGRESS : "tracks"
    USERS ||--o{ STUDY_SESSIONS : "logs"
    USERS ||--o{ GAME_SESSIONS : "plays"
    USERS ||--o{ COACH_THREADS : "chats"
    USERS ||--o{ USER_SETTINGS : "configures"
    USERS ||--o{ LEARNING_GOALS : "sets"
    USERS ||--o{ AUTH_SESSIONS : "authenticates"
    USERS ||--o{ CHAT_INTEGRATIONS : "links"
    USERS ||--o{ OAUTH_CONNECTIONS : "connects"
    USERS ||--o{ INGESTION_SOURCES : "subscribes"
    DECKS ||--o{ FLASHCARDS : "contains"
    DECKS ||--o{ LEARNING_GOALS : "targets"
    FLASHCARDS ||--o{ PROGRESS : "measured_by"
    COACH_THREADS ||--o{ COACH_MESSAGES : "holds"
    INGESTION_SOURCES ||--o{ INGESTION_ITEMS : "fetches"
    INGESTION_SOURCES ||--o{ INGESTION_RUNS : "executes"
    INGESTION_SOURCES ||--o{ EXTERNAL_NOTES : "stores"
    INGESTION_SOURCES ||--o{ INGESTION_CURSORS : "bookmarks"
    INGESTION_ITEMS ||--o{ INGESTION_CARD_MAPS : "maps_to"
    FLASHCARDS ||--o{ INGESTION_CARD_MAPS : "created_from"
```

---

## 6. AI Agent / LLM Integration

```mermaid
graph LR
    subgraph TRIGGERS["🎯 Triggers"]
        Upload["📄 Upload tài liệu"]
        StudyExplain["💡 Giải thích thẻ"]
        CoachMsg["💬 Hỏi Coach"]
        GameStart["🎮 Bắt đầu Campaign"]
        ImageGen["🖼️ Tạo ảnh Đuổi Hình"]
        QuizStart["📝 Quiz trong Coach"]
        ClusterCalc["🧠 Weak Concept Clustering"]
    end

    subgraph OPENAI["OpenAI API"]
        GPT["GPT-4o-mini<br/>(langchain-openai)"]
        DALLE["DALL-E 3<br/>(AsyncOpenAI)"]
        EMB["text-embedding-3-small<br/>(embeddings)"]
    end

    subgraph PROMPTS["📋 Prompt Templates"]
        CardPrompt["CARD_PROMPT<br/>→ JSON flashcards"]
        ImageCardPrompt["IMAGE_CARD_PROMPT<br/>→ Visual card concepts"]
        ExplainPrompt["EXPLAIN_PROMPT<br/>→ Tutor explanation + citations"]
        CoachPrompt["COACH_SYSTEM_PROMPT<br/>→ RAG answer + actions"]
        CampaignPrompt["CAMPAIGN_PROMPT<br/>→ Adventure Campaign stages"]
    end

    subgraph OUTPUT["📤 Output"]
        Cards["Flashcards JSON"]
        Explanation["Answer + Citations"]
        Campaign["Campaign + Questions"]
        Images["Generated Images<br/>→ /generated-images/{uuid}.png"]
        Clusters["Semantic Clusters<br/>(cosine similarity > 0.70)"]
    end

    Upload --> CardPrompt
    Upload --> ImageCardPrompt
    StudyExplain --> ExplainPrompt
    CoachMsg --> CoachPrompt
    GameStart --> CampaignPrompt
    ImageGen --> DALLE
    QuizStart --> CoachPrompt
    ClusterCalc --> EMB

    CardPrompt --> GPT
    ImageCardPrompt --> GPT
    ExplainPrompt --> GPT
    CoachPrompt --> GPT
    CampaignPrompt --> GPT

    GPT --> Cards
    GPT --> Explanation
    GPT --> Campaign
    DALLE --> Images
    EMB --> Clusters

    style TRIGGERS fill:#e8f5e9,stroke:#2e7d32
    style OPENAI fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style PROMPTS fill:#fff3e0,stroke:#e65100
    style OUTPUT fill:#e3f2fd,stroke:#1565c0
```

---

## 7. Luồng dữ liệu chi tiết theo feature

### 7.1 Luồng Memio Coach (RAG)

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as Frontend
    participant API as Coach API
    participant Svc as coach_service.py
    participant DB as PostgreSQL
    participant AI as GPT-4o-mini
    participant DDG as DuckDuckGo

    User->>FE: Gửi câu hỏi trong Coach
    FE->>API: POST /api/coach/message<br/>{message, thread_id?, context_deck_id?}

    API->>Svc: process_message()
    Svc->>DB: Load deck + flashcards + progress
    Svc->>DB: Load study analytics + weak cards
    Svc->>Svc: build_context()<br/>Gom source_context citations

    alt Cần thông tin ngoài
        Svc->>DDG: DuckDuckGo Instant Answer
        DDG-->>Svc: Web result (lower priority)
    end

    Svc->>AI: COACH_SYSTEM_PROMPT<br/>+ context + history + question
    AI-->>Svc: {answer, citation_ids, actions[]}

    Svc->>Svc: Sanitize actions against user's decks
    Svc->>DB: Save to coach_messages
    Svc-->>API: Response
    API-->>FE: {answer, citations[], actions[]}
    FE-->>User: Render markdown + citation badges<br/>+ action buttons
```

### 7.2 Luồng Adventure Campaign

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as /play/[deckId]
    participant API as Games API
    participant Svc as game_service.py
    participant DB as PostgreSQL
    participant AI as GPT-4o-mini
    participant XP as xp_service.py

    User->>FE: Nhấn "Chơi" trên deck
    FE->>API: POST /api/games/campaign/{deck_id}/start<br/>{card_count}

    API->>Svc: create_campaign()
    Svc->>DB: Load deck cards
    Svc->>AI: CAMPAIGN_PROMPT + cards data
    AI-->>Svc: Campaign JSON<br/>(title, stages, questions, hints)

    alt OpenAI fails
        Svc->>Svc: Build deterministic fallback campaign
    end

    Svc->>DB: Insert game_sessions (status: started)
    Svc-->>FE: Campaign data

    loop Mỗi câu hỏi
        User->>FE: Chọn đáp án
        FE->>FE: Map to SM-2 quality<br/>(correct=3, hint=2, wrong+hint=1, wrong=0)
        FE->>API: POST /api/cards/progress<br/>{card_id, quality}
        API->>DB: Update SM-2 progress
    end

    User->>FE: Hoàn thành campaign
    FE->>API: POST /api/games/campaign/{session_id}/complete<br/>{score, xp_earned, accuracy}
    API->>XP: award_xp(user_id, xp_earned)
    XP->>DB: users.total_xp += xp_earned
    API->>DB: Update game_sessions (status: completed)
    API-->>FE: Final score + XP + level info
```

### 7.3 Luồng Image Flashcard (Đuổi Hình Bắt Chữ)

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as /images
    participant API as Cards API
    participant AI as GPT-4o-mini
    participant DALLE as DALL-E 3
    participant FS as File System
    participant DB as PostgreSQL

    User->>FE: Upload tài liệu + chọn deck + số thẻ
    FE->>API: POST /api/cards/{deck_id}/generate_image_cards<br/>(multipart: files + count)

    API->>API: LangChain loaders → extract text
    API->>AI: IMAGE_CARD_PROMPT + context
    AI-->>API: [{front (riddle+hints), back,<br/>image_type, image_prompt}]

    API->>API: Filter: image_type ∈ {real_image, diagram}

    loop Mỗi card có image_type == "real_image"
        Note over API,DALLE: asyncio.Semaphore(3) — max 3 parallel
        API->>DALLE: images.generate(prompt, 1024×1024)
        DALLE-->>API: Temporary image URL
        API->>FS: httpx download → /generated-images/{uuid}.png
    end

    API->>DB: bulk_add_flashcards()<br/>(image_type, image_url, diagram_spec)
    API-->>FE: {saved, real_image_count, diagram_count}
    FE-->>User: Preview visual cards
```

---

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph INTERNET["🌐 Internet"]
        UserBrowser["User Browser"]
        TelegramHook["Telegram Webhook"]
    end

    subgraph APP_SERVER["🖥️ App Server (Docker Swarm — Single Node)<br/>2GB RAM / 2 vCPU / 30GB SSD"]
        subgraph SWARM["Docker Stack: memio"]
            CaddySvc["caddy:2-alpine<br/>128M / 0.25 CPU<br/>Port 80, 443"]
            BackendSvc["Dockerfile.backend<br/>Python 3.11 Alpine<br/>512M / 1.0 CPU<br/>Port 8000"]
            FrontendSvc["Dockerfile.frontend<br/>Node 20 Alpine<br/>384M / 0.75 CPU<br/>Port 3000"]
        end
        Swap["Swap 2GB<br/>vm.swappiness=10"]
    end

    subgraph DB_SERVER["🗄️ DB Server (Riêng biệt)"]
        PG["PostgreSQL<br/>Port 5432"]
    end

    UserBrowser -->|HTTPS| CaddySvc
    TelegramHook -->|HTTPS| CaddySvc
    CaddySvc -->|proxy :3000| FrontendSvc
    CaddySvc -->|proxy :8000| BackendSvc
    BackendSvc -->|SQL via DATABASE_URL| PG

    style INTERNET fill:#e8f5e9,stroke:#2e7d32
    style APP_SERVER fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style SWARM fill:#bbdefb,stroke:#1976d2
    style DB_SERVER fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

**Deploy flow:**
1. **One-time:** `sudo bash scripts/bootstrap.sh` → Docker check, swap 2GB, UFW 80/443, swarm init
2. **Daily:** `bash scripts/redeploy.sh` → `docker compose build` → `docker stack deploy -c docker-stack.yml memio`

---

## 9. Tech Stack Summary

| Layer | Technology | Chi tiết |
|-------|-----------|----------|
| **Frontend** | Next.js 16 + TypeScript | App Router, Tailwind CSS 3.4, Radix UI, Lucide Icons |
| **Styling** | Tailwind CSS + CSS Variables | `next-themes` (dark/light), design tokens trong `tailwind.config.js` |
| **Backend** | FastAPI + Uvicorn | Python 3.11, ASGI, lifespan context manager |
| **ORM** | SQLModel (SQLAlchemy + Pydantic) | Pydantic V2 (`model_dump()`), Alembic migrations |
| **Database** | PostgreSQL | 20+ tables, remote server, managed via Alembic |
| **AI — Text** | GPT-4o-mini via `langchain-openai` | Card gen, Coach RAG, Campaign, Explain |
| **AI — Image** | DALL-E 3 via `AsyncOpenAI` | 1024×1024, ~$0.04/ảnh, semaphore(3) |
| **AI — Embed** | text-embedding-3-small | Semantic clustering, cosine similarity > 0.70 |
| **Auth** | JWT Bearer + Google OAuth | `authFetch()` auto-attach, refresh on 401 |
| **Scheduler** | APScheduler (AsyncIOScheduler) | In-process, due cards (5m), ingestion (10m), weekly report |
| **Reverse Proxy** | Caddy 2 Alpine | Auto HTTPS via Let's Encrypt |
| **Containerization** | Docker Compose + Docker Swarm | Multi-stage Alpine images, rolling update |
| **External** | Telegram Bot API, Notion API, DuckDuckGo | Notifications, ingestion, web search fallback |
