#!/usr/bin/env python3
"""Upload batch-55 tagged MP3s via OIDC + Google resumable upload (large files)."""
from __future__ import annotations

import json
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap19-work")
PIPE = Path(__file__).with_name("gap19_batch55.py")
AUD = "https://www.googleapis.com/auth/drive.file"


def get_token(retries: int = 8) -> str:
    body = json.dumps({"aud": AUD}).encode()
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
    raise RuntimeError("OIDC rate limit exhausted")


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
    fid = out.get("id")
    if not fid:
        raise RuntimeError(f"upload failed: {out}")
    return fid


def upload_one(source_id: str, token: str | None = None) -> str:
    tagged = WORK / f"{source_id}.tagged.mp3"
    if not tagged.exists():
        raise FileNotFoundError(tagged)
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    tok = token or get_token()
    fid = resumable_upload(tok, tagged, meta["filename"])
    import subprocess

    subprocess.check_call([sys.executable, str(PIPE), "set-tagged", source_id, fid])
    return fid


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: upload_resumable.py <source_id> [source_id ...]")
        sys.exit(2)
    token = get_token()
    for sid in sys.argv[1:]:
        try:
            fid = upload_one(sid, token)
            print(json.dumps({"id": sid, "tagged_drive_id": fid}))
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            print(json.dumps({"id": sid, "error": f"HTTP {e.code}", "body": body[:300]}))
            if e.code in (401, 403):
                token = get_token()
        except Exception as e:
            print(json.dumps({"id": sid, "error": str(e)}))


if __name__ == "__main__":
    main()
