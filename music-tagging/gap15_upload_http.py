#!/usr/bin/env python3
"""Upload tagged MP3 via Cursor Google-drive MCP (HTTP + x-cursor-auth)."""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

AUTH = "84853345af41156ef7cf69d2b0f77d8086dd06aa191a4b86e1caf03d7aa35c59"
URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
MAX_BODY = 4_200_000  # Cursor MCP HTTP limit (~4MB)


def upload(source_id: str) -> str:
    args = json.loads(Path(f"/tmp/gap15-work/{source_id}.upload.json").read_text())
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "create_file", "arguments": args},
    }
    data = json.dumps(body).encode()
    if len(data) > MAX_BODY:
        raise SystemExit(f"payload too large ({len(data)} bytes); use CallDynamicTool")
    req = urllib.request.Request(
        URL,
        data=data,
        headers={"Content-Type": "application/json", "x-cursor-auth": AUTH},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = resp.read().decode()
    # parse file id from MCP response text
    if "id" in raw:
        import re

        m = re.search(r'"id"\s*:\s*"([^"]+)"', raw)
        if m:
            return m.group(1)
    print(raw[:1000])
    raise SystemExit("upload failed")


if __name__ == "__main__":
    print(upload(sys.argv[1]))
