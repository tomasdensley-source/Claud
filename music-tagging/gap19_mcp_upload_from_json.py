#!/usr/bin/env python3
"""Load upload JSON and emit create_file args for agent CallDynamicTool (stdout metadata only)."""
import json
import sys
from pathlib import Path

p = Path(sys.argv[1])
d = json.loads(p.read_text())
# Agent must CallDynamicTool with full dict; this script validates size.
print(json.dumps({"title": d["title"], "b64_len": len(d.get("base64Content", ""))}))
