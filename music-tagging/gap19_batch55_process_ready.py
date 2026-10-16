#!/usr/bin/env python3
"""Finalize tracks with cover art in artifacts; upload when MCP payload is small enough."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ART = Path("/opt/cursor/artifacts/assets")
WORK = Path("/tmp/gap19-work")
FINISH = Path(__file__).with_name("gap19_batch55_finish.py")
MCP = Path(__file__).with_name("mcp_drive_call.py")
PIPE = Path(__file__).with_name("gap19_batch55.py")
MAX_UPLOAD = 4_500_000  # tagged mp3 bytes; ~6MB base64 stays under MCP 413


def cover_for(sid: str) -> Path | None:
    for ext in (".jpg", ".png", ".webp"):
        p = ART / f"{sid}{ext}"
        if p.exists():
            return p
    return None


def upload_one(sid: str) -> str:
    up = WORK / f"{sid}.upload.json"
    if not up.exists():
        raise FileNotFoundError(up)
    raw = subprocess.check_output(
        [sys.executable, str(MCP), "create-from-upload-json", str(up)],
        text=True,
    )
    data = json.loads(raw)
    if "error" in data:
        raise RuntimeError(data)
    inner = data
    if "result" in data:
        content = data["result"].get("content") or []
        for block in content:
            if block.get("type") == "text":
                inner = json.loads(block["text"])
                break
    fid = inner.get("id")
    if not fid:
        raise RuntimeError(f"no id in {raw[:500]}")
    subprocess.check_call([sys.executable, str(PIPE), "set-tagged", sid, fid])
    return fid


def process_one(sid: str) -> dict:
    cover = cover_for(sid)
    if not cover:
        return {"id": sid, "status": "no_cover"}
    tagged = WORK / f"{sid}.tagged.mp3"
    if not tagged.exists():
        subprocess.check_call([sys.executable, str(FINISH), sid, str(cover)])
    size = tagged.stat().st_size
    if size > MAX_UPLOAD:
        return {"id": sid, "status": "needs_agent_upload", "bytes": size}
    try:
        fid = upload_one(sid)
        return {"id": sid, "status": "uploaded", "tagged_drive_id": fid}
    except Exception as e:
        return {"id": sid, "status": "upload_fail", "error": str(e)[:200], "bytes": size}


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] != "--all-artifacts":
        for sid in sys.argv[1:]:
            print(json.dumps(process_one(sid)))
        return
    # all artifact covers not yet in csv
    import csv

    results = Path("/tmp/drive-inventory/results-19-21-i.csv")
    done = set()
    if results.exists():
        with open(results, newline="") as f:
            done = {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}
    for p in sorted(ART.glob("*")):
        sid = p.stem
        if sid in done:
            continue
        if not (WORK / f"{sid}.json").exists():
            continue
        if p.suffix.lower() not in (".jpg", ".png", ".webp"):
            continue
        print(json.dumps(process_one(sid)))


if __name__ == "__main__":
    main()
