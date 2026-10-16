#!/usr/bin/env python3
"""Save MCP download output to MP3. Usage: save_download.py <tool_output.txt> <file_id>"""
import base64
import json
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text()
# May be JSON block or plain
if raw.strip().startswith("{"):
    data = json.loads(raw)
else:
    # find json in file
    start = raw.find("{")
    data = json.loads(raw[start:])
content = data.get("base64Content") or data.get("content") or data.get("data")
if not content and "file" in data:
    content = data["file"].get("base64Content")
out = Path(f"/tmp/gap15-work/{sys.argv[2]}.mp3")
out.write_bytes(base64.b64decode(content))
print(out, out.stat().st_size)
