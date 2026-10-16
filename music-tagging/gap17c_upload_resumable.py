#!/usr/bin/env python3
"""Upload gap17c tagged MP3s via OIDC + Google Drive resumable upload."""
from __future__ import annotations

import json
import socket
import sys
import time
import urllib.request
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap17-work")


def get_token(retries: int = 8) -> str:
    body = json.dumps({"aud": "https://www.googleapis.com/auth/drive.file"}).encode()
    for i in range(retries):
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(SOCKET)
        req = (
            b"POST /v1/tokens/oidc HTTP/1.1\r\n"
            b"Host: localhost\r\n"
            b"Content-Type: application/json\r\n"
            b"Content-Length: "
            + str(len(body)).encode()
            + b"\r\n\r\n"
        ) + body
        s.sendall(req)
        resp = b""
        while True:
            chunk = s.recv(65536)
            if not chunk:
                break
            resp += chunk
        s.close()
        data = json.loads(resp.split(b"\r\n\r\n", 1)[1].decode())
        if data.get("token"):
            return data["token"]
        if data.get("error") == "rate_limited":
            time.sleep(2 + i * 2)
            continue
        raise RuntimeError(f"OIDC failed: {data}")
    raise RuntimeError("OIDC rate limited")


def resumable_upload(token: str, path: Path, title: str) -> str:
    size = path.stat().st_size
    metadata = json.dumps({"name": title, "parents": [PARENT], "mimeType": "audio/mpeg"}).encode()
    init_req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
        data=metadata,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "audio/mpeg",
            "X-Upload-Content-Length": str(size),
        },
        method="POST",
    )
    with urllib.request.urlopen(init_req, timeout=120) as resp:
        location = resp.headers.get("Location")
    if not location:
        raise RuntimeError("no resumable Location header")
    put_req = urllib.request.Request(
        location,
        data=path.read_bytes(),
        headers={"Content-Length": str(size), "Content-Type": "audio/mpeg"},
        method="PUT",
    )
    with urllib.request.urlopen(put_req, timeout=600) as resp:
        out = json.loads(resp.read().decode())
    return out["id"]


def upload_one(source_id: str) -> str:
    meta = json.loads((WORK / "meta" / f"{source_id}.json").read_text())
    mp3 = WORK / "tagged" / f"{source_id}.mp3"
    if not mp3.exists():
        raise FileNotFoundError(mp3)
    fid = resumable_upload(get_token(), mp3, meta["filename"])
    import subprocess

    subprocess.run(
        [
            "python3",
            "/workspace/music-tagging/gap17c_pipeline.py",
            "set-tagged",
            source_id,
            fid,
        ],
        check=True,
    )
    return fid


if __name__ == "__main__":
    print(upload_one(sys.argv[1]))
