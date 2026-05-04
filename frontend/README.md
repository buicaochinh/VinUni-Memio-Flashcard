## Frontend (Next.js) — Memio

Thư mục `frontend/` chứa **Next.js 16 App Router (TypeScript)** cho Memio.

Tài liệu chính của repo:

- `README.md` (root): quickstart + link docs
- `PROJECT_CONTEXT.md`: source of truth kỹ thuật/vận hành
- `docs/INDEX.md`: mục lục tài liệu

## Getting Started

### Cài dependencies

```bash
npm install
```

### Chạy dev server

```bash
npm run dev
```

Mặc định frontend chạy tại `http://localhost:3000`.

### Biến môi trường (dev)

- `NEXT_PUBLIC_API_BASE_URL` (mặc định trong repo: `http://localhost:8000`)

Xem `.env.example` ở root repo và `PROJECT_CONTEXT.md` để biết đầy đủ các biến.

## Learn More

Nếu bạn cần tham khảo framework:

- [Next.js Documentation](https://nextjs.org/docs)

### Lint / build

```bash
npm run lint
npm run build
```

