#!/usr/bin/env python3
import base64
import json
import sys
from pathlib import Path

sid = sys.argv[1]
mp3 = Path(f"/tmp/gap17-work/tagged/{sid}.mp3")
meta = json.loads(Path(f"/tmp/gap17-work/meta/{sid}.json").read_text())
print(
    json.dumps(
        {
            "title": meta["filename"],
            "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
            "contentMimeType": "audio/mpeg",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
        }
    )
)
