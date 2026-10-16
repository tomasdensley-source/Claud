#!/usr/bin/env python3
"""Google Drive MCP session helpers (initialize + tools/call)."""
from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"


def get_oidc_token() -> str:
    class UnixHTTPConnection(urllib.request.http.client.HTTPConnection):
        def __init__(self) -> None:
            super().__init__("localhost")

        def connect(self) -> None:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    opener = urllib.request.build_opener(urllib.request.HTTPHandler())
    # manual unix request
    conn = UnixHTTPConnection()
    conn.request(
        "POST",
        "/v1/tokens/oidc",
        json.dumps({"aud": MCP_URL}).encode(),
        {"Content-Type": "application/json"},
    )
    data = json.loads(conn.getresponse().read().decode())
    token = data.get("token")
    if not token:
        raise RuntimeError(f"OIDC failed: {data}")
    return token


def mcp_post(token: str, payload: dict, session_id: str | None = None) -> tuple[dict, str | None]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {token}",
        "x-cursor-auth": token,
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id
    req = urllib.request.Request(MCP_URL, data=json.dumps(payload).encode(), method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            sid = resp.headers.get("Mcp-Session-Id") or session_id
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"MCP HTTP {e.code}: {body[:2000]}") from e
    if raw.startswith("event:") or "\ndata:" in raw:
        for line in raw.splitlines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data:
                    return json.loads(data), sid
        raise RuntimeError(f"No SSE data: {raw[:500]}")
    return json.loads(raw), sid


def call_tool(name: str, arguments: dict) -> dict:
    token = get_oidc_token()
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "gap19-batch54", "version": "1.0"},
        },
    }
    res, sid = mcp_post(token, init)
    if res.get("error"):
        raise RuntimeError(f"initialize: {res}")
    mcp_post(token, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}, sid)
    call = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
    }
    res, _ = mcp_post(token, call, sid)
    if res.get("error"):
        raise RuntimeError(f"tools/call: {res}")
    content = res.get("result", {}).get("content") or []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            try:
                return json.loads(block["text"])
            except json.JSONDecodeError:
                return {"raw": block.get("text", "")}
    return res.get("result") or res
