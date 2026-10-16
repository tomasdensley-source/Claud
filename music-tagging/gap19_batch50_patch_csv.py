#!/usr/bin/env python3
"""Set tagged_drive_id on an existing CSV row (batch 50)."""
import csv
import json
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-19-21-d.csv")
WORK = Path("/tmp/gap19-work")


def patch(source_id: str, tagged_id: str) -> None:
    rows = []
    with open(RESULTS, newline="") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        for r in reader:
            if r.get("source_drive_id") == source_id:
                r["tagged_drive_id"] = tagged_id
            rows.append(r)
    with open(RESULTS, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    meta = WORK / f"{source_id}.json"
    if meta.exists():
        m = json.loads(meta.read_text())
        m["tagged_drive_id"] = tagged_id
        meta.write_text(json.dumps(m, indent=2))


if __name__ == "__main__":
    patch(sys.argv[1], sys.argv[2])
    print("ok", sys.argv[1], sys.argv[2])
