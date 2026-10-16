#!/usr/bin/env python3
"""Upload tagged MP3 to Google Drive tagged folder via MCP-style HTTP if available."""
import base64
import json
import sys
from pathlib import Path

# Placeholder: write metadata for agent upload batch
mp3 = Path(sys.argv[1])
meta = {"title": sys.argv[2], "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q", "size": mp3.stat().st_size}
out = Path(f"/tmp/gap15-work/{sys.argv[3]}.upload.json")
out.write_text(json.dumps({"title": meta["title"], "parentId": meta["parentId"], "contentMimeType": "audio/mpeg", "disableConversionToGoogleType": True, "b64_path": str(mp3.with_suffix(".upload.b64"))}))
print(out)
