#!/usr/bin/env python3
"""Extract MP3 from Google-drive download_file_content tool output JSON file."""
import base64
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
out = Path(sys.argv[2])
obj = json.loads(src.read_text())
fid = obj.get("id", out.stem)
content = obj["content"]
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(base64.b64decode(content))
print(fid, out, len(out.read_bytes()))
