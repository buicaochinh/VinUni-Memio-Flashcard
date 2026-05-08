# Bieu do thiet ke du an Memio

Tai lieu nay tong hop cac bieu do Mermaid de mo ta dung kien truc, mo hinh du lieu, va cac luong chinh cua Memio theo trang thai pilot hien tai.

## 1. Kien truc he thong

```mermaid
flowchart TD
    User[Users]

    subgraph Frontend["Frontend - Next.js 16"]
        Workspace[Workspace / Daily Mission]
        Study[Study UI]
        CoachUI[Memio Coach UI]
        PlayUI[Adventure Campaign UI]
        AuthUI[Login / Signup / Guest]
    end

    subgraph Backend["Backend - FastAPI"]
        API[API Router]
        DeckSvc[Deck / Card Services]
        StudySvc[SM-2 Progress Service]
        CoachSvc[Coach Service]
        GameSvc[Game Service]
        AuthSvc[Auth Endpoints]
    end

    subgraph Data["Data Layer"]
        Postgres[(PostgreSQL)]
    end

    subgraph External["External Services"]
        OpenAI[OpenAI\nGPT-4o-mini]
        Google[Google OAuth]
        Duck[DuckDuckGo Instant Answer]
    end

    User --> Workspace
    User --> Study
    User --> CoachUI
    User --> PlayUI
    User --> AuthUI

    Workspace --> API
    Study --> API
    CoachUI --> API
    PlayUI --> API
    AuthUI --> API

    API --> DeckSvc
    API --> StudySvc
    API --> CoachSvc
    API --> GameSvc
    API --> AuthSvc

    DeckSvc --> Postgres
    StudySvc --> Postgres
    CoachSvc --> Postgres
    GameSvc --> Postgres
    AuthSvc --> Postgres

    DeckSvc --> OpenAI
    CoachSvc --> OpenAI
    GameSvc --> OpenAI
    CoachSvc --> Duck
    AuthSvc --> Google
```

## 2. ER diagram

```mermaid
erDiagram
    USERS ||--o{ DECKS : owns
    USERS ||--o{ PROGRESS : tracks
    USERS ||--o{ STUDY_SESSIONS : logs
    USERS ||--o{ GAME_SESSIONS : plays
    USERS ||--o{ COACH_THREADS : starts
    USERS ||--o{ COACH_MESSAGES : sends
    USERS ||--|| USER_SETTINGS : configures

    DECKS ||--o{ FLASHCARDS : contains
    DECKS ||--o{ STUDY_SESSIONS : summarizes
    DECKS ||--o{ GAME_SESSIONS : powers
    DECKS ||--o{ COACH_THREADS : contextualizes

    FLASHCARDS ||--o{ PROGRESS : schedules
    COACH_THREADS ||--o{ COACH_MESSAGES : stores

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
        text source_context
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
        datetime last_reviewed
        datetime next_review
    }

    STUDY_SESSIONS {
        int id PK
        int user_id FK
        int deck_id FK
        date session_date
        int cards_reviewed
        float avg_quality
    }

    GAME_SESSIONS {
        int id PK
        int user_id FK
        int deck_id FK
        string mode
        string status
        json campaign_json
        int score
        int xp_earned
        float accuracy
        int total_questions
        int correct_answers
        datetime started_at
        datetime completed_at
        datetime created_at
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
        text content
        json citations_json
        json actions_json
        datetime created_at
    }

    USER_SETTINGS {
        int id PK
        int user_id FK
        int daily_new_limit
        int daily_review_limit
        string timezone
    }
```

## 3. Luong hoc va cap nhat SM-2

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend Study UI
    participant A as FastAPI
    participant S as Study Service
    participant D as PostgreSQL

    U->>F: Mo deck va bat dau hoc
    F->>A: GET /api/cards/{deck_id}?user_id=N
    A->>S: Lay cards + progress cua user
    S->>D: Query flashcards, progress, analytics lien quan
    D-->>S: Due cards / new cards / progress
    S-->>A: Danh sach cards can hoc
    A-->>F: Tra cards cho study UI

    U->>F: Lat the va danh gia chat luong 0-3
    F->>A: POST /api/cards/progress
    A->>S: Tinh toan lai thong so SM-2
    Note over S: interval, repetition,\n ease_factor, next_review
    S->>D: Upsert progress theo user_id + card_id
    D-->>S: Luu thanh cong
    S-->>A: Progress moi
    A-->>F: Cap nhat the tiep theo

    F->>A: POST /api/cards/session
    A->>D: Luu study_sessions
    D-->>A: Xac nhan
    A-->>F: Tong ket phien hoc
```

## 4. Luong tao the va coach

```mermaid
flowchart LR
    Upload[Upload PDF / DOCX / TXT] --> Extract[Extract text]
    Extract --> Chunk[Chunk tai lieu theo lo]
    Chunk --> Prompt[Build card prompt]
    Prompt --> LLM[OpenAI GPT-4o-mini]
    LLM --> Preview[Preview cards JSON]
    Preview --> Review[User review / edit]
    Review --> Save[Save flashcards]
    Save --> StudyReady[Deck san sang hoc]

    StudyReady --> CoachAsk[User hoi Memio Coach]
    CoachAsk --> CoachAPI[POST /api/coach/message]
    CoachAPI --> Internal[Lay deck, card, progress, analytics noi bo]
    Internal --> CoachLLM[OpenAI Coach prompt]
    CoachAPI --> WebFallback[DuckDuckGo fallback khi can web/latest]
    CoachLLM --> CoachReply[Answer + citations + actions]
    WebFallback --> CoachReply
```
