#!/usr/bin/env python3
"""Upload tagged MP3 to Drive via REST + agent OIDC token (large files)."""
from __future__ import annotations

import json
import mimetypes
import socket
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap19-work")


def get_token() -> str:
    body = json.dumps({"aud": "https://www.googleapis.com/auth/drive.file"}).encode()
    req = (
        b"POST /v1/tokens/oidc HTTP/1.1\r\n"
        b"Host: localhost\r\n"
        b"Content-Type: application/json\r\n"
        b"Content-Length: "
        + str(len(body)).encode()
        + b"\r\n\r\n"
    ) + body
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(SOCKET)
    s.sendall(req)
    resp = b""
    while True:
        chunk = s.recv(8192)
        if not chunk:
            break
        resp += chunk
    s.close()
    body_start = resp.find(b"\r\n\r\n")
    if body_start < 0:
        raise RuntimeError("bad oidc response")
    data = json.loads(resp[body_start + 4 :].decode())
    token = data.get("token")
    if not token:
        raise RuntimeError(f"no token in {data!r}")
    return token


def upload_mp3(path: Path, title: str, parent: str = PARENT) -> str:
    token = get_token()
    metadata = {"name": title, "parents": [parent], "mimeType": "audio/mpeg"}
    boundary = "gap19_upload_boundary"
    meta_part = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
    ).encode()
    file_bytes = path.read_bytes()
    file_part = (
        f"--{boundary}\r\n"
        f"Content-Type: audio/mpeg\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
    body = meta_part + file_part
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        out = json.loads(resp.read().decode())
    fid = out.get("id")
    if not fid:
        raise RuntimeError(f"upload failed: {out}")
    return fid


def main() -> None:
    sid = sys.argv[1]
    mp3 = WORK / "tagged" / f"{sid}.mp3"
    if not mp3.exists():
        mp3 = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    fid = upload_mp3(mp3, meta["filename"])
    print(json.dumps({"ok": True, "tagged_drive_id": fid}))


if __name__ == "__main__":
    main()
