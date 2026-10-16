#!/usr/bin/env python3
"""Generate cover prompts JSONL for pending tracks (for GenerateImage batch)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap17_batch39 import COVERS, WORK, cover_prompt, load_done_ids, load_tracks

OUT = Path("/tmp/gap17-cover-queue.jsonl")


def main():
    rows = []
    for t in load_tracks():
        sid = t["id"]
        if sid in load_done_ids():
            continue
        meta = WORK / f"{sid}.json"
        if not meta.exists():
            continue
        if (COVERS / f"{sid}.jpg").exists():
            continue
        row = json.loads(meta.read_text())
        rows.append(
            {
                "id": sid,
                "filename": f"{sid}.png",
                "description": cover_prompt(row),
                "title": row["TIT2"],
                "artist": row["_cover_artist"],
            }
        )
    OUT.write_text("\n".join(json.dumps(r) for r in rows))
    print(len(rows), "covers queued ->", OUT)


if __name__ == "__main__":
    main()
