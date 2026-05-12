# Memio — Architecture & Data Flow Diagrams

## 1. Kiến trúc hệ thống tổng quan

```
┌──────────────────────────────────────────────────────────────────────┐
│                              USER                                     │
│               (Trình duyệt / Mobile / Telegram / Discord)            │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  HTTPS
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   FRONTEND  (Next.js 15 + TypeScript)                │
│                                                                       │
│  Nav: Bộ thẻ(/workspace)  Tạo thẻ(/generate)  Coach(/coach)         │
│       Thống kê(/analytics)  Liên kết(/integrations)                  │
│       /study/[id]  /play/[id]  /images  /settings                    │
│                                                                       │
│  app-client.ts ──── fetch() ──────────────────────────────────────►  │
│  (TypeScript API client, localStorage offline cache)                 │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  REST API  (JSON / multipart)
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   BACKEND  (FastAPI + Uvicorn)                        │
│                                                                       │
│  /api/auth      /api/decks      /api/cards     /api/coach            │
│  /api/games     /api/goals      /api/ingestion /api/notion           │
│  /api/integrations              /api/notifications /api/users        │
│                                                                       │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ card_service │  │  coach_svc  │  │ image_gen   │                 │
│  │ sm2.py       │  │ RAG + search│  │ DALL-E 3    │                 │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘                 │
│                                                                       │
│  ┌──────────────────────────────────────────┐                        │
│  │  APScheduler (AsyncIOScheduler)          │                        │
│  │  • send_due_cards       every 5 min      │                        │
│  │  • sync_ingestion       every 10 min     │                        │
│  │  • weekly_report        Mon 08:00        │                        │
│  └──────────────────────────────────────────┘                        │
└──────┬───────────────────┬─────────────────────┬─────────────────────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌────────────┐   ┌──────────────────┐   ┌──────────────────────────────┐
│ PostgreSQL │   │  AI / LLM Layer  │   │  LOCAL STORAGE               │
│            │   │                  │   │                              │
│ 20 tables  │   │  OpenAI          │   │  frontend/public/            │
│ (see §7)   │   │  ├─ GPT-4o-mini  │   │    generated-images/         │
│            │   │  └─ DALL-E 3     │   │    {uuid}.png                │
└────────────┘   │                  │   │                              │
                 │  Anthropic       │   │  (ảnh DALL-E tải về,         │
                 │  (optional)      │   │   Next.js serve static)      │
                 └────────┬─────────┘   └──────────────────────────────┘
                          │
                 ┌────────▼─────────┐
                 │  EXTERNAL APIs   │
                 │  Google OAuth    │
                 │  Telegram Bot    │
                 │  Discord         │
                 │  Notion API      │
                 │  DuckDuckGo      │
                 └──────────────────┘
```

---

## 2. Luồng dữ liệu tổng quát

```
User Action
    │
    ▼
[Frontend] app-client.ts
    │   fetch(NEXT_PUBLIC_API_BASE_URL + "/api/...")
    │   multipart/form-data  hoặc  application/json
    ▼
[FastAPI Router]  →  Auth middleware (JWT / Google OAuth)
    │
    ▼
[Service / Utility Layer]
    ├─ card_service.py      SM-2 scheduling, bulk save
    ├─ card_pipeline.py     chunking, dedup, quality filter
    ├─ image_generator.py   DALL-E 3 + httpx download
    ├─ coach.py             RAG context builder
    └─ sm2.py               interval / ease_factor calc
    │
    ├─► PostgreSQL  (SQLModel + SQLAlchemy)
    │     upsert / query progress, cards, sessions
    │
    ├─► OpenAI API
    │     GPT-4o-mini  →  text (cards, coach, game)
    │     DALL-E 3     →  temp_url  →  httpx download
    │                        └─► /public/generated-images/*.png
    │
    └─► External APIs (Telegram / Notion / DuckDuckGo)
    │
    ▼
[JSON Response]  →  Frontend render
```

---

## 3. Luồng tạo thẻ thường (Generate Cards)

```
[User] Upload PDF/DOCX/TXT + chọn số thẻ
    │
    ▼
[Frontend] POST /api/cards/{deck_id}/generate
           multipart: files[] + count
    │
    ▼
[Backend - cards.py]
    │
    ├─► LangChain Loaders
    │     PyPDFLoader / Docx2txtLoader / TextLoader
    │     → list[Document]  (pages)
    │
    ├─► Chunking (card_pipeline.py)
    │     count ≤ 50  →  1 LLM call  (8.000 chars)
    │     count > 50  →  parallel chunks
    │                     asyncio.Semaphore(cfg.semaphore_limit)
    │
    ├─► CARD_PROMPT → GPT-4o-mini
    │     Input:  {context} + {count}
    │     Output: JSON [{front, back, difficulty,
    │                    source_context, image_type}]
    │
    ├─► _parse_llm_json()
    │     greedy regex \[.*\] → json.loads()
    │
    ├─► run_pipeline_filter()
    │     dedup (MinHash) + quality filter
    │
    └─► bulk_add_flashcards() → PostgreSQL
    │
    ▼
[Frontend] Preview cards → User review/edit → Lưu vào deck
```

---

## 4. Luồng Đuổi Hình Bắt Chữ (Image Flashcard Pipeline)

```
[User] Upload tài liệu + chọn deck + chọn số thẻ
    │
    ▼
[Frontend /images] POST /api/cards/{deck_id}/generate_image_cards
                   multipart: files[] + count
    │
    ▼
[Backend - cards.py: generate_image_cards]
    │
    ├─► LangChain loaders → list[Document]
    │     context = first 8.000 chars
    │
    ├─► IMAGE_CARD_PROMPT → GPT-4o-mini
    │     "Tìm các khái niệm có thể minh hoạ bằng ảnh"
    │     "Sinh câu đố có 1–2 gợi ý cụ thể từ tài liệu"
    │     Output: [{front (riddle+hints), back, image_type,
    │               image_prompt, difficulty, source_context}]
    │
    ├─► Lọc: image_type ∈ {"real_image", "diagram"}
    │
    ├─► enrich_cards_with_images()  [image_generator.py]
    │   │
    │   ├── chỉ xử lý cards có image_type == "real_image"
    │   │
    │   └── asyncio.Semaphore(3) — tối đa 3 calls song song
    │         │
    │         ├─► AsyncOpenAI.images.generate()
    │         │     model: dall-e-3  |  size: 1024×1024
    │         │     prompt: "Educational illustration: {image_prompt}"
    │         │     → temp_url (Azure Blob, hết hạn ~1h)
    │         │
    │         └─► _download_and_save(temp_url)
    │               httpx.AsyncClient.get(temp_url)
    │               → lưu: frontend/public/generated-images/{uuid}.png
    │               → trả:  /generated-images/{uuid}.png  (permanent)
    │
    ├─► bulk_add_flashcards()
    │     lưu: image_type, image_url, diagram_spec → PostgreSQL
    │
    └─► Response: {saved, real_image, diagram}
    │
    ▼
[Frontend Study /study/{deckId}]
    card.image_url ?
    ├── YES → <img src="/generated-images/xxx.png"/>  +  card.front (riddle)
    └── NO  → card.front (text only, fallback)
    Flip → card.back (đáp án)
```

**Chi phí ước tính:** GPT-4o-mini ~$0.001 + DALL-E 3 ~$0.04/ảnh → 15 thẻ ~$0.60

---

## 5. Luồng học tập & SM-2

```
[User] Mở deck → Bắt đầu học
    │
    ▼
[Frontend] GET /api/cards/{deck_id}/smart-queue?user_id=N
    │
    ▼
[Backend - card_service.get_daily_study_queue()]
    │
    ├─► Query flashcards LEFT JOIN progress (by user_id)
    │
    ├─► Phân loại:
    │     review_cards  = repetition > 0 AND next_review ≤ today
    │     new_cards     = repetition == 0 (chưa học lần nào)
    │     ahead_cards   = next_review > today (chưa đến hạn)
    │
    └─► Áp dụng daily limits (daily_new_limit, daily_review_limit)
    │
    ▼
[User] Xem thẻ → Lật → Chấm điểm  0 / 1 / 2 / 3
    │
    ▼
[Frontend] POST /api/cards/progress
           {user_id, card_id, quality}
    │
    ▼
[Backend - sm2.get_updated_sm2_values()]
    │
    ├─► Tính interval mới:
    │     quality < 3  → interval = 1
    │     rep==0       → interval = 1
    │     rep==1       → interval = 6
    │     else         → interval = round(prev × ease_factor)
    │
    ├─► Cập nhật ease_factor:
    │     EF = EF + (0.1 - (3-q)×(0.08 + (3-q)×0.02))
    │     EF ≥ 1.3 (floor)
    │
    └─► Upsert progress + next_review date
    │
    ▼
[Frontend] POST /api/cards/session  → lưu study_session
[Backend]  XP calculation → user_xp table
```

---

## 6. Luồng Memio Coach (RAG)

```
[User] Nhấn "Giải thích" trên flashcard
    │       hoặc mở Coach chat
    ▼
[Frontend] POST /api/coach/message
           {thread_id, message, deck_id}
    │
    ▼
[Backend - coach.py]
    │
    ├─► Tải context nội bộ:
    │     ├── Deck info + flashcard list
    │     ├── User progress (SM-2 data)
    │     ├── Study analytics (streak, weak cards)
    │     └── source_context của các thẻ liên quan
    │
    ├─► Web fallback (nếu cần thông tin mới):
    │     DuckDuckGo Instant Answer API
    │
    ├─► Build RAG prompt:
    │     System: "Bạn là gia sư AI..."
    │     Context: deck + progress + source_context
    │     History: lịch sử chat trong thread
    │     User: câu hỏi hiện tại
    │
    ├─► ChatOpenAI (GPT-4o-mini) → stream response
    │
    └─► Response: {answer, citations[], actions[]}
    │
    ▼
[Frontend] Render markdown + citation badges + action buttons
```

---

## 7. Luồng Scheduled Jobs (APScheduler — in-process)

```
[Uvicorn lifespan startup]
    │
    └─► APScheduler.start()
          │
          ├── Job 1: send_due_cards_task
          │     Interval: every 300s
          │     ├─ Query users có chat_integration (Telegram/Discord)
          │     ├─ cards có next_review ≤ today
          │     └─ Gửi thẻ qua Bot API
          │           Inline buttons: [0 Lại] [1 Khó] [2 Tốt] [3 Dễ]
          │           Callback → POST /api/cards/progress
          │
          ├── Job 2: sync_ingestion_sources
          │     Interval: every 600s
          │     ├─ Đọc IngestionSource records (RSS, URL, Notion...)
          │     ├─ Fetch nội dung mới (kể từ cursor)
          │     ├─ GPT-4o-mini → tạo flashcard tự động
          │     └─ Lưu IngestionCardMap + cập nhật cursor
          │
          └── Job 3: send_weekly_report
                Cron: Monday 08:00 (APP_TIMEZONE)
                └─ Tổng kết tuần → gửi qua Telegram/Discord
```

---

## 8. ER Diagram

```
USERS ──────────────┬──── DECKS ─────────────┬──── FLASHCARDS
  id                │       id                │       id
  google_id         │       user_id (FK)      │       deck_id (FK)
  username          │       name              │       front
  password_hash     │       description       │       back
  name              │       is_public         │       difficulty
  email             │       share_token       │       source_context
  photo_url         │                         │       image_type
  auth_type         │                         │       image_url
  is_guest          │                         │       diagram_spec
                    │
                    ├──── AUTH_SESSIONS
                    │       user_id / token / expires_at
                    │
                    ├──── PROGRESS
                    │       user_id / card_id
                    │       interval / repetition / ease_factor
                    │       last_quality / last_reviewed / next_review
                    │
                    ├──── STUDY_SESSIONS
                    │       user_id / deck_id / session_date
                    │       cards_reviewed / avg_quality
                    │
                    ├──── COACH_THREADS ──── COACH_MESSAGES
                    │       user_id           thread_id
                    │       context_deck_id   role / content
                    │       title             citations_json
                    │                         actions_json
                    │
                    ├──── GAME_SESSIONS
                    │       deck_id / mode / status
                    │       campaign_json / score / xp_earned
                    │
                    ├──── LEARNING_GOALS
                    │       deck_id / goal_type
                    │       target_date / desired_mastery
                    │       daily_workload / status
                    │
                    ├──── USER_SETTINGS
                    │       daily_new_limit / daily_review_limit / timezone
                    │
                    ├──── USER_XP
                    │       total_xp / level / level_name
                    │       xp_in_level / xp_to_next
                    │
                    ├──── CHAT_INTEGRATIONS  (Telegram / Discord)
                    │       user_id / platform / chat_id / token
                    │
                    ├──── LINK_CODES  (deck sharing)
                    ├──── OAUTH_CONNECTIONS
                    │
                    └──── INGESTION PIPELINE
                            IngestionSource  →  IngestionRun
                            IngestionItem    →  IngestionCardMap → FLASHCARDS
                            IngestionCursor  (per-source fetch bookmark)
                            ExternalNote     (raw scraped content)
```

---

## 9. Stack tóm tắt theo layer

```
┌──────────────────────────────────────────────────────────┐
│  USER INTERFACE                                          │
│  Next.js 15 · TypeScript · Tailwind · shadcn/ui         │
│  Lucide Icons · React Hooks · localStorage cache        │
├──────────────────────────────────────────────────────────┤
│  API LAYER                                               │
│  FastAPI · Pydantic · JWT Auth · Google OAuth           │
│  Uvicorn (ASGI) · python-multipart                      │
├──────────────────────────────────────────────────────────┤
│  BUSINESS LOGIC                                          │
│  SM-2 Algorithm · LangChain · Card Pipeline             │
│  RAG (Coach) · XP System · SM-2 Scheduling              │
├──────────────────────────────────────────────────────────┤
│  AI / ML                                                 │
│  GPT-4o-mini (text gen) · DALL-E 3 (image gen)         │
│  LangChain PromptTemplate · asyncio.Semaphore(3)        │
│  Anthropic Claude (optional fallback)                   │
├──────────────────────────────────────────────────────────┤
│  BACKGROUND JOBS  (in-process, no separate worker)      │
│  APScheduler 3.x · AsyncIOScheduler                     │
│  send_due_cards (5m) · sync_ingestion (10m)             │
│  weekly_report (Mon 8AM)                                │
├──────────────────────────────────────────────────────────┤
│  DATA LAYER                                              │
│  PostgreSQL 15 · SQLModel · Alembic migrations          │
│  Local file storage — frontend/public/generated-images/ │
├──────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                       │
│  OpenAI API · Anthropic API · Google OAuth              │
│  Telegram Bot API · Discord · DuckDuckGo · Notion API   │
└──────────────────────────────────────────────────────────┘
```
