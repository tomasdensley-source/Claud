#!/usr/bin/env python3
"""Upload batch-53 tagged MP3 via mcp_drive_call.py."""
from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

MP3 = Path("/tmp/gap19-work/mp3")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
MCP = Path(__file__).with_name("mcp_drive_call.py")


def upload(source_id: str) -> str:
    tagged = MP3 / f"{source_id}.tagged.mp3"
    meta = json.loads((MP3 / f"{source_id}.json").read_text())
    payload = {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    up = MP3 / f"{source_id}.upload.json"
    up.write_text(json.dumps(payload))
    out = subprocess.check_output(
        [sys.executable, str(MCP), "create-from-upload-json", str(up)],
        text=True,
    )
    result = json.loads(out)
    # MCP JSON-RPC wrapper
    if "result" in result:
        content = result["result"].get("content") or []
        for block in content:
            if block.get("type") == "text":
                inner = json.loads(block["text"])
                if inner.get("id"):
                    return inner["id"]
        if isinstance(result["result"], dict) and result["result"].get("id"):
            return result["result"]["id"]
    if result.get("id"):
        return result["id"]
    raise RuntimeError(f"Upload failed: {out[:2000]}")


if __name__ == "__main__":
    tid = upload(sys.argv[1])
    print(tid)
