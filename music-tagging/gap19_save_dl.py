#!/usr/bin/env python3
"""Save Google Drive download_file_content JSON to gap19-work/mp3/{id}.mp3."""
import base64
import json
import sys
from pathlib import Path

MP3 = Path("/tmp/gap19-work/mp3")


def save_obj(obj: dict) -> Path:
    fid = obj.get("id") or obj.get("fileId")
    content = obj.get("content") or obj.get("base64Content") or ""
    if not fid or not content:
        raise SystemExit("missing id or content")
    MP3.mkdir(parents=True, exist_ok=True)
    out = MP3 / f"{fid}.mp3"
    out.write_bytes(base64.b64decode(content))
    print(out, out.stat().st_size)
    return out


if __name__ == "__main__":
    src = Path(sys.argv[1])
    save_obj(json.loads(src.read_text()))
