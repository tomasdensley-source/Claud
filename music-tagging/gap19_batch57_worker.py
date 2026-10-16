#!/usr/bin/env python3
"""Process batch-57 tracks: analyze when MP3 exists; print cover/upload queues."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
SLICE = (1451, 1595)
MP3 = Path("/tmp/gap19-work/mp3")
WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-k.csv")
PIPE = Path(__file__).with_name("gap19_batch57.py")


def tracks() -> list[dict]:
    lines = JSONL.read_text().strip().split("\n")
    return [json.loads(lines[i - 1]) for i in range(SLICE[0], SLICE[1] + 1)]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 500:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def analyze_pending(limit: int = 20) -> int:
    done = done_ids()
    n = 0
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        mp3 = MP3 / f"{sid}.mp3"
        meta = WORK / f"{sid}.json"
        if mp3.exists() and mp3.stat().st_size > 10000 and not meta.exists():
            subprocess.run(
                ["python3", str(PIPE), "analyze", sid, str(mp3), t["title"]],
                check=True,
            )
            n += 1
            if n >= limit:
                break
    return n


def list_needs_cover(limit: int = 10) -> None:
    done = done_ids()
    n = 0
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        if (WORK / f"{sid}.json").exists() and not (COVERS / f"{sid}.jpg").exists():
            print(sid)
            n += 1
            if n >= limit:
                break


def list_needs_upload(limit: int = 10) -> None:
    if not RESULTS.exists():
        return
    n = 0
    with open(RESULTS, newline="") as f:
        for r in csv.DictReader(f):
            sid = r.get("source_drive_id", "")
            if sid and not r.get("tagged_drive_id") and (WORK / f"{sid}.tagged.mp3").exists():
                print(sid)
                n += 1
                if n >= limit:
                    break


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("analyze-pending|needs-cover|needs-upload")
        sys.exit(1)
    c = sys.argv[1]
    if c == "analyze-pending":
        print(analyze_pending(int(sys.argv[2]) if len(sys.argv) > 2 else 20))
    elif c == "needs-cover":
        list_needs_cover(int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    elif c == "needs-upload":
        list_needs_upload(int(sys.argv[2]) if len(sys.argv) > 2 else 10)
