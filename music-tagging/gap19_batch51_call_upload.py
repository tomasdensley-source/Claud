#!/usr/bin/env python3
"""Prepare Google-drive create_file payload; agent must CallDynamicTool with returned path.

Shell MCP (OIDC) cannot authenticate to rest-mcp/google-drive; only CallDynamicTool works.
This script writes /tmp/gap19-work/<id>.upload.json and prints metadata for the next MCP call.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
PIPE = Path(__file__).with_name("gap19_batch51.py")


def main() -> None:
    sid = sys.argv[1]
    prep = subprocess.check_output(["python3", str(PIPE), "upload-json", sid], text=True).strip().split()[-1]
    payload = json.loads(Path(prep).read_text())
    meta = json.loads((WORK / f"{sid}.json").read_text())
    print(
        json.dumps(
            {
                "namespace": "Google-drive",
                "toolName": "create_file",
                "arguments": payload,
                "b64_len": len(payload["base64Content"]),
                "filename": meta["filename"],
                "upload_json": prep,
            }
        )
    )


if __name__ == "__main__":
    main()
