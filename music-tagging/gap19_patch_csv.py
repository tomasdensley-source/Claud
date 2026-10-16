#!/usr/bin/env python3
"""Set tagged_drive_id on an existing results row."""
import csv
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-19-21-b.csv")
sid, tid = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(RESULTS.open()))
fields = rows[0].keys() if rows else []
with open(RESULTS, newline="") as f:
    fields = next(csv.reader(f))
rows = list(csv.DictReader(RESULTS.open()))
for r in rows:
    if r.get("source_drive_id") == sid:
        r["tagged_drive_id"] = tid
with open(RESULTS, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_MINIMAL)
    w.writeheader()
    w.writerows(rows)
print("patched", sid, tid)
