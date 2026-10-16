#!/usr/bin/env python3
"""Save Drive download JSON to MP3; upload tagged MP3 from finalize output."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap45-work/mp3")
DL = Path("/tmp/gap45-work/dl")


def save_download(json_path: Path) -> Path:
    obj = json.loads(json_path.read_text())
    fid = obj.get("id") or json_path.stem
    out = WORK / f"{fid}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(obj["content"]))
    return out


def upload_b64(source_id: str) -> tuple[str, str]:
    tagged = Path(f"/tmp/gap45-work/{source_id}.tagged.mp3")
    meta = json.loads(Path(f"/tmp/gap45-work/{source_id}.json").read_text())
    b64 = base64.b64encode(tagged.read_bytes()).decode()
    return meta["filename"], b64


if __name__ == "__main__":
    if sys.argv[1] == "save":
        p = save_download(Path(sys.argv[2]))
        print(p)
    elif sys.argv[1] == "upload-prep":
        fn, b64 = upload_b64(sys.argv[2])
        out = Path(f"/tmp/gap45-work/{sys.argv[2]}.upload.json")
        out.write_text(json.dumps({"title": fn, "base64Content": b64}))
        print(fn, len(b64))
