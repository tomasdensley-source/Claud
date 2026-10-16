#!/usr/bin/env python3
"""Finalize tracks that have meta + generated cover PNG in artifacts."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap17_batch39 import WORK, COVERS, load_done_ids, load_tracks, cmd_finalize

ARTIFACTS = Path("/opt/cursor/artifacts/assets")


def find_cover(sid: str) -> Path | None:
    for ext in (".jpg", ".png", ".webp"):
        p = ARTIFACTS / f"{sid}{ext}"
        if p.exists():
            return p
    jpg = COVERS / f"{sid}.jpg"
    if jpg.exists():
        return jpg
    return None


def main():
    done = load_done_ids()
    n = 0
    for t in load_tracks():
        sid = t["id"]
        if sid in done:
            continue
        meta = WORK / f"{sid}.json"
        mp3 = WORK / f"{sid}.mp3"
        if not meta.exists() or not mp3.exists():
            continue
        cover = find_cover(sid)
        if not cover:
            continue
        cmd_finalize(sid, mp3, cover, "")
        n += 1
        print("finalized", sid, t["title"][:40])
    print("count", n)


if __name__ == "__main__":
    main()
