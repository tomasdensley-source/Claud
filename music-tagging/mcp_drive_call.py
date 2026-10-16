#!/usr/bin/env python3
"""Call Google-drive MCP via Cursor OIDC token (batch uploads from shell)."""
from __future__ import annotations

import http.client
import json
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
AUD = "https://api.cursor.com/rest-mcp/google-drive/mcp"


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self) -> None:
        super().__init__("localhost")

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(SOCKET)


def get_oidc_token() -> str:
    conn = UnixHTTPConnection()
    conn.request(
        "POST",
        "/v1/tokens/oidc",
        json.dumps({"aud": AUD}).encode(),
        {"Content-Type": "application/json"},
    )
    resp = conn.getresponse()
    data = json.loads(resp.read().decode())
    if "token" not in data:
        raise RuntimeError(f"OIDC failed: {data}")
    return data["token"]


def mcp_call(tool: str, arguments: dict) -> dict:
    token = get_oidc_token()
    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool, "arguments": arguments},
        }
    ).encode()
    req = urllib.request.Request(
        MCP_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-cursor-auth": token,
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"MCP HTTP {e.code}: {body[:2000]}") from e
    return json.loads(raw)


def unwrap_tool_result(result: dict) -> dict:
    if "result" in result:
        inner = result["result"]
        if isinstance(inner, dict) and "content" in inner:
            for block in inner.get("content") or []:
                if block.get("type") == "text":
                    try:
                        return json.loads(block["text"])
                    except json.JSONDecodeError:
                        return {"raw": block.get("text", "")}
        return inner if isinstance(inner, dict) else {"raw": inner}
    return result


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: mcp_drive_call.py create-from-upload-json|download <...>",
            file=sys.stderr,
        )
        sys.exit(2)
    if sys.argv[1] == "create-from-upload-json":
        payload = json.loads(Path(sys.argv[2]).read_text())
        payload.setdefault("disableConversionToGoogleType", True)
        result = mcp_call("create_file", payload)
        print(json.dumps(result, indent=2))
        if "error" in result:
            sys.exit(1)
    elif sys.argv[1] == "download":
        fid = sys.argv[2]
        out = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(f"/tmp/gap19-work/mp3/{fid}.mp3")
        result = mcp_call("download_file_content", {"fileId": fid})
        data = unwrap_tool_result(result)
        if data.get("error") or not data.get("content"):
            print(json.dumps(data, indent=2))
            sys.exit(1)
        import base64

        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(base64.b64decode(data["content"]))
        print(json.dumps({"id": data.get("id", fid), "path": str(out), "size": out.stat().st_size}))
    else:
        print("Unknown command", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
