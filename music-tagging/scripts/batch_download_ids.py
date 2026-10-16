#!/usr/bin/env python3
import json
from pathlib import Path

lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
ids = [json.loads(lines[i - 1])["id"] for i in range(190, 252)]
work = Path("/tmp/gap15-work")
for tid in ids:
    if not (work / f"{tid}.mp3").exists():
        print(tid)
