#!/usr/bin/env python3
"""Update tagged_drive_id in results-17-19-b.csv for a source_drive_id."""
import csv
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-17-19-b.csv")


def main() -> None:
    sid, tid = sys.argv[1], sys.argv[2]
    rows = []
    with open(RESULTS, newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for r in reader:
            if r.get("source_drive_id") == sid:
                r["tagged_drive_id"] = tid
            rows.append(r)
    with open(RESULTS, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)
    print("updated", sid, tid)


if __name__ == "__main__":
    main()
