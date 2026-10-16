#!/usr/bin/env python3
"""Fetch gap52 pending tracks via YouTube id (filename bracket)."""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
WORK = Path("/tmp/gap52-work")
RESULTS = Path("/tmp/drive-inventory/results-19-21-f.csv")
YTDLP = "/home/ubuntu/.local/bin/yt-dlp"
SLICE_START, SLICE_END = 726, 870


def yt_id(title: str) -> str | None:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]", title)
    return m.group(1) if m else None


def load_done() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def load_tracks() -> list[dict]:
    lines = JSONL.read_text().strip().split("\n")
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def fetch_one(fid: str, title: str) -> bool:
    dest = WORK / f"{fid}.mp3"
    if dest.exists() and dest.stat().st_size > 100_000:
        return True
    vid = yt_id(title)
    if not vid:
        print("no_yt", fid, title[:50], file=sys.stderr)
        return False
    tmp = WORK / f"{fid}.part.mp3"
    url = f"https://www.youtube.com/watch?v={vid}"
    cmd = [
        YTDLP,
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        str(tmp.with_suffix(".%(ext)s")),
        url,
    ]
    print("fetch", fid, vid, flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("fail", fid, r.stderr[-500:], file=sys.stderr)
        return False
    for p in WORK.glob(f"{fid}.part.*"):
        if p.suffix.lower() in (".mp3", ".m4a", ".webm", ".opus"):
            p.rename(dest)
            print("saved", dest, dest.stat().st_size, flush=True)
            return True
    if tmp.exists():
        tmp.rename(dest)
        return True
    print("missing_out", fid, file=sys.stderr)
    return False


def main() -> None:
    done = load_done()
    pending = [t for t in load_tracks() if t["id"] not in done]
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(pending)
    ok = fail = skip = 0
    for t in pending[:limit]:
        dest = WORK / f"{t['id']}.mp3"
        if dest.exists() and dest.stat().st_size > 100_000:
            skip += 1
            continue
        if fetch_one(t["id"], t["title"]):
            ok += 1
        else:
            fail += 1
    print(json.dumps({"ok": ok, "fail": fail, "skip": skip, "pending": len(pending)}))


if __name__ == "__main__":
    main()
