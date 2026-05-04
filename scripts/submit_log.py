#!/usr/bin/env python3
"""
Submit .ai-log/session.jsonl to grading/logging server.
Called automatically by git pre-push hook. Can also be run manually.

Usage:
  python scripts/submit_log.py
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SERVER_URL = os.environ.get("AI_LOG_SERVER", "")
API_KEY = os.environ.get("AI_LOG_API_KEY", "")
LOG_FILE = Path(os.environ.get("AI_LOG_DIR", ".ai-log")) / "session.jsonl"

DEFAULT_MAX_PAYLOAD_BYTES = 900_000  # keep below common 1MB limits


def iter_entries():
    with open(LOG_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def post_entries(entries: list[dict]) -> None:
    payload = json.dumps({"entries": entries}, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    req = urllib.request.Request(
        SERVER_URL,
        data=payload,
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"[ai-log] Submitted {len(entries)} entries → {resp.status}", file=sys.stderr)


def submit_in_chunks(max_payload_bytes: int) -> None:
    batch: list[dict] = []
    batch_bytes = 0
    sent_total = 0

    for entry in iter_entries():
        # Rough estimate: JSON length of this entry + commas/overhead.
        entry_bytes = len(json.dumps(entry, ensure_ascii=False).encode("utf-8")) + 2

        # If a single entry is too big, still try to submit it alone.
        if batch and batch_bytes + entry_bytes > max_payload_bytes:
            post_entries(batch)
            sent_total += len(batch)
            batch = []
            batch_bytes = 0

        batch.append(entry)
        batch_bytes += entry_bytes

    if batch:
        post_entries(batch)
        sent_total += len(batch)

    print(f"[ai-log] Submitted total {sent_total} entries (chunked).", file=sys.stderr)


def main():
    if not SERVER_URL:
        print("[ai-log] AI_LOG_SERVER not set — skipping submission.", file=sys.stderr)
        sys.exit(0)

    if not LOG_FILE.exists() or LOG_FILE.stat().st_size == 0:
        print("[ai-log] No logs to submit.", file=sys.stderr)
        sys.exit(0)

    # Validate at least one entry exists
    first = next(iter_entries(), None)
    if not first:
        print("[ai-log] No valid entries to submit.", file=sys.stderr)
        sys.exit(0)

    max_payload_bytes = int(os.environ.get("AI_LOG_MAX_PAYLOAD_BYTES", DEFAULT_MAX_PAYLOAD_BYTES))

    try:
        # Try once with chunking to avoid 413 payload limits.
        submit_in_chunks(max_payload_bytes=max_payload_bytes)
    except urllib.error.URLError as e:
        print(f"[ai-log] Submit failed: {e} — logs kept locally.", file=sys.stderr)
        sys.exit(0)  # Don't block push on server error


if __name__ == "__main__":
    main()
