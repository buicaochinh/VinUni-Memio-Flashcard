# Tính năng Đuổi Hình Bắt Chữ — Tài liệu kỹ thuật

## 1. Tổng quan

**Đuổi Hình Bắt Chữ** là tính năng tạo flashcard có ảnh minh hoạ từ tài liệu học tập. Người dùng upload tài liệu (PDF/DOCX/TXT), AI tự động chọn các khái niệm có thể minh hoạ bằng hình ảnh, gọi DALL-E 3 để sinh ảnh, rồi lưu thẻ vào deck. Khi học, mặt trước thẻ hiển thị ảnh kèm câu hỏi — người dùng đoán từ/khái niệm rồi lật thẻ xem đáp án.

**Định hướng sản phẩm:** Tính năng trả phí (Pro badge), ưu tiên chất lượng hơn số lượng, tối ưu chi phí API.

---

## 2. Workflow hoàn chỉnh

```
[User] Upload tài liệu (PDF/DOCX/TXT)
         │
         ▼
[Backend] Parse & trích xuất text
  LangChain loaders: PyPDFLoader / Docx2txtLoader / TextLoader
  → Lấy tối đa 8.000 ký tự đầu tiên
         │
         ▼
[LLM - GPT-4o-mini] Phân tích tài liệu (IMAGE_CARD_PROMPT)
  → Chọn tối đa N khái niệm có thể minh hoạ bằng ảnh
  → Phân loại mỗi khái niệm: "real_image" | "diagram"
  → Sinh image_prompt cho từng thẻ
  → Trả JSON array (greedy regex parse để xử lý nested brackets)
         │
         ▼
[Backend] Lọc thẻ hợp lệ
  → Chỉ giữ cards có image_type ∈ {"real_image", "diagram"}
         │
         ├── real_image cards ──────────────────────────────────┐
         │                                                       ▼
         │                                         [DALL-E 3] Sinh ảnh (asyncio.Semaphore(3))
         │                                           model: dall-e-3
         │                                           size: 1024x1024 / quality: standard
         │                                           ~$0.04/ảnh
         │                                                       │
         │                                         [httpx] Download ảnh về local
         │                                           Lưu: frontend/public/generated-images/{uuid}.png
         │                                           Lưu DB: /generated-images/{uuid}.png (permanent URL)
         │                                                       │
         └── diagram cards (không gọi DALL-E) ──────────────────┘
         │
         ▼
[DB] Lưu thẻ vào bảng flashcards
  bulk_add_flashcards() → image_type, image_url, diagram_spec
         │
         ▼
[Frontend] Trang study — mặt trước thẻ
  if image_url → hiển thị <img> + câu hỏi
  else         → hiển thị text thuần
```

---

## 3. Kiến trúc & công nghệ

### 3.1 Backend (FastAPI + Python)

| Layer | File | Vai trò |
|-------|------|---------|
| Endpoint | `src/app/api/endpoints/cards.py` | `POST /{deck_id}/generate_image_cards` |
| Image gen | `src/app/utils/image_generator.py` | DALL-E call + download + lưu local |
| Card service | `src/app/services/card_service.py` | `bulk_add_flashcards()` — lưu DB |
| Migration | `alembic/versions/0013_add_image_fields.py` | Thêm 3 cột vào bảng `flashcards` |
| Config | `src/app/core/config.py` | `OPENAI_IMAGE_ENABLED: bool` feature flag |

**Dependencies:**
- `openai` (AsyncOpenAI) — gọi DALL-E 3
- `httpx` (AsyncClient) — download ảnh từ URL tạm của DALL-E
- `langchain-community` — PyPDFLoader, Docx2txtLoader, TextLoader
- `langchain-openai` — ChatOpenAI (GPT-4o-mini)
- `aiofiles` — async file write khi lưu tài liệu upload tạm

### 3.2 Frontend (Next.js 15 + TypeScript)

| File | Vai trò |
|------|---------|
| `frontend/src/app/images/page.tsx` | UI upload tài liệu, chọn deck, kéo thả file |
| `frontend/src/lib/app-client.ts` | `generateImageCards()` — gọi API multipart |
| `frontend/src/app/study/[deckId]/page.tsx` | Render ảnh trên mặt trước thẻ |
| `frontend/src/components/AppShell.tsx` | Nav item "Đuổi Hình" với icon ImagePlus |
| `frontend/public/generated-images/` | Static assets — Next.js tự serve |

---

## 4. Database schema

**Migration:** `0013_add_image_fields` (idempotent — dùng `insp.get_columns()` guard)

```sql
ALTER TABLE flashcards ADD COLUMN image_type  VARCHAR;   -- "real_image" | "diagram" | NULL
ALTER TABLE flashcards ADD COLUMN image_url   VARCHAR;   -- "/generated-images/{uuid}.png" | NULL
ALTER TABLE flashcards ADD COLUMN diagram_spec TEXT;     -- JSON spec cho diagram | NULL
```

**SQLModel model** (`src/app/models/domain.py`):
```python
class Flashcard(SQLModel, table=True):
    ...
    image_type:   Optional[str] = Field(default=None)
    image_url:    Optional[str] = Field(default=None)
    diagram_spec: Optional[str] = Field(default=None)
```

---

## 5. LLM Prompt — IMAGE_CARD_PROMPT

**Model:** `gpt-4o-mini` (temperature=0.7)  
**Input:** `{context}` (≤8.000 chars), `{count}` (5–20)

Prompt yêu cầu LLM:
1. Phân tích tài liệu để tìm khái niệm **có thể minh hoạ bằng ảnh**
2. Phân loại rộng rãi (lean toward assigning):
   - **`real_image`**: người, địa danh, đồ vật, sinh vật, bản đồ, biểu tượng, hiện tượng vật lý
   - **`diagram`**: quy trình, chu kỳ, so sánh, phân cấp, sơ đồ nhân quả
3. Sinh `image_prompt` (English, ≤15 từ cho real_image; JSON spec cho diagram)
4. Output: **chỉ JSON array**, không text thừa

**Bug đã giải quyết:** Regex parse ban đầu dùng non-greedy `\[.*?\]` bị cắt ngắn khi gặp `]` trong JSON spec của diagram. Fix: thử greedy `\[.*\]` trước, fallback về non-greedy nếu parse lỗi.

---

## 6. Image generation pipeline

### DALL-E 3 call
```python
response = await client.images.generate(
    model="dall-e-3",
    prompt=f"Educational illustration, clean style, no text: {image_prompt}",
    size="1024x1024",
    quality="standard",  # ~$0.04/ảnh
    n=1,
)
```

### Tại sao phải download về local?
DALL-E trả về URL tạm thời trên Azure Blob Storage — **hết hạn sau ~1 giờ**. Nếu lưu trực tiếp vào DB, ảnh sẽ broken khi người dùng học sau đó.

**Giải pháp:** Download ngay lập tức sau khi nhận URL, lưu vào `frontend/public/generated-images/{uuid}.png`, lưu path tương đối vào DB.

```python
# Permanent path — Next.js tự serve
_IMAGES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "generated-images"
filename = f"{uuid.uuid4().hex}.png"
# DB lưu: /generated-images/{filename}
```

### Concurrency control
```python
sem = asyncio.Semaphore(3)  # Tối đa 3 DALL-E calls song song
await asyncio.gather(*[fetch(i) for i in real_image_indices])
```

---

## 7. Frontend — UI flow

### Trang upload (`/images`)
```
[Setup stage]
  ├── Chọn deck đích
  ├── Slider số thẻ (5–20), hiển thị chi phí ước tính (~$X.XX)
  ├── Drag-and-drop / click upload PDF, DOCX, TXT
  └── Button "Tạo tối đa N thẻ (~$X.XX)"

[Generating stage]
  └── Spinner + "Đang tạo thẻ ảnh… 30–90 giây"

[Done stage]
  └── "Đã lưu N thẻ — X ảnh DALL-E + Y sơ đồ"
      ├── Button "Học ngay" → /study/{deckId}
      └── Button "Tạo thêm"
```

### Render ảnh trong study (`/study/[deckId]`)
```tsx
// Mặt trước thẻ
{card.image_url ? (
  <>
    <img src={card.image_url} alt={card.front}
         className="max-h-48 rounded-2xl object-contain"
         onError={(e) => { e.target.style.display = "none"; }}
    />
    <div>{card.front}</div>   {/* "Đây là ai?" */}
  </>
) : (
  <div>{card.front}</div>     {/* fallback text-only */}
)}

// Mặt sau thẻ — luôn là text
<p>{card.back}</p>            {/* "Napoleon Bonaparte" */}
```

**`onError` handler:** Nếu file PNG bị xoá hoặc path lỗi, ảnh tự ẩn, thẻ vẫn hoạt động bình thường với text.

---

## 8. API endpoint

```
POST /api/cards/{deck_id}/generate_image_cards
Content-Type: multipart/form-data

Parameters:
  files   File[]   Tài liệu upload (PDF/DOCX/TXT)
  count   int      Số thẻ tối đa (default=15, min=1, max=20)

Response 200:
  { "saved": 10, "real_image": 7, "diagram": 3 }

Response 422:
  - Không trích xuất được text từ file
  - LLM không tìm thấy khái niệm nào có thể minh hoạ

Response 500:
  - LLM API lỗi
```

**Chi phí ước tính:**
- GPT-4o-mini: ~$0.001 (1 call/request)
- DALL-E 3 standard 1024×1024: ~$0.04/ảnh
- 15 thẻ → ~$0.60 tổng

---

## 9. Feature flag & môi trường

```env
# .env
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_ENABLED=true   # false để tắt DALL-E (vẫn tạo thẻ, không có ảnh)
```

```python
# config.py
class Settings(BaseSettings):
    OPENAI_IMAGE_ENABLED: bool = True
```

---

## 10. Các lỗi đã gặp và cách xử lý

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `422` khi call endpoint | Regex non-greedy `\[.*?\]` bị cắt khi gặp `]` trong diagram JSON spec → `raw_cards=[]` → `visual_cards=[]` | Đổi thứ tự: thử greedy `\[.*\]` trước |
| Ảnh không hiển thị | Frontend study page không có code render `image_url` | Thêm `{card.image_url ? <img/> : text}` vào mặt trước thẻ |
| File ảnh 404 | `parents[4]` trong `image_generator.py` tính sai (đi lên thừa 1 level khỏi `src/app/utils/`) | Đổi thành `parents[3]` |
| Ảnh broken sau 1 giờ | DALL-E trả URL tạm thời trên Azure, hết hạn ~1h | Download ngay bằng `httpx`, lưu local vào `frontend/public/generated-images/` |
| `500` bulk_create | Migration `0013` chưa chạy → cột `image_type` chưa tồn tại | `alembic upgrade head` |
| LLM bỏ qua IMAGE CLASSIFICATION | Instruction đặt sau dòng `RETURN ONLY JSON... NO ADDITIONAL TEXT` → LLM dừng đọc tại đó | Di chuyển IMAGE CLASSIFICATION lên trước dòng RETURN |
