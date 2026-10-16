#!/usr/bin/env python3
"""Upload tagged MP3 via Google Drive MCP using OIDC token from agent socket."""
from __future__ import annotations

import json
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap19-work")


def get_oidc_token(aud: str = MCP_URL) -> str:
    body = json.dumps({"aud": aud}).encode()
    class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
        def __init__(self, host, timeout=None, **kwargs):
            super().__init__("localhost", timeout=timeout)
            self.sock_path = SOCKET

        def connect(self):
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(self.sock_path)

    class UnixHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(UnixHTTPConnection, req)

    opener = urllib.request.build_opener(UnixHTTPHandler())
    req = urllib.request.Request(
        "http://localhost/v1/tokens/oidc",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with opener.open(req) as resp:
        data = json.loads(resp.read().decode())
    token = data.get("token")
    if not token:
        raise SystemExit(f"No token in OIDC response: {data}")
    return token


def mcp_create_file(payload: dict, token: str) -> dict:
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "create_file", "arguments": payload},
        }
    ).encode()
    req = urllib.request.Request(
        MCP_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "x-cursor-auth": token,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        raw = resp.read().decode()
    return json.loads(raw)


def payload_for_sid(sid: str) -> dict:
    tagged = WORK / "mp3" / f"{sid}.tagged.mp3"
    if not tagged.exists():
        tagged = WORK / "tagged" / f"{sid}.mp3"
    if not tagged.exists():
        tagged = WORK / f"{sid}.tagged.mp3"
    meta_path = WORK / "mp3" / f"{sid}.json"
    if not meta_path.exists():
        meta_path = WORK / f"{sid}.json"
    meta = json.loads(meta_path.read_text())
    import base64

    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }


def main() -> None:
    sid = sys.argv[1]
    payload = payload_for_sid(sid)
    token = get_oidc_token()
    try:
        result = mcp_create_file(payload, token)
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:2000]
        print(json.dumps({"ok": False, "error": err, "b64_len": len(payload["base64Content"])}))
        sys.exit(1)
    # unwrap MCP result
    if "result" in result:
        inner = result["result"]
        if isinstance(inner, dict) and "content" in inner:
            for block in inner.get("content") or []:
                if block.get("type") == "text":
                    try:
                        result = json.loads(block["text"])
                    except Exception:
                        pass
        else:
            result = inner
    file_id = result.get("id") if isinstance(result, dict) else None
    print(json.dumps({"ok": bool(file_id), "tagged_drive_id": file_id, "raw": result}))


if __name__ == "__main__":
    main()
