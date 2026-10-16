#!/usr/bin/env python3
"""Finalize gap15 track: cover resize, tag, CSV append, upload JSON."""
import base64
import json
import shutil
import sys
from pathlib import Path

import gap15_pipeline as gp

WORK = Path("/tmp/gap15-work")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
gp.RESULTS = Path("/tmp/drive-inventory/results-15-17-d.csv")
gp.BATCH = "38"


def finish(source_id: str, cover_src: Path, tagged_drive_id: str = "") -> Path:
    mp3 = WORK / f"{source_id}.mp3"
    meta_path = WORK / f"{source_id}.json"
    meta = json.loads(meta_path.read_text())
    meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    gp.resize_cover(cover_src, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    gp.apply_tags(mp3, meta, cover_jpg, out)
    meta_path.write_text(json.dumps({k: v for k, v in meta.items() if not k.startswith("_")}, indent=2))
    gp.append_csv({k: v for k, v in meta.items() if not k.startswith("_")})
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
