#!/usr/bin/env python3
"""Save Drive download JSON/base64 to gap17-work/{fileId}.mp3"""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap17-work")


def main() -> None:
    fid = sys.argv[1]
    raw = sys.stdin.read()
    data = raw
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            for k in ("base64Content", "content", "data", "fileContent", "base64Data"):
                if obj.get(k):
                    data = obj[k]
                    break
    except json.JSONDecodeError:
        pass
    out = WORK / f"{fid}.mp3"
    WORK.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(data))
    print(out, out.stat().st_size)


if __name__ == "__main__":
    main()
