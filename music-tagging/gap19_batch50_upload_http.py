#!/usr/bin/env python3
"""Upload tagged MP3 via Cursor Google-drive MCP (HTTP + x-cursor-auth)."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

AUTH = "84853345af41156ef7cf69d2b0f77d8086dd06aa191a4b86e1caf03d7aa35c59"
URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
MAX_BODY = 4_200_000
WORK = Path("/tmp/gap19-work")
PATCH = Path(__file__).with_name("gap19_batch50_patch_csv.py")


def upload_sid(source_id: str) -> str:
    path = WORK / f"{source_id}.upload.json"
    if not path.exists():
        raise FileNotFoundError(path)
    args = json.loads(path.read_text())
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "create_file", "arguments": args},
    }
    data = json.dumps(body).encode()
    if len(data) > MAX_BODY:
        raise SystemExit(f"payload too large ({len(data)} bytes); use CallDynamicTool")
    req = urllib.request.Request(
        URL,
        data=data,
        headers={"Content-Type": "application/json", "x-cursor-auth": AUTH},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        raw = resp.read().decode()
    m = re.search(r'"id"\s*:\s*"([^"]+)"', raw)
    if not m:
        raise RuntimeError(f"upload failed: {raw[:800]}")
    return m.group(1)


def main() -> None:
    import subprocess

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    import csv

    results = Path("/tmp/drive-inventory/results-19-21-d.csv")
    sids: list[tuple[int, str]] = []
    with open(results, newline="") as f:
        for r in csv.DictReader(f):
            if r.get("batch") == "50" and not (r.get("tagged_drive_id") or "").strip():
                sid = r["source_drive_id"]
                up = WORK / f"{sid}.upload.json"
                if up.exists():
                    sids.append((up.stat().st_size, sid))
    sids.sort()
    sids = [sid for _, sid in sids]
    ok = fail = 0
    for sid in sids[:limit]:
        try:
            fid = upload_sid(sid)
            subprocess.check_call([sys.executable, str(PATCH), sid, fid])
            print("ok", sid, fid)
            ok += 1
        except Exception as e:
            print("fail", sid, e)
            fail += 1
    print(json.dumps({"uploaded": ok, "failed": fail}))


if __name__ == "__main__":
    main()
