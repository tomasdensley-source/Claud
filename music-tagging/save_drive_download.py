#!/usr/bin/env python3
"""Save Google-drive download_file_content JSON (id + base64 content) to /tmp/gap17-work/<id>.mp3."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap17-work")


def save_from_json_path(json_path: Path) -> str:
    obj = json.loads(json_path.read_text())
    fid = obj["id"]
    b64 = obj.get("content") or obj.get("base64Content") or obj.get("data")
    if not b64:
        raise ValueError(f"No content in {json_path}")
    out = WORK / f"{fid}.mp3"
    WORK.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(b64))
    return fid


if __name__ == "__main__":
    for p in sys.argv[1:]:
        fid = save_from_json_path(Path(p))
        print(fid, (WORK / f"{fid}.mp3").stat().st_size)
