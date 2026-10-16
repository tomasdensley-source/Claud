#!/usr/bin/env python3
"""Upload tagged MP3 via Google Drive MCP (OIDC + REST), gap17 work dir."""
from __future__ import annotations

import base64
import json
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap17-work")


def get_oidc_token(aud: str = MCP_URL, retries: int = 5) -> str:
    body = json.dumps({"aud": aud}).encode()

    class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
        def __init__(self, host, timeout=None, **kwargs):
            super().__init__("localhost", timeout=timeout)

        def connect(self):
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    class UnixHTTPHandler(urllib.request.HTTPHandler):
        def http_open(self, req):
            return self.do_open(UnixHTTPConnection, req)

    opener = urllib.request.build_opener(UnixHTTPHandler())
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(
            "http://localhost/v1/tokens/oidc",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with opener.open(req) as resp:
            data = json.loads(resp.read().decode())
        token = data.get("token")
        if token:
            return token
        last = data
        if data.get("error") == "rate_limited":
            time.sleep(2 ** attempt)
            continue
        break
    raise SystemExit(f"No token in OIDC response: {last}")


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
        return json.loads(resp.read().decode())


def payload_for_sid(sid: str) -> dict:
    tagged = WORK / f"{sid}.tagged.mp3"
    if not tagged.exists():
        raise FileNotFoundError(tagged)
    meta = json.loads((WORK / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }


def unwrap(result: dict) -> dict:
    if "result" in result:
        inner = result["result"]
        if isinstance(inner, dict) and "content" in inner:
            for block in inner.get("content") or []:
                if block.get("type") == "text":
                    try:
                        return json.loads(block["text"])
                    except Exception:
                        pass
        elif isinstance(inner, dict):
            return inner
    return result


def main() -> None:
    sid = sys.argv[1]
    payload = payload_for_sid(sid)
    token = get_oidc_token()
    try:
        result = unwrap(mcp_create_file(payload, token))
    except urllib.error.HTTPError as e:
        print(json.dumps({"ok": False, "error": e.read().decode()[:1500]}))
        sys.exit(1)
    file_id = result.get("id") if isinstance(result, dict) else None
    print(json.dumps({"ok": bool(file_id), "tagged_drive_id": file_id}))


if __name__ == "__main__":
    main()
