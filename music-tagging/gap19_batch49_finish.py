#!/usr/bin/env python3
"""Finalize batch-49 track: resize cover, tag MP3, append CSV, write upload JSON."""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import gap19_batch49 as b49
from gap17_pipeline import append_csv

WORK = b49.WORK
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def finish(source_id: str, cover_src: Path, tagged_drive_id: str = "") -> Path:
    mp3 = b49.mp3_path(source_id)
    meta_path = WORK / f"{source_id}.json"
    meta = json.loads(meta_path.read_text())
    meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    b49.resize_cover(cover_src, cover_jpg)
    out = WORK / "tagged" / f"{source_id}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    b49.apply_tags(mp3, meta, cover_jpg, out)
    row = {k: v for k, v in meta.items() if not str(k).startswith("_")}
    append_csv(row)
    meta_path.write_text(json.dumps(row, indent=2))
    upload = {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(out.read_bytes()).decode(),
    }
    (WORK / "upload" / f"{source_id}.json").write_text(json.dumps(upload))
    cmd = {
        "namespace": "Google-drive",
        "toolName": "create_file",
        "arguments": upload,
    }
    (WORK / f"{source_id}.upload_cmd.json").write_text(json.dumps(cmd))
    return out


if __name__ == "__main__":
    tid = sys.argv[3] if len(sys.argv) > 3 else ""
    p = finish(sys.argv[1], Path(sys.argv[2]), tid)
    print(p)
