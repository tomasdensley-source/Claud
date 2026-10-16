#!/usr/bin/env python3
"""Decode Drive download JSON (tool output or dl/*.json) to MP3 in gap52-work."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap52-work")


def decode_obj(obj: dict, file_id: str) -> Path:
    b64 = obj.get("content") or obj.get("base64Content") or ""
    if not b64 and "result" in obj:
        inner = obj["result"]
        if isinstance(inner, dict):
            b64 = inner.get("content") or inner.get("base64Content") or ""
    if not b64:
        raise SystemExit(f"No content for {file_id}")
    out = WORK / f"{file_id}.mp3"
    out.write_bytes(base64.b64decode(b64))
    return out


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: gap52_decode_dl.py <file_id> <json_path>")
        sys.exit(1)
    fid, path = sys.argv[1], Path(sys.argv[2])
    raw = path.read_text()
    obj = json.loads(raw)
    out = decode_obj(obj, fid)
    print(out, out.stat().st_size)


if __name__ == "__main__":
    main()
