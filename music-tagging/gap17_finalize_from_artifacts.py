#!/usr/bin/env python3
"""Finalize slice tracks when cover JPG exists in artifacts/assets/{id}.jpg"""
import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-17-19.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-17-19-f.csv")
WORK = Path("/tmp/gap17-work")
ART = Path("/opt/cursor/artifacts/assets")
SLICE = (371, 444)


def slice_ids() -> list[str]:
    lines = JSONL.read_text().splitlines()
    a, b = SLICE
    return [json.loads(lines[i - 1])["id"] for i in range(a, b + 1)]


def done() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def main() -> None:
    n = 0
    for sid in slice_ids():
        if sid in done():
            continue
        cover = ART / f"{sid}.jpg"
        mp3 = WORK / f"{sid}.mp3"
        meta = WORK / f"{sid}.json"
        if not (cover.exists() and mp3.exists() and meta.exists()):
            continue
        r = subprocess.run(
            [
                "python3",
                "/workspace/music-tagging/gap17_batch44.py",
                "finalize",
                sid,
                str(mp3),
                str(cover),
            ],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0:
            n += 1
            print("finalized", sid)
        else:
            print("fail", sid, r.stderr[:200])
    print("total finalized", n)


if __name__ == "__main__":
    main()
