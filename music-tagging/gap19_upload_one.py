#!/usr/bin/env python3
"""Print upload payload path for one tagged track (batch 48)."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
sid = sys.argv[1]
tagged = WORK / "tagged" / f"{sid}.mp3"
if not tagged.exists():
    tagged = WORK / f"{sid}.tagged.mp3"
meta = json.loads((WORK / f"{sid}.json").read_text())
out = WORK / "upload" / f"{sid}.json"
out.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "title": meta["filename"],
    "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
    "contentMimeType": "audio/mpeg",
    "disableConversionToGoogleType": True,
    "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
}
out.write_text(json.dumps(payload))
print(out, len(payload["base64Content"]))
