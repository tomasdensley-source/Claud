#!/usr/bin/env python3
"""Upload gap52 tagged MP3 via CallDynamicTool-compatible JSON stdout (agent invokes MCP)."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap52-work")


def payload(sid: str) -> dict:
    mp3 = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }


def main() -> None:
    sid = sys.argv[1]
    out = WORK / "upload" / f"{sid}.mcp-invoke.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    p = payload(sid)
    out.write_text(json.dumps({"namespace": "Google-drive", "toolName": "create_file", "arguments": p}))
    print(json.dumps({"path": str(out), "b64_len": len(p["base64Content"]), "bytes": (WORK / f"{sid}.tagged.mp3").stat().st_size}))


if __name__ == "__main__":
    main()
