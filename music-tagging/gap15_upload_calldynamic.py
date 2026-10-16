#!/usr/bin/env python3
"""Print CallDynamicTool create_file arguments JSON for a gap15 tagged track."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap15-work")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def main() -> None:
    sid = sys.argv[1]
    meta = json.loads((WORK / f"{sid}.json").read_text())
    tagged = WORK / f"{sid}.tagged.mp3"
    payload = {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
