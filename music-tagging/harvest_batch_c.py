#!/usr/bin/env python3
"""Force-harvest batch-c drive IDs from agent-tools outputs."""
import base64
import json
import re
from pathlib import Path

BATCH_IDS = {line.strip() for line in open("/tmp/gap17-missing-ids.txt") if line.strip()}
# include all batch ids
import json as js
BATCH_IDS |= {js.loads(l)["id"] for l in open("/tmp/gap-batch-c.jsonl")}
TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap17-work/mp3")
OUT.mkdir(parents=True, exist_ok=True)
found = set()
for f in sorted(TOOLS.glob("*.txt"), key=lambda p: p.stat().st_mtime, reverse=True):
    try:
        raw = f.read_text()
        if not any(i in raw for i in BATCH_IDS):
            continue
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```\s*$", "", raw)
        obj = json.loads(raw)
        fid = obj.get("id")
        content = obj.get("content")
        if fid not in BATCH_IDS or not content:
            continue
        dest = OUT / f"{fid}.mp3"
        dest.write_bytes(base64.b64decode(content))
        found.add(fid)
    except Exception:
        pass
ids = {js.loads(l)["id"] for l in open("/tmp/gap-batch-c.jsonl")}
missing = sorted(ids - found)
print("saved", len(found), "of", len(ids), "missing", len(missing))
if missing[:5]:
    print("sample missing", missing[:5])
