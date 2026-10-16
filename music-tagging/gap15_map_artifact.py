#!/usr/bin/env python3
"""Map gap15 artifact prefix to full source_drive_id."""
import json
import sys
from pathlib import Path

prefix = sys.argv[1]
lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
ids = [json.loads(lines[i - 1])["id"] for i in range(190, 252)]
matches = [i for i in ids if i.startswith(prefix)]
if len(matches) == 1:
    print(matches[0])
elif len(matches) > 1:
    print(matches[0])
    sys.exit(0)
else:
    sys.exit(1)
