#!/usr/bin/env python3
"""Upload via Google Drive MCP streamable HTTP (OIDC from agent socket)."""
from __future__ import annotations

import asyncio
import http.client
import json
import socket
import sys
from pathlib import Path

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"


def get_oidc_token() -> str:
    class UnixHTTPConnection(http.client.HTTPConnection):
        def __init__(self) -> None:
            super().__init__("localhost")

        def connect(self) -> None:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    conn = UnixHTTPConnection()
    conn.request(
        "POST",
        "/v1/tokens/oidc",
        json.dumps({"aud": MCP_URL}).encode(),
        {"Content-Type": "application/json"},
    )
    data = json.loads(conn.getresponse().read().decode())
    if "token" not in data:
        raise RuntimeError(f"OIDC failed: {data}")
    return data["token"]


async def upload(payload: dict) -> dict:
    token = get_oidc_token()
    headers = {
        "x-cursor-auth": token,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json, text/event-stream",
    }
    async with httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(600.0)) as client:
        async with streamable_http_client(MCP_URL, http_client=client) as streams:
            read, write = streams[0], streams[1]
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("create_file", payload)
                if result.isError:
                    raise RuntimeError(str(result.content))
                for block in result.content or []:
                    if hasattr(block, "text"):
                        try:
                            return json.loads(block.text)
                        except json.JSONDecodeError:
                            return {"raw": block.text}
                return {"structured": result.structuredContent}


def main() -> None:
    path = Path(sys.argv[1])
    payload = json.loads(path.read_text())
    out = asyncio.run(upload(payload))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
