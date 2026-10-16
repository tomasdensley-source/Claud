#!/usr/bin/env python3
"""Extract MP3 from agent-tools download_file_content output."""
import base64
import json
import sys
from pathlib import Path

tool_out, dest = Path(sys.argv[1]), Path(sys.argv[2])
text = tool_out.read_text()
obj = json.loads(text)
fid = obj.get("id") or dest.stem
content = obj["content"]
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_bytes(base64.b64decode(content))
print(fid, dest.stat().st_size)
