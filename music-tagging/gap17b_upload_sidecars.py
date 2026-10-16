#!/usr/bin/env python3
"""Write create_file upload JSON sidecars for all slice tagged MP3s missing tagged_drive_id."""
import csv
import json
import subprocess
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-17-19-b.csv")
WORK = Path("/tmp/gap17-work")


def main() -> None:
    rows = list(csv.DictReader(RESULTS.open()))
    n = 0
    for r in rows:
        sid = r["source_drive_id"]
        if r.get("tagged_drive_id") and r["tagged_drive_id"] not in ("", "placeholder"):
            continue
        tagged = WORK / f"{sid}.tagged.mp3"
        if not tagged.exists():
            continue
        subprocess.run(["python3", str(Path(__file__).with_name("gap17_upload.py")), sid], check=False)
        n += 1
    print(json.dumps({"sidecars_written": n}))


if __name__ == "__main__":
    main()
