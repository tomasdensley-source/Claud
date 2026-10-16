#!/usr/bin/env python3
"""Print cover generation queue: id, filename for meta without jpg cover."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap17_batch39 import COVERS, WORK, cover_prompt, load_done_ids, load_tracks


def main():
    done = load_done_ids()
    for t in load_tracks():
        sid = t["id"]
        if sid in done:
            continue
        meta = WORK / f"{sid}.json"
        if not meta.exists():
            continue
        jpg = COVERS / f"{sid}.jpg"
        if jpg.exists():
            continue
        row = json.loads(meta.read_text())
        print(sid)
        print(cover_prompt(row))
        print("---")


if __name__ == "__main__":
    main()
