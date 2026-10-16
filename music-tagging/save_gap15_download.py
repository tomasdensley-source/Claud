#!/usr/bin/env python3
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap15-work")


def save(path: Path) -> None:
    obj = json.loads(path.read_text())
    fid = obj["id"]
    b64 = obj.get("content") or obj.get("base64Content")
    out = WORK / f"{fid}.mp3"
    out.write_bytes(base64.b64decode(b64))
    print(fid, out.stat().st_size)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        save(Path(p))
