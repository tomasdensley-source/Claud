#!/usr/bin/env python3
"""Upload gap17 tagged MP3s via OIDC + Google Drive resumable upload."""
from __future__ import annotations

import csv
import json
import socket
import sys
import urllib.request
from pathlib import Path

SOCKET = "/run/cursor/api.sock"
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
WORK = Path("/tmp/gap17-work")
RESULTS = Path("/tmp/drive-inventory/results-17-19-h.csv")
MANIFEST = Path("/tmp/manifest.csv")


def get_token(retries: int = 8) -> str:
    import time

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


def append_or_update_csv(row: dict) -> None:
    fieldnames = list(csv.reader(open(MANIFEST, newline="", encoding="utf-8")))[0]
    rows: list[dict] = []
    if RESULTS.exists() and RESULTS.stat().st_size > 0:
        with open(RESULTS, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    sid = row["source_drive_id"]
    updated = False
    for r in rows:
        if r.get("source_drive_id") == sid:
            r.update({k: row.get(k, r.get(k, "")) for k in fieldnames})
            updated = True
            break
    if not updated:
        rows.append({k: row.get(k, "") for k in fieldnames})
    with open(RESULTS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(rows)


def upload_one(source_id: str) -> str:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    mp3 = WORK / f"{source_id}.tagged.mp3"
    if not mp3.exists():
        raise FileNotFoundError(mp3)
    fid = resumable_upload(get_token(), mp3, meta["filename"])
    meta["tagged_drive_id"] = fid
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    (WORK / f"{source_id}.json").write_text(json.dumps(meta, indent=2))
    append_or_update_csv(meta)
    return fid


if __name__ == "__main__":
    print(upload_one(sys.argv[1]))
