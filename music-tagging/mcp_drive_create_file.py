#!/usr/bin/env python3
"""Upload a file via Google Drive MCP create_file using host OIDC token."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCK = "/run/cursor/api.sock"


def oidc_token() -> str:
    body = json.dumps({"aud": MCP_URL}).encode()
    req = urllib.request.Request(
        "http://localhost/v1/tokens/oidc",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    # Unix socket transport via curl subprocess (urllib lacks unix sockets cleanly)
    import subprocess

    out = subprocess.check_output(
        [
            "curl",
            "-s",
            "-X",
            "POST",
            "--unix-socket",
            SOCK,
            "http://localhost/v1/tokens/oidc",
            "-H",
            "Content-Type: application/json",
            "-d",
            body.decode(),
        ],
        text=True,
    )
    return json.loads(out)["token"]


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
        with urllib.request.urlopen(req, timeout=120) as resp:
            sid = resp.headers.get("Mcp-Session-Id") or session_id
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"MCP HTTP {e.code}: {e.read().decode()[:2000]}") from e
    # SSE or JSON
    if raw.startswith("event:") or "\ndata:" in raw:
        for line in raw.splitlines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data:
                    return json.loads(data), sid
        raise SystemExit(f"No SSE data in MCP response: {raw[:500]}")
    return json.loads(raw), sid


def main() -> None:
    upload_path = Path(sys.argv[1])
    args = json.loads(upload_path.read_text())
    token = oidc_token()
    init = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "gap17-uploader", "version": "1.0"},
        },
    }
    res, sid = mcp_post(token, init)
    if "error" in res:
        raise SystemExit(f"initialize error: {res}")
    mcp_post(
        token,
        {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}},
        sid,
    )
    call = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": "create_file", "arguments": args},
    }
    res, _ = mcp_post(token, call, sid)
    if res.get("error"):
        raise SystemExit(f"tools/call error: {res['error']}")
    content = res.get("result", {}).get("content") or []
    text = ""
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text += block.get("text", "")
    if text:
        try:
            out = json.loads(text)
        except json.JSONDecodeError:
            out = {"raw": text}
    else:
        out = res.get("result") or res
    print(json.dumps(out))


if __name__ == "__main__":
    main()
