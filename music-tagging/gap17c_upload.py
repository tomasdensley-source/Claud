#!/usr/bin/env python3
"""Upload tagged MP3 for gap17c batch via MCP SDK."""
from __future__ import annotations

import asyncio
import base64
import json
import socket
import sys
import http.client
from pathlib import Path

import httpx2
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_URL = "https://api.cursor.com/rest-mcp/google-drive/mcp"
SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap17-work")


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


def payload_for_sid(sid: str) -> dict:
    mp3 = WORK / "tagged" / f"{sid}.mp3"
    meta = json.loads((WORK / "meta" / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }


async def upload(payload: dict) -> dict:
    token = get_oidc_token()
    headers = {
        "x-cursor-auth": token,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json, text/event-stream",
    }
    async with httpx2.AsyncClient(headers=headers, timeout=httpx2.Timeout(600.0)) as client:
        async with streamable_http_client(MCP_URL, http_client=client) as streams:
            read, write = streams[0], streams[1]
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("create_file", payload)
                if result.isError:
                    raise RuntimeError(str(result.content))
                for block in result.content:
                    if hasattr(block, "text"):
                        try:
                            return json.loads(block.text)
                        except json.JSONDecodeError:
                            return {"raw": block.text}
                return {"structured": result.structuredContent}


def main() -> None:
    sid = sys.argv[1]
    payload = payload_for_sid(sid)
    out = asyncio.run(upload(payload))
    print(json.dumps(out))
    fid = out.get("id")
    if fid:
        import subprocess

        subprocess.run(
            ["python3", "/workspace/music-tagging/gap17c_pipeline.py", "set-tagged", sid, fid],
            check=True,
        )


if __name__ == "__main__":
    main()
