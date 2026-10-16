#!/usr/bin/env python3
"""Print create_file args JSON for one tagged upload (for MCP)."""
import json
import sys
from pathlib import Path

sid = sys.argv[1]
u = json.loads(Path(f"/tmp/gap19-work/{sid}.upload.json").read_text())
print(json.dumps({
    "title": u["title"],
    "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
    "contentMimeType": "audio/mpeg",
    "disableConversionToGoogleType": True,
    "base64Content": u["base64Content"],
}))
