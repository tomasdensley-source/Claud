#!/usr/bin/env python3
"""Upload MP3 to Drive via Google API using agent OIDC token (drive.file scope)."""
from __future__ import annotations

import json
import mimetypes
import socket
import sys
import urllib.error
import urllib.request
import http.client
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap19-work")
TAGGED = WORK / "tagged"


def get_drive_token() -> str:
    class C(http.client.HTTPConnection):
        def connect(self) -> None:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.connect(SOCKET)

    conn = C("localhost")
    conn.request(
        "POST",
        "/v1/tokens/oidc",
        json.dumps({"aud": "https://www.googleapis.com/auth/drive.file"}).encode(),
        {"Content-Type": "application/json"},
    )
    data = json.loads(conn.getresponse().read().decode())
    if "token" not in data:
        raise RuntimeError(data)
    return data["token"]


def upload_file(title: str, mp3: Path, parent: str = PARENT) -> dict:
    token = get_drive_token()
    metadata = {"name": title, "parents": [parent], "mimeType": "audio/mpeg"}
    boundary = "-------cursor-gap19-upload-boundary"
    body = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
        f"--{boundary}\r\n"
        f"Content-Type: audio/mpeg\r\n\r\n"
    ).encode() + mp3.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.loads(resp.read().decode())


def main() -> None:
    sid = sys.argv[1]
    mp3 = TAGGED / f"{sid}.mp3"
    if not mp3.exists():
        mp3 = WORK / f"{sid}.tagged.mp3"
    meta_path = WORK / f"{sid}.json"
    if not meta_path.exists():
        meta_path = WORK / "mp3" / f"{sid}.json"
    meta = json.loads(meta_path.read_text())
    result = upload_file(meta["filename"], mp3)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
