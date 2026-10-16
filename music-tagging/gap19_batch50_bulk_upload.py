#!/usr/bin/env python3
"""Upload batch-50 tagged MP3s and patch CSV with tagged_drive_id."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-19-21-d.csv")
WORK = Path("/tmp/gap19-work")
UPLOAD = Path(__file__).with_name("gap19_upload_mcp.py")
PATCH = Path(__file__).with_name("gap19_batch50_patch_csv.py")


def rows_needing_upload() -> list[str]:
    if not RESULTS.exists():
        return []
    with open(RESULTS, newline="") as f:
        rows = list(csv.DictReader(f))
    return [
        r["source_drive_id"]
        for r in rows
        if r.get("batch") == "50" and not (r.get("tagged_drive_id") or "").strip()
    ]


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    sids = rows_needing_upload()[:limit]
    ok, fail = 0, 0
    for sid in sids:
        tagged = WORK / f"{sid}.tagged.mp3"
        if not tagged.exists():
            print("skip no tagged", sid)
            fail += 1
            continue
        try:
            out = subprocess.check_output(
                [sys.executable, str(UPLOAD), sid], text=True, stderr=subprocess.STDOUT
            )
            data = json.loads(out.strip().splitlines()[-1])
            tid = data.get("tagged_drive_id")
            if not tid:
                print("fail", sid, out[:300])
                fail += 1
                continue
            subprocess.check_call([sys.executable, str(PATCH), sid, tid])
            ok += 1
            print("ok", sid, tid)
        except Exception as e:
            print("err", sid, e)
            fail += 1
    print(json.dumps({"uploaded": ok, "failed": fail, "remaining": len(rows_needing_upload())}))


if __name__ == "__main__":
    main()
