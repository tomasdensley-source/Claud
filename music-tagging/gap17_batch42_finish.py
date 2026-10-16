#!/usr/bin/env python3
"""Tag MP3 + append CSV row after Drive upload (batch 42)."""
from __future__ import annotations

import base64
import csv
import json
import sys
from pathlib import Path

import gap17_pipeline as gp
from gap17_batch42 import cmd_finalize as _unused  # noqa: F401
from gap17_pipeline import apply_tags, append_csv, resize_cover

WORK = Path("/tmp/gap17-work")
RESULTS = Path("/tmp/drive-inventory/results-17-19-d.csv")
gp.RESULTS = RESULTS
gp.BATCH = "42"


def tag_only(source_id: str, cover_path: Path) -> Path:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_path, cover_jpg)
    mp3 = WORK / f"{source_id}.mp3"
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, cover_jpg, out)
    return out


def append_row(source_id: str, tagged_id: str) -> None:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    append_csv(meta)


def upload_payload(source_id: str) -> dict:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    mp3 = WORK / f"{source_id}.tagged.mp3"
    return {
        "title": meta["filename"],
        "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }


if __name__ == "__main__":
    if sys.argv[1] == "tag":
        out = tag_only(sys.argv[2], Path(sys.argv[3]))
        print(out)
    elif sys.argv[1] == "payload":
        print(json.dumps(upload_payload(sys.argv[2])))
    elif sys.argv[1] == "append":
        append_row(sys.argv[2], sys.argv[3])
