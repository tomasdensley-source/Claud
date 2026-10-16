#!/usr/bin/env python3
"""Batch 58: finalize tracks that have cover PNG/JPG in artifacts; prep upload JSON."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ART = Path("/opt/cursor/artifacts/assets")
WORK = Path("/tmp/gap19-work/mp3")
PIPE = Path("/workspace/music-tagging/gap19_batch58_l.py")
RESULTS = Path("/tmp/drive-inventory/results-19-21-l.csv")


def done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    import csv

    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def cover_for(sid: str) -> Path | None:
    for ext in ("jpg", "png", "webp"):
        p = ART / f"{sid}-cover.{ext}"
        if p.exists():
            return p
    return None


def main() -> None:
    pending = []
    for line in subprocess.check_output([sys.executable, str(PIPE), "list-pending"], text=True).splitlines():
        sid = line.split()[0]
        pending.append(sid)
    finalized = 0
    for sid in pending:
        if sid in done_ids():
            continue
        cov = cover_for(sid)
        mp3 = WORK / f"{sid}.mp3"
        meta = WORK / f"{sid}.json"
        if not cov or not mp3.exists() or not meta.exists():
            continue
        subprocess.check_call(
            [sys.executable, str(PIPE), "finalize", sid, str(mp3), str(cov), ""]
        )
        subprocess.check_call([sys.executable, str(PIPE), "upload-prep", sid])
        finalized += 1
    print(json.dumps({"finalized": finalized, "pending": len(pending)}))


if __name__ == "__main__":
    main()
