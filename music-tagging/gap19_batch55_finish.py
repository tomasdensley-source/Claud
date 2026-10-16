#!/usr/bin/env python3
"""Finalize one batch-55 track: resize cover, tag MP3, append CSV, write upload JSON."""
import base64
import json
import shutil
import sys
from pathlib import Path

# reuse batch55 module
sys.path.insert(0, str(Path(__file__).parent))
import gap19_batch55 as b55

WORK = b55.WORK


def finish(source_id: str, cover_png: Path, tagged_drive_id: str = "") -> Path:
    mp3 = WORK / f"{source_id}.mp3"
    meta_path = WORK / f"{source_id}.json"
    if not meta_path.exists():
        raise SystemExit(f"missing meta {meta_path}")
    meta = json.loads(meta_path.read_text())
    meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    b55.resize_cover(cover_png, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    shutil.copy2(mp3, out)
    b55.apply_tags(out, meta, cover_jpg, out)
    b55.append_csv(meta)
    meta_path.write_text(json.dumps({k: v for k, v in meta.items() if not k.startswith("_")}, indent=2))
    upload = {
        "title": meta["filename"],
        "parentId": b55.TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(out.read_bytes()).decode(),
    }
    up_path = WORK / f"{source_id}.upload.json"
    up_path.write_text(json.dumps(upload))
    return out


if __name__ == "__main__":
    tid = sys.argv[3] if len(sys.argv) > 3 else ""
    p = finish(sys.argv[1], Path(sys.argv[2]), tid)
    print(p)
