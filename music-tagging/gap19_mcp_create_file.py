#!/usr/bin/env python3
"""Invoke Google-drive create_file via MCP Streamable HTTP (uses agent session cookies if set)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"


def load_payload(path: Path) -> dict:
    obj = json.loads(path.read_text())
    if "base64Content" in obj and "parentId" in obj:
        return obj
    raise SystemExit(f"Not a create_file payload: {path}")


def call_create_file(payload: dict) -> dict:
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "create_file", "arguments": payload},
        }
    ).encode()
    headers = {"Content-Type": "application/json"}
    for key in ("CURSOR_MCP_AUTH", "X_CURSOR_AUTH", "CURSOR_AUTH"):
        if os.environ.get(key):
            headers["x-cursor-auth"] = os.environ[key]
    req = urllib.request.Request(MCP_URL, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    path = Path(sys.argv[1])
    payload = load_payload(path)
    try:
        result = call_create_file(payload)
    except urllib.error.HTTPError as e:
        print(e.read().decode()[:2000], file=sys.stderr)
        sys.exit(1)
    print(json.dumps(result)[:4000])


if __name__ == "__main__":
    main()
