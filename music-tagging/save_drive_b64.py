#!/usr/bin/env python3
"""Save Google Drive download_file_content JSON to MP3."""
import base64
import json
import sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
obj = json.loads(src.read_text())
content = obj.get("content") or obj.get("base64Content") or obj.get("data")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(base64.b64decode(content))
print(out, out.stat().st_size)
