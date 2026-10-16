#!/usr/bin/env python3
"""Save Google-drive download_file_content tool output to MP3."""
import base64
import json
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text()
# Tool output may be JSON wrapped in markdown code block
if raw.strip().startswith("```"):
    raw = raw.split("```", 2)[1]
    if raw.startswith("json"):
        raw = raw[4:]
obj = json.loads(raw.strip())
fid = sys.argv[2] if len(sys.argv) > 2 else obj.get("id", "unknown")
content = obj.get("content") or obj.get("base64Content") or obj.get("data")
if not content:
    raise SystemExit(f"No content in {sys.argv[1]}")
out = Path(f"/tmp/gap19-work/mp3/{fid}.mp3")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(base64.b64decode(content))
print(out, out.stat().st_size)
