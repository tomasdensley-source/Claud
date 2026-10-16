#!/usr/bin/env python3
"""Upload tagged MP3 via Google Drive MCP using Cursor agent HTTP bridge."""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

# MCP proxy may be available on the agent socket; fallback: print JSON for manual MCP.
SOCKET = os.environ.get("CURSOR_AGENT_SOCKET", "/run/cursor/api.sock")


def upload_via_mcp_json(payload: dict) -> dict:
    """Try posting to internal MCP bridge if present."""
    body = json.dumps(
        {
            "namespace": "Google-drive",
            "toolName": "create_file",
            "arguments": payload,
        }
    ).encode()
    for path in (
        "/v1/mcp/call",
        "/v1/tools/call",
        "/v1/dynamic-tool/call",
    ):
        try:
            req = urllib.request.Request(
                f"http://localhost{path}",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=600, context=_unix_context()) as resp:
                return json.loads(resp.read().decode())
        except Exception:
            continue
    raise RuntimeError("No MCP HTTP bridge on agent socket")


def _unix_context():
    import socket

    class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
        def __init__(self):
            super().__init__("localhost")

        def connect(self):
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    class UnixHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(UnixHTTPConnection, req)

    import urllib.request as ur

    return ur.build_opener(UnixHTTPHandler())


def main() -> None:
    if len(sys.argv) < 4:
        print("Usage: gap15_upload.py <tagged.mp3> <title> <parent_id>", file=sys.stderr)
        sys.exit(2)
    mp3 = Path(sys.argv[1])
    title = sys.argv[2]
    parent = sys.argv[3]
    b64 = base64.b64encode(mp3.read_bytes()).decode()
    payload = {
        "title": title,
        "parentId": parent,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": b64,
    }
    out_path = mp3.with_suffix(".upload.json")
    out_path.write_text(json.dumps(payload))
    print(f"Wrote {out_path} ({len(b64)} b64 chars); invoke Google-drive create_file from this file.")


if __name__ == "__main__":
    main()
