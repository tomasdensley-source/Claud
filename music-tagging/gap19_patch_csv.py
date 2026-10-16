#!/usr/bin/env python3
"""Patch tagged_drive_id on an existing results CSV row."""
import csv
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-19-21-a.csv")


def main() -> None:
    sid, tagged = sys.argv[1], sys.argv[2]
    rows = []
    with open(RESULTS, newline="") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        for r in reader:
            if r.get("source_drive_id") == sid:
                r["tagged_drive_id"] = tagged
            rows.append(r)
    with open(RESULTS, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print("patched", sid, tagged)


if __name__ == "__main__":
    main()
