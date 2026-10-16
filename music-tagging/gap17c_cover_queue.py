#!/usr/bin/env python3
import json
from pathlib import Path

WORK = Path("/tmp/gap17-work/meta")
COVERS = Path("/workspace/music-tagging/covers/gap17")
OUT = Path("/tmp/gap17-work/cover-queue-c.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-17-19-c.csv")


def done_ids():
    if not RESULTS.exists():
        return set()
    import csv

    with RESULTS.open(newline="", encoding="utf-8") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def main():
    rows = []
    for meta_path in sorted(WORK.glob("*.json")):
        sid = meta_path.stem
        if sid in done_ids():
            continue
        if (COVERS / f"{sid}.jpg").exists():
            continue
        row = json.loads(meta_path.read_text())
        rows.append(
            {
                "id": sid,
                "filename": f"gap17-{sid}.png",
                "description": row["_cover_prompt"],
            }
        )
    OUT.write_text("\n".join(json.dumps(r) for r in rows) + ("\n" if rows else ""))
    print(len(rows), "queued")


if __name__ == "__main__":
    main()
