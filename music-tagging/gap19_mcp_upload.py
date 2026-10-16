#!/usr/bin/env python3
"""Upload tagged MP3 via Google Drive MCP using agent dynamic tool bridge."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap19-work")


def payload_for(sid: str) -> dict:
    tagged = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }


def main() -> None:
    sid = sys.argv[1]
    out = WORK / "mcp_upload_queue" / f"{sid}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = payload_for(sid)
    out.write_text(json.dumps(payload))
    print(json.dumps({"queue": str(out), "title": payload["title"], "b64_len": len(payload["base64Content"])}))


if __name__ == "__main__":
    main()
