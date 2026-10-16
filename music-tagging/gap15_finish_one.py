#!/usr/bin/env python3
import base64
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap15_pipeline import cmd_finalize, cmd_append

WORK = Path("/tmp/gap15-work")
ASSETS = Path("/opt/cursor/artifacts/assets")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def find_cover(source_id: str) -> Path | None:
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = ASSETS / f"{source_id}{ext}"
        if p.exists():
            return p
    p = Path(f"/tmp/gap15-covers-raw/{source_id}.png")
    if p.exists():
        return p
    return None


def prep_upload(source_id: str, tagged_drive_id: str = "") -> dict:
    sid = source_id
    mp3 = WORK / f"{sid}.mp3"
    cover = find_cover(sid)
    if not cover:
        raise SystemExit(f"no cover for {sid}")
    out_mp3 = cmd_finalize(sid, mp3, cover, tagged_drive_id)
    meta = json.loads((WORK / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(out_mp3.read_bytes()).decode(),
        "source_id": sid,
    }


if __name__ == "__main__":
    if sys.argv[1] == "prep":
        u = prep_upload(sys.argv[2])
        out = WORK / f"{sys.argv[2]}.upload.json"
        out.write_text(json.dumps({k: u[k] for k in u if k != "source_id"}))
        print(out, u["title"])
    elif sys.argv[1] == "append":
        cmd_append(sys.argv[2], sys.argv[3])
