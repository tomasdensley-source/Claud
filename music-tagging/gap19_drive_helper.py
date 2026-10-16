#!/usr/bin/env python3
"""Save Drive download JSON to MP3; prepare upload payload."""
import base64
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")
MP3 = WORK / "mp3"


def save_download(json_path: Path, file_id: str | None = None) -> Path:
    raw = json_path.read_text()
    obj = json.loads(raw)
    fid = file_id or obj.get("id") or json_path.stem.replace("dl-", "")
    b64 = obj.get("content") or obj.get("base64Content") or ""
    if not b64 and isinstance(obj.get("result"), dict):
        inner = obj["result"]
        b64 = inner.get("content") or inner.get("base64Content") or ""
    if not b64:
        raise SystemExit(f"No base64 in {json_path}")
    out = MP3 / f"{fid}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(b64))
    print(out, out.stat().st_size)
    return out


def upload_prep(source_id: str) -> Path:
    tagged = WORK / "tagged" / f"{source_id}.mp3"
    meta = json.loads((WORK / "meta" / f"{source_id}.json").read_text())
    payload = {
        "title": meta["filename"],
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    out = WORK / "upload" / f"{source_id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload))
    print(meta["filename"], len(payload["base64Content"]))
    return out


if __name__ == "__main__":
    if sys.argv[1] == "save":
        save_download(Path(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else None)
    elif sys.argv[1] == "upload-prep":
        upload_prep(sys.argv[2])
