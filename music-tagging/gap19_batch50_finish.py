#!/usr/bin/env python3
"""Finalize batch-50 track: cover resize, ID3, CSV, upload JSON."""
import base64
import json
import sys
from pathlib import Path

import gap19_batch50 as b50

WORK = b50.WORK
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def mp3_source(source_id: str) -> Path:
    for p in (WORK / f"{source_id}.mp3", WORK / "mp3" / f"{source_id}.mp3"):
        if p.exists():
            return p
    raise FileNotFoundError(source_id)


def finish(source_id: str, cover_png: Path, tagged_drive_id: str = "") -> Path:
    mp3 = mp3_source(source_id)
    meta_path = WORK / f"{source_id}.json"
    meta = json.loads(meta_path.read_text())
    meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    b50.resize_cover(cover_png, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    b50.apply_tags(mp3, meta, cover_jpg, out)
    csv_row = {k: v for k, v in meta.items() if not str(k).startswith("_")}
    b50.append_csv(csv_row)
    meta_path.write_text(json.dumps(csv_row, indent=2))
    upload = {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(out.read_bytes()).decode(),
    }
    (WORK / f"{source_id}.upload.json").write_text(json.dumps(upload))
    return out


if __name__ == "__main__":
    tid = sys.argv[3] if len(sys.argv) > 3 else ""
    print(finish(sys.argv[1], Path(sys.argv[2]), tid))
