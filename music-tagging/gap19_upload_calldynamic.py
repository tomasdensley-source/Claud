#!/usr/bin/env python3
"""Print CallDynamicTool create_file arguments JSON for a tagged track (stdout)."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def main() -> None:
    sid = sys.argv[1]
    cmd_path = WORK / f"{sid}.upload_cmd.json"
    if cmd_path.exists():
        print(cmd_path.read_text())
        return
    meta = json.loads((WORK / f"{sid}.json").read_text())
    tagged = WORK / "tagged" / f"{sid}.mp3"
    if not tagged.exists():
        tagged = WORK / f"{sid}.tagged.mp3"
    payload = {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    print(json.dumps({"namespace": "Google-drive", "toolName": "create_file", "arguments": payload}))


if __name__ == "__main__":
    main()
