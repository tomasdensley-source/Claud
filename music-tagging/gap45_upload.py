#!/usr/bin/env python3
"""Upload tagged MP3 via Google Drive MCP (agent socket bridge or payload file)."""
from __future__ import annotations

import base64
import json
import os
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path

SOCKET = os.environ.get("CURSOR_AGENT_SOCKET", "/run/cursor/api.sock")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
    def __init__(self, sock_path: str):
        super().__init__("localhost")
        self._sock_path = sock_path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self._sock_path)


def _unix_opener(sock_path: str):
    class UnixHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(lambda: UnixHTTPConnection(sock_path), req)

    return urllib.request.build_opener(UnixHTTPHandler())


def try_mcp_call(payload: dict) -> dict | None:
    body = json.dumps(
        {
            "namespace": "Google-drive",
            "toolName": "create_file",
            "arguments": payload,
        }
    ).encode()
    paths = (
        "/v1/mcp/call",
        "/v1/tools/call",
        "/v1/dynamic-tool/call",
        "/v1/agent/mcp/call",
    )
    opener = _unix_opener(SOCKET)
    for path in paths:
        try:
            req = urllib.request.Request(
                f"http://localhost{path}",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with opener.open(req, timeout=600) as resp:
                return json.loads(resp.read().decode())
        except Exception:
            continue
    return None


def payload_for_sid(sid: str, work: Path) -> dict:
    mp3 = work / f"{sid}.tagged.mp3"
    meta = json.loads((work / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }


def main() -> None:
    work = Path("/tmp/gap45-work")
    sid = sys.argv[1]
    payload = payload_for_sid(sid, work)
    result = try_mcp_call(payload)
    if result and result.get("id"):
        meta = json.loads((work / f"{sid}.json").read_text())
        meta["tagged_drive_id"] = result["id"]
        (work / f"{sid}.json").write_text(json.dumps(meta, indent=2))
        print(json.dumps({"ok": True, "tagged_drive_id": result["id"]}))
        return
    out = work / f"{sid}.upload.json"
    out.write_text(json.dumps(payload))
    print(json.dumps({"ok": False, "upload_json": str(out), "b64_len": len(payload["base64Content"])}))


if __name__ == "__main__":
    main()
