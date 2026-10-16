#!/usr/bin/env python3
"""Save MCP download_file_content JSON from file or stdin to /tmp/gap19-work/{id}.mp3."""
import base64
import json
import sys
from pathlib import Path

OUT = Path("/tmp/gap19-work")


def save(obj: dict, file_id: str | None = None) -> Path:
    fid = file_id or obj.get("id") or obj.get("fileId")
    b64 = obj.get("content") or obj.get("base64Content") or ""
    if not b64 and isinstance(obj.get("result"), dict):
        inner = obj["result"]
        b64 = inner.get("content") or inner.get("base64Content") or ""
        fid = fid or inner.get("id")
    if not fid or not b64:
        raise SystemExit("missing id or content")
    out = OUT / f"{fid}.mp3"
    out.write_bytes(base64.b64decode(b64))
    print(out, out.stat().st_size)
    return out


if __name__ == "__main__":
    fid = sys.argv[1] if len(sys.argv) > 1 else None
    raw = Path(sys.argv[2]).read_text() if len(sys.argv) > 2 else sys.stdin.read()
    save(json.loads(raw), fid)
