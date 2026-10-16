#!/usr/bin/env python3
"""List slice tracks missing cover art in artifacts/assets."""
import json
from pathlib import Path

lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
ids = [json.loads(lines[i - 1])["id"] for i in range(127, 190)]
assets = Path("/opt/cursor/artifacts/assets")
missing = []
for sid in ids:
    if not any((assets / f"{sid}{ext}").exists() for ext in (".jpg", ".jpeg", ".png", ".webp")):
        missing.append(sid)
print(len(missing), "missing covers")
for sid in missing:
    print(sid)
