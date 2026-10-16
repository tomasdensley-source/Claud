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
WORK = Path("/tmp/gap19-work")


class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
    def __init__(self, sock_path: str, timeout=socket._GLOBAL_DEFAULT_TIMEOUT):
        super().__init__("localhost", timeout=timeout)
        self._sock_path = sock_path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(600)
        self.sock.connect(self._sock_path)


def _unix_opener(sock_path: str):
    def make_conn(host=None, timeout=socket._GLOBAL_DEFAULT_TIMEOUT):
        return UnixHTTPConnection(sock_path, timeout=timeout)

    class UnixHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(make_conn, req)

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


def payload_for_sid(sid: str) -> dict:
    mp3 = WORK / "mp3" / f"{sid}.tagged.mp3"
    if not mp3.exists():
        mp3 = WORK / "tagged" / f"{sid}.mp3"
    if not mp3.exists():
        mp3 = WORK / f"{sid}.tagged.mp3"
    meta_path = WORK / "mp3" / f"{sid}.json"
    if not meta_path.exists():
        meta_path = WORK / f"{sid}.json"
    meta = json.loads(meta_path.read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }


def main() -> None:
    sid = sys.argv[1]
    payload = payload_for_sid(sid)
    result = try_mcp_call(payload)
    file_id = None
    if isinstance(result, dict):
        file_id = result.get("id")
        if not file_id and isinstance(result.get("result"), dict):
            file_id = result["result"].get("id")
        if not file_id and isinstance(result.get("content"), list):
            for block in result["content"]:
                if isinstance(block, dict) and block.get("text"):
                    try:
                        inner = json.loads(block["text"])
                        file_id = inner.get("id") or (inner.get("result") or {}).get("id")
                    except json.JSONDecodeError:
                        pass
    if file_id:
        print(json.dumps({"ok": True, "tagged_drive_id": file_id}))
        return
    out = WORK / f"{sid}.upload.json"
    out.write_text(json.dumps(payload))
    print(json.dumps({"ok": False, "upload_json": str(out), "b64_len": len(payload["base64Content"])}))


if __name__ == "__main__":
    main()
