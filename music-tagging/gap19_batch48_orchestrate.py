#!/usr/bin/env python3
"""Batch 48 orchestration: next tracks needing cover/finalize."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-19-21-b.csv")
WORK = Path("/tmp/gap19-work")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
PIPE = Path(__file__).with_name("gap19_batch48.py")
JSONL = Path("/tmp/gap19-work/tracks-batch48.jsonl")


def tracks() -> list[dict]:
    return [json.loads(l) for l in JSONL.read_text().splitlines() if l.strip()]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 200:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def mp3_path(sid: str) -> Path:
    for p in (WORK / f"{sid}.mp3", WORK / "mp3" / f"{sid}.mp3"):
        if p.exists():
            return p
    return WORK / f"{sid}.mp3"


def cmd_needs_cover(n: int = 5) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done:
            continue
        meta = WORK / f"{sid}.json"
        if not meta.exists():
            continue
        if (COVERS_JPG / f"{sid}.jpg").exists():
            continue
        m = json.loads(meta.read_text())
        prompt = subprocess.check_output(["python3", str(PIPE), "prompt", sid], text=True).strip()
        print(json.dumps({"id": sid, "filename": m.get("filename"), "TIT2": m.get("TIT2"), "prompt": prompt}))
        n -= 1
        if n <= 0:
            break


def cmd_needs_finalize(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done:
            continue
        cover = COVERS_JPG / f"{sid}.jpg"
        png = WORK / "covers" / f"{sid}.png"
        art = cover if cover.exists() else png
        if mp3_path(sid).exists() and (WORK / f"{sid}.json").exists() and art.exists():
            print(sid, str(art))
            n -= 1
            if n <= 0:
                break


def cmd_needs_upload(n: int = 10) -> None:
    if not RESULTS.exists():
        return
    with open(RESULTS, newline="") as f:
        for r in csv.DictReader(f):
            if r.get("tagged_drive_id"):
                continue
            sid = r.get("source_drive_id")
            tagged = WORK / "tagged" / f"{sid}.mp3"
            if sid and tagged.exists():
                print(sid)
                n -= 1
                if n <= 0:
                    break


if __name__ == "__main__":
    c = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    if c == "needs-cover":
        cmd_needs_cover(n)
    elif c == "needs-finalize":
        cmd_needs_finalize(n)
    elif c == "needs-upload":
        cmd_needs_upload(n)
    else:
        print("needs-cover|needs-finalize|needs-upload")
