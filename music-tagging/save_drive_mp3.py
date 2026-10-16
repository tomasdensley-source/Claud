#!/usr/bin/env python3
"""Decode Google-drive download_file_content JSON to MP3."""
import base64
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
out.write_bytes(base64.b64decode(data["content"]))
print(out, out.stat().st_size)
