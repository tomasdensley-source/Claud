#!/usr/bin/env python3
"""Write Google-drive create_file args to /tmp/mcp-create-args.json for agent CallDynamicTool."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
OUT = Path("/tmp/mcp-create-args.json")


def main() -> None:
    sid = sys.argv[1]
    up = WORK / f"{sid}.upload.json"
    if up.exists():
        args = json.loads(up.read_text())
    else:
        meta = json.loads((WORK / f"{sid}.json").read_text())
        mp3 = WORK / f"{sid}.tagged.mp3"
        args = {
            "title": meta["filename"],
            "parentId": PARENT,
            "contentMimeType": "audio/mpeg",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
        }
    OUT.write_text(json.dumps(args))
    print(json.dumps({"path": str(OUT), "b64_len": len(args["base64Content"]), "title": args["title"]}))


if __name__ == "__main__":
    main()
