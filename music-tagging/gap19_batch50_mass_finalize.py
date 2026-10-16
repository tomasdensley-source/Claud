#!/usr/bin/env python3
"""Finalize every batch-50 track that has a cover JPG in artifacts/assets."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

TRACKS = Path("/tmp/gap19-work/tracks_batch50.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-19-21-d.csv")
ART = Path("/opt/cursor/artifacts/assets")
FINISH = Path(__file__).with_name("gap19_batch50_finish.py")


def done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def main() -> None:
    tracks = [json.loads(l) for l in TRACKS.read_text().splitlines() if l.strip()]
    done = done_ids()
    n = 0
    for t in tracks:
        sid = t["id"]
        if sid in done:
            continue
        art = ART / f"{sid}.jpg"
        if not art.exists():
            continue
        subprocess.check_call([sys.executable, str(FINISH), sid, str(art), ""])
        done.add(sid)
        n += 1
    print(json.dumps({"finalized": n, "csv_rows": len(done)}))


if __name__ == "__main__":
    main()
