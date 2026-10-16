#!/usr/bin/env python3
"""Extract MP3 from Drive download JSON (tool output or saved file)."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap17-work")
WORK.mkdir(parents=True, exist_ok=True)


def extract(obj_path: Path, file_id: str | None = None) -> Path:
    text = obj_path.read_text()
    obj = json.loads(text)
    fid = file_id or obj.get("id") or obj_path.stem
    content = obj.get("content") or obj.get("base64Content")
    if not content:
        raise ValueError(f"No content in {obj_path}")
    out = WORK / f"{fid}.mp3"
    out.write_bytes(base64.b64decode(content))
    return out


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        p = Path(arg)
        extract(p)
        print("ok", p)
