#!/usr/bin/env python3
"""Download pending gap52 source MP3s via mcp_drive_call (Drive MCP)."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
import time
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
WORK = Path("/tmp/gap52-work")
RESULTS = Path("/tmp/drive-inventory/results-19-21-f.csv")
MCP = Path(__file__).with_name("mcp_drive_call.py")
SLICE_START, SLICE_END = 726, 870


def load_done() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def load_tracks() -> list[dict]:
    lines = JSONL.read_text().strip().split("\n")
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def download_one(fid: str, retries: int = 5) -> bool:
    dest = WORK / f"{fid}.mp3"
    if dest.exists() and dest.stat().st_size > 100_000:
        return True
    for attempt in range(retries):
        try:
            subprocess.check_call(
                [sys.executable, str(MCP), "download", fid, str(dest)],
                timeout=600,
            )
            return dest.exists() and dest.stat().st_size > 100_000
        except subprocess.CalledProcessError as e:
            print("retry", fid, attempt, e, file=sys.stderr)
            time.sleep(min(30, 2 ** attempt))
        except RuntimeError as e:
            if "rate_limited" in str(e):
                time.sleep(30)
            else:
                raise
    return False


def main() -> None:
    done = load_done()
    pending = [t for t in load_tracks() if t["id"] not in done]
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    ok = fail = skip = 0
    for t in pending:
        if ok + fail >= limit:
            break
        fid = t["id"]
        dest = WORK / f"{fid}.mp3"
        if dest.exists() and dest.stat().st_size > 100_000:
            skip += 1
            continue
        print("dl", fid, t["title"][:50], flush=True)
        if download_one(fid):
            ok += 1
        else:
            fail += 1
        time.sleep(1.5)
    print(json.dumps({"ok": ok, "fail": fail, "skip": skip}))


if __name__ == "__main__":
    main()
