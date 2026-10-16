#!/usr/bin/env python3
"""Upload tagged MP3 via Google-drive MCP using agent unix socket bridge."""
from __future__ import annotations

import json
import socket
import subprocess
import sys
import urllib.request
from pathlib import Path

WORK = Path("/tmp/gap52-work")
SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
    def __init__(self) -> None:
        super().__init__("localhost")

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(SOCKET)


def unix_post(path: str, body: bytes) -> bytes:
    req = urllib.request.Request(
        f"http://localhost{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    class H(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(lambda *a, **k: UnixHTTPConnection(), req)

    with urllib.request.build_opener(H()).open(req, timeout=600) as resp:
        return resp.read()


def payload_for(sid: str) -> dict:
    tagged = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    import base64

    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }


def mcp_create(payload: dict) -> dict:
    body = json.dumps(
        {"namespace": "Google-drive", "toolName": "create_file", "arguments": payload}
    ).encode()
    for path in ("/v1/dynamic-tool/call", "/v1/mcp/call", "/v1/tools/call"):
        try:
            raw = unix_post(path, body)
            return json.loads(raw.decode())
        except Exception:
            continue
    raise SystemExit("All unix MCP bridge paths failed")


def main() -> None:
    sid = sys.argv[1]
    payload = payload_for(sid)
    result = mcp_create(payload)
    print(json.dumps(result)[:4000])


if __name__ == "__main__":
    main()
