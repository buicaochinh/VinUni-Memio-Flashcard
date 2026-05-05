# Notion Integration MVP Status

## Muc tieu cua dot nay

Hoan thien Notion integration cho Memio theo scope MVP that, khong fake:

- OAuth connect Notion
- Chon page de sync
- Sync 1 chieu tu Notion vao Memio
- Incremental sync theo `last_edited_time`
- Trigger bang manual sync va cron job

Khong lam trong dot nay:

- 2-way sync
- abstraction over-engineered cho nhieu provider
- Obsidian / provider khac

## Da lam xong

### 1. Notion OAuth backend

Da them endpoint Notion moi:

- `GET /api/notion/connect`
- `GET /api/notion/callback`
- `GET /api/notion/status`
- `DELETE /api/notion/disconnect`
- `GET /api/notion/pages`

Files lien quan:

- [src/app/api/endpoints/notion.py]
- [src/app/services/notion_service.py]
- [src/app/api/api.py]

Luong hien tai:

- Frontend goi `GET /api/notion/connect` de lay `connect_url`
- User authorize tren Notion
- Notion callback ve backend
- Backend exchange `code` lay `access_token`
- Backend luu connection va redirect lai trang `/integrations`

### 2. Luu connection Notion rieng

Da them bang rieng de luu OAuth connection thay vi nhet vao `config_json`.

Model / migration:

- [src/app/models/domain.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/models/domain.py)
- [alembic/versions/0008_notion_oauth_connections.py](/d:/VIN/Ai_thucchien/A20-App-001/alembic/versions/0008_notion_oauth_connections.py)

Bang moi:

- `oauth_connections`

Thong tin dang luu:

- `user_id`
- `provider = notion`
- `access_token`
- `workspace_id`
- `workspace_name`
- `workspace_icon`
- `owner_type`

### 3. Source selection cho Notion

Da them kha nang list cac page Notion ma user co quyen truy cap.

Frontend da co luong:

- connect Notion
- load list pages
- chon page
- map vao target deck
- tao `IngestionSource` cho page do

Files lien quan:

- [frontend/src/app/integrations/page.tsx](/d:/VIN/Ai_thucchien/A20-App-001/frontend/src/app/integrations/page.tsx)
- [frontend/src/lib/app-client.ts](/d:/VIN/Ai_thucchien/A20-App-001/frontend/src/lib/app-client.ts)
- [src/app/api/endpoints/ingestion.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/api/endpoints/ingestion.py)
- [src/app/schemas/ingestion.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/schemas/ingestion.py)

Endpoint tao source rieng cho Notion:

- `POST /api/ingestion/sources/notion`

### 4. Sync 1 chieu Notion -> Memio

Da thay adapter Notion tu scaffold/sample notes thanh fetch page that.

Hien tai service Notion:

- fetch page metadata
- fetch block children
- flatten block text thanh `content_text`
- dua vao ingestion flow hien co
- chunk -> AI generate -> tao flashcards -> luu vao deck

Files lien quan:

- [src/app/services/notion_service.py]
- [src/app/services/ingestion_service.py]
### 5. Incremental sync

Da them incremental sync co that cho Notion:

- dung `last_edited_time`
- luu state vao `IngestionCursor`
- lan sync sau chi re-process khi noi dung thay doi

Ngoai ra da them mapping nho de resync co the thay dung nhom flashcards do source tao ra, thay vi chi append them.

Model / migration:

- [src/app/models/domain.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/models/domain.py)
- [alembic/versions/0009_ingestion_card_maps.py](/d:/VIN/Ai_thucchien/A20-App-001/alembic/versions/0009_ingestion_card_maps.py)

Bang moi:

- `ingestion_card_maps`

Y nghia:

- map `ingestion_item` -> `flashcard`
- khi Notion page doi, sync lai se replace dung nhom flashcards da tao tu page do

### 6. Trigger

Da co:

- manual sync tu UI sources
- cron worker cho ingestion

Worker da duoc mo de cho phep Notion chay cung RSS.

File lien quan:

- [src/app/worker/tasks_ingestion.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/worker/tasks_ingestion.py)

## Da chinh UI / UX

Trang integrations da duoc cap nhat:

- bo thong diep xem Notion la scaffold
- them khu vuc connect Notion rieng
- them chon page Notion
- them tao Notion source rieng
- giu RSS la flow rieng, khong tron voi Notion OAuth flow

File:

- [frontend/src/app/integrations/page.tsx](/d:/VIN/Ai_thucchien/A20-App-001/frontend/src/app/integrations/page.tsx)

## Da them config can thiet

Da them bien moi vao:

- [.env.example](/d:/VIN/Ai_thucchien/A20-App-001/.env.example)
- [src/app/core/config.py](/d:/VIN/Ai_thucchien/A20-App-001/src/app/core/config.py)

Bien moi:

- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `NOTION_FRONTEND_REDIRECT_URL`
- `NOTION_API_VERSION`

## Chua verify xong

Phan backend chua verify end-to-end duoc trong moi truong hien tai vi `.venv` dang thieu package:

- `defusedxml`

Dieu nay lam import cua ingestion module fail truoc khi chay test backend day du.

Frontend da verify:

- `npm.cmd run lint` pass

## Viec team can lam tiep

### Bat buoc truoc khi test that

1. Cap nhat `.env` voi Notion OAuth credentials
2. Chay Alembic migrations moi:
   - `0008_notion_oauth_connections`
   - `0009_ingestion_card_maps`
3. Cai dependency backend con thieu trong `.venv`
4. Test callback URL dung voi Notion integration config

### Smoke test nen chay

1. Connect Notion thanh cong
2. List duoc page
3. Tao Notion source voi target deck
4. Bop `Sync now` tao duoc flashcards
5. Sua page trong Notion
6. Sync lai va xac nhan flashcards duoc cap nhat

## Boundary hien tai

Hien tai MVP Notion nay dang theo boundary sau:

- support page-based sync
- sync 1 chieu Notion -> Memio
- chua lam 2-way sync
- chua lam Obsidian
- chua lam generic multi-provider abstraction
- chua support day du workflow database-centric cua Notion

## Tong ket ngan

Dot nay da bien Notion tu muc scaffold thanh MVP co xuong song that:

- co OAuth
- co page selection
- co source creation
- co sync that vao deck
- co incremental sync
- co worker trigger

Phan con lai chu yeu la verify voi credentials va workspace Notion that trong moi truong day du dependency.
Trong code của repo này, Notion đang dùng OAuth public integration, nên bạn cần tạo Public integration trên Notion, không phải internal integration. Theo docs chính thức của Notion, client_id, client_secret, và redirect URI đều lấy trong phần cấu hình integration của bạn: 
Authorization - Notion Docs
, 
Public connections - Notion Docs
.

Điền local dev như sau:

NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:8000/api/notion/callback
NOTION_FRONTEND_REDIRECT_URL=http://localhost:3000/integrations
Cách lấy NOTION_CLIENT_ID và NOTION_CLIENT_SECRET:

Vào Notion developer dashboard.
Tạo integration mới và chọn loại Public.
Trong phần configuration/settings của integration, copy:
Client ID -> điền vào NOTION_CLIENT_ID
Client Secret -> điền vào NOTION_CLIENT_SECRET
Cách set redirect URI:

Trong Notion integration settings, thêm redirect URI đúng bằng:
http://localhost:8000/api/notion/callback
Giá trị này phải khớp 100% với NOTION_REDIRECT_URI trong .env.
NOTION_FRONTEND_REDIRECT_URL là nơi backend sẽ redirect người dùng quay lại sau khi callback xong. Với local thì để:

http://localhost:3000/integrations
Nếu bạn chạy production sau này, thường sẽ đổi thành:

NOTION_REDIRECT_URI=https://api.mem.io.vn/api/notion/callback
NOTION_FRONTEND_REDIRECT_URL=https://mem.io.vn/integrations
Lưu ý quan trọng:

Redirect URI bên Notion và trong .env phải giống hệt nhau.
App hiện tại đã có flow OAuth, nhưng code đang mới lưu access_token; chưa thấy lưu refresh_token, nên nếu token hết hạn thì sau này mình nên bổ sung refresh flow.