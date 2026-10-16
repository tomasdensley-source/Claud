#!/usr/bin/env python3
"""Download missing slice 75-148 MP3s via YouTube id from Drive title."""
import csv
import json
import subprocess
import sys
import time
from pathlib import Path

from gap17_ytdlp_fallback import fetch

JSONL = Path("/tmp/drive-inventory/gap-17-19.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-17-19-b.csv")
WORK = Path("/tmp/gap17-work")


def done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def tracks() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(75, 149)]


def main() -> None:
    done = done_ids()
    ok = fail = skip = 0
    for t in tracks():
        sid = t["id"]
        if sid in done:
            skip += 1
            continue
        mp3 = WORK / f"{sid}.mp3"
        if mp3.exists() and mp3.stat().st_size > 5000:
            skip += 1
            continue
        try:
            fetch(sid, t["title"])
            print("ok", sid, flush=True)
            ok += 1
            time.sleep(0.5)
        except subprocess.CalledProcessError as e:
            print("fail", sid, e, flush=True)
            fail += 1
        except SystemExit as e:
            print("fail", sid, e, flush=True)
            fail += 1
    print(json.dumps({"ok": ok, "fail": fail, "skip": skip}))


if __name__ == "__main__":
    main()
