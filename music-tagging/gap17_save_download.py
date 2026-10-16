#!/usr/bin/env python3
"""Save Google Drive download_file_content JSON to MP3."""
import base64
import json
import sys
from pathlib import Path

obj = json.loads(Path(sys.argv[1]).read_text())
fid = sys.argv[2] if len(sys.argv) > 2 else obj.get("id", "out")
out = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(f"/tmp/gap17-work/{fid}.mp3")
content = obj.get("content") or obj.get("base64Content") or ""
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(base64.b64decode(content))
print(out, out.stat().st_size)
