#!/usr/bin/env python3
"""Try unix-socket MCP bridge upload; else write upload json for CallDynamicTool."""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Reuse gap52 bridge
sys.path.insert(0, str(Path(__file__).parent))
import gap52_upload as bridge

bridge.WORK = Path("/tmp/gap17-work")


def main() -> None:
    sid = sys.argv[1]
    upload_json = Path(f"/tmp/gap17-work/{sid}.upload.json")
    if upload_json.exists():
        payload = json.loads(upload_json.read_text())
        result = bridge.try_mcp_call(payload)
    else:
        payload = bridge.payload_for_sid(sid)
        result = bridge.try_mcp_call(payload)
    file_id = None
    if isinstance(result, dict):
        file_id = result.get("id")
        if not file_id and isinstance(result.get("result"), dict):
            file_id = result["result"].get("id")
    if file_id:
        print(json.dumps({"ok": True, "tagged_drive_id": file_id}))
        return
    if not upload_json.exists():
        upload_json.write_text(json.dumps(payload))
    print(json.dumps({"ok": False, "upload_json": str(upload_json), "raw": result}))


if __name__ == "__main__":
    main()
