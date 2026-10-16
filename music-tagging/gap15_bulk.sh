#!/bin/bash
# List missing source IDs (lines 1-63) for MCP download
python3 << 'PY'
import json
from pathlib import Path
lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()[:63]
have = {p.stem for p in Path("/tmp/gap15-work").glob("*.mp3")}
for line in lines:
    t = json.loads(line)
    if t["id"] not in have:
        print(t["id"])
PY
