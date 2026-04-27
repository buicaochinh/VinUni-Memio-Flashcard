## Alembic migrations

This repo previously used `SQLModel.metadata.create_all()` at startup. It now uses Alembic.

### One-time setup (local)

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Create a new migration

```bash
alembic revision -m "describe change" --autogenerate
```

### Apply migrations

```bash
alembic upgrade head
```

### Existing databases

If your database already has the tables, you should **stamp** it once:

```bash
alembic stamp head
```

