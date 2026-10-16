#!/usr/bin/env python3
"""Emit Google-drive create_file payload size; agent must CallDynamicTool with upload JSON."""
from __future__ import annotations

import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")


def main() -> None:
    sid = sys.argv[1]
    p = WORK / "upload" / f"{sid}.json"
    if not p.exists():
        raise SystemExit(f"missing {p}; run gap19_upload_one.py {sid}")
    payload = json.loads(p.read_text())
    print(
        json.dumps(
            {
                "namespace": "Google-drive",
                "toolName": "create_file",
                "arguments": payload,
                "b64_len": len(payload["base64Content"]),
                "upload_json": str(p),
            }
        )
    )


if __name__ == "__main__":
    main()
