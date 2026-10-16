#!/usr/bin/env python3
import base64
import json
import sys
from pathlib import Path

src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
obj = json.loads(src.read_text())
fid = obj.get("id", "unknown")
out = out_dir / f"{fid}.mp3"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(base64.b64decode(obj["content"]))
print(fid, out, out.stat().st_size)
