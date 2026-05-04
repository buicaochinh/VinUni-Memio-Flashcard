# Multi-Source Knowledge Ingestion

## Muc tieu

Trien khai module `Multi-Source Knowledge Ingestion` de bien cac nguon kien thuc san co thanh flashcards hoc tap.

Pham vi muc tieu:

- RSS / News Aggregator
- Second Brain Integration
- Uu tien pilot/stability-first

Huong thuc hien:

- Tach ingestion thanh module rieng
- Tai su dung card generation pipeline hien co
- Uu tien RSS truoc
- Mo san data model va API cho Notion / Obsidian / Roam de noi tiep

---

## Bai toan can giai

He thong hien tai da co:

- Upload PDF/DOCX/TXT
- AI generate flashcards
- Deck / Flashcard / Progress / Analytics
- Telegram integrations

He thong chua co:

- RSS ingestion
- Notion API ingestion
- Obsidian sync
- Ingestion job tracking
- Dedupe / cursor / sync state cho external knowledge sources

Can bo sung mot lop ingestion doc lap, khong tron vao flow upload file hien tai.

---

## Kien truc da trien khai

### 1. Backend module rieng

Da them cac file:

- [ingestion.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\api\endpoints\ingestion.py)
- [ingestion_service.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\services\ingestion_service.py)
- [tasks_ingestion.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\worker\tasks_ingestion.py)
- [ingestion.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\schemas\ingestion.py)

Router duoc mount tai:

- [api.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\api\api.py)

Celery schedule duoc them tai:

- [celery_app.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\worker\celery_app.py)

---

### 2. Data model moi

Da them cac model moi trong:

- [domain.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\models\domain.py)

Gom:

- `IngestionSource`
- `IngestionItem`
- `IngestionRun`
- `ExternalNote`
- `IngestionCursor`

Y nghia:

- `IngestionSource`: cau hinh mot nguon ingestion cua user
- `IngestionItem`: item da normalize tu external source
- `IngestionRun`: log tung lan sync
- `ExternalNote`: luu note/highlight external cho Notion/Obsidian/Roam
- `IngestionCursor`: luu trang thai cursor de sync incrementally

---

### 3. Migration database

Da them migration:

- [0007_ingestion_module.py](d:\VIN\Ai_thucchien\A20-App-001\alembic\versions\0007_ingestion_module.py)

Luu y:

- Repo hien tai dang dung Alembic thuc te
- `init_db()` trong app khong auto-create schema nua
- Muon chay feature nay can `alembic upgrade head`

---

## Flow ingestion da thiet ke

Flow duoc trien khai theo thu tu:

1. Fetch external source
2. Normalize thanh `IngestionItem`
3. Dedupe theo `checksum + source_id`
4. Extract text / summary / highlight content
5. Generate flashcards bang card pipeline hien co
6. Save vao deck dich hoac preview mode
7. Ghi `IngestionRun`, `IngestionCursor`, `last_synced_at`, `last_error`

Flow nay duoc dat trong:

- [ingestion_service.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\services\ingestion_service.py)

---

## RSS MVP da chay that

RSS la phan duoc implement day du nhat trong vong nay.

Da ho tro:

- Tao RSS source
- Pull RSS feed dinh ky
- Parse XML feed
- Normalize item thanh `IngestionItem`
- Auto-tag theo topic don gian
- Dedupe bang checksum
- Generate flashcards tu noi dung item
- Save vao deck dich
- Ho tro `preview_only`

Topic tag hien tai:

- `Tech`
- `Business`
- `Language`
- `General`

Nguon co the dung:

- VnExpress RSS
- BBC Learning English RSS
- Medium RSS
- Cac RSS XML chuan khac

---

## Notion / Obsidian / Roam

### Notion

Da mo san:

- provider `notion`
- source model
- API / UI config
- `ExternalNote` de luu page/highlight data

Chua lam:

- OAuth thuc
- token exchange
- block/page/highlight mapping
- incremental sync tu Notion API

### Obsidian

Da mo san:

- provider `obsidian`
- source model
- API / UI config
- data shape cho note/highlight

Chua lam:

- plugin sync
- signed webhook/API
- 2-way sync
- graph relationship analysis

Dinh huong dung:

- Khong lam OAuth giong SaaS
- Nen trien khai qua local plugin + signed sync endpoint

### Roam

Da mo san:

- provider `roam`
- source model / API / UI scaffold

Chua lam:

- API adapter thuc te

---

## Giao dien da cap nhat

Da sua:

- [page.tsx](d:\VIN\Ai_thucchien\A20-App-001\frontend\src\app\integrations\page.tsx)
- [app-client.ts](d:\VIN\Ai_thucchien\A20-App-001\frontend\src\lib\app-client.ts)

UI moi trong trang `Integrations`:

- Tab `Telegram`
- Tab `Knowledge Ingestion`

Phan `Knowledge Ingestion` da co:

- Tao source moi
- Chon provider: `rss`, `notion`, `obsidian`, `roam`
- Nhap `source_url`
- Chon `target deck`
- Set `frequency`
- Set `cards per item`
- Bat/tat `auto-tag`
- Chon `sync_mode`
- `Preview`
- `Sync now`
- Xem sync status va latest run

---

## API da them

Base path:

- `/api/ingestion`

Da co:

- `GET /sources`
- `POST /sources`
- `PATCH /sources/{source_id}`
- `DELETE /sources/{source_id}`
- `GET /sources/{source_id}/runs`
- `POST /sources/{source_id}/sync`

Auth:

- Dung cung pattern JWT nhu `integrations`
- Khong dung `user_id` query param cho module moi nay

---

## Worker va scheduling

Da them worker task:

- [tasks_ingestion.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\worker\tasks_ingestion.py)

Co che:

- Celery scan `IngestionSource`
- Chi auto-sync source `rss` trong MVP
- Bo qua `notion`, `obsidian`, `roam` vi chua co adapter that
- Co check `frequency_minutes`
- Co ghi log ket qua qua `IngestionRun`

Lich hien tai:

- moi 10 phut chay `sync_ingestion_sources`

---

## Tai su dung he thong cu

Module moi khong viet lai card generation.

Da tai su dung:

- card pipeline trong [cards.py](d:\VIN\Ai_thucchien\A20-App-001\src\app\api\endpoints\cards.py)
- `card_service.bulk_add_flashcards(...)`

Loi ich:

- Giu prompt va generate behavior dong nhat
- Giam duplication
- De maintain hon

---

## Kiem tra da thuc hien

Da pass:

- Backend compile bang `.venv`
- Frontend lint

Lenh da dung:

```powershell
.\.venv\Scripts\python.exe -m compileall src
npm.cmd run lint
```

Frontend build hien tai fail, nhung do van de co san cua repo:

- thieu module `@radix-ui/react-select`
- loi phat sinh tu component co san `frontend/src/components/ui/select.tsx`
- khong phai loi do ingestion module moi gay ra

---

## Diem manh cua cach lam nay

- Tach rieng ingestion module, khong lam ban logic upload file cu
- Co schema tracking ro rang cho sync
- Co RSS MVP de demo gia tri ngay
- Co san huong mo rong cho Notion / Obsidian / Roam
- Di dung huong pilot: lam cai gia tri nhat truoc

---

## Gioi han hien tai

- RSS hien dang dua chu yeu vao text co trong feed, chua fetch full article body
- Topic tagging la rule-based don gian
- Notion chua co OAuth that
- Obsidian chua co plugin / signed webhook
- Chua co graph relationship analysis cho notes
- Chua co 2-way sync thuc su

---

## Buoc tiep theo de mo rong

### Phase 1

- Fetch full article body cho RSS thay vi chi dung summary/feed snippet
- Cai thien topic classification
- Them validation va rate limits cho ingestion sync

### Phase 2

- Implement Notion OAuth
- Map Notion page / block / highlight thanh `ExternalNote`
- Ho tro sync incrementally theo cursor

### Phase 3

- Thiet ke Obsidian plugin
- Tao signed webhook/API protocol
- Ho tro highlight sync va 2-way sync
- Bat dau graph relationship analysis

---

## Ket luan

Vong nay da dat duoc mot moc quan trong:

- He thong da co mot `ingestion module` doc lap
- RSS da co the bien external knowledge thanh flashcards that
- Kien truc da san sang de noi tiep Notion va Obsidian theo dung uu tien san pham

Neu can demo, co the trinh bay theo thong diep don gian:

> "Chung toi da nang cap Memio tu cho AI tao flashcards tu file upload thanh mot he thong co the ingest tri thuc tu RSS va second-brain sources. MVP hien tai da chay that voi RSS, dong thoi da mo san kien truc, database, API, worker, va UI de mo rong tiep sang Notion va Obsidian."
