#!/usr/bin/env python3
"""Upload tagged MP3 via Google-drive MCP using agent OIDC (streamable HTTP)."""
from __future__ import annotations

import asyncio
import json
import socket
import sys
import http.client
from pathlib import Path

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"
WORK = Path("/tmp/gap19-work")


def oidc_token() -> str:
    class C(http.client.HTTPConnection):
        def connect(self) -> None:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    c = C("localhost")
    c.request(
        "POST",
        "/v1/tokens/oidc",
        json.dumps({"aud": MCP_URL}).encode(),
        {"Content-Type": "application/json"},
    )
    data = json.loads(c.getresponse().read().decode())
    return data["token"]


async def upload_payload(payload: dict) -> dict:
    token = oidc_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "x-cursor-auth": token,
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(headers=headers, timeout=httpx.Timeout(600.0)) as client:
        async with streamable_http_client(MCP_URL, http_client=client) as streams:
            read, write = streams[0], streams[1]
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("create_file", payload)
                if result.isError:
                    raise RuntimeError(str(result.content))
                for block in result.content:
                    if hasattr(block, "text"):
                        return json.loads(block.text)
                return {"structured": result.structuredContent}


def main() -> None:
    path = Path(sys.argv[1])
    payload = json.loads(path.read_text())
    out = asyncio.run(upload_payload(payload))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
