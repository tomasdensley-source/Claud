#!/usr/bin/env python3
"""Batch 36: gap-15-17.jsonl lines 64-126 -> results-15-17-b.csv."""
from __future__ import annotations

import base64
import csv
import json
import sys
from pathlib import Path

# Reuse pipeline
sys.path.insert(0, str(Path(__file__).parent))
from gap15_pipeline import (  # noqa: E402
    TAG_FOLDER,
    WORK,
    append_csv,
    cmd_analyze,
    cmd_append,
    cmd_finalize,
    cover_prompt,
    load_done_ids,
)

SLICE_START = 64
SLICE_END = 126
JSONL = Path("/tmp/drive-inventory/gap-15-17.jsonl")


def tracks() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def pending() -> list[dict]:
    done = load_done_ids()
    return [t for t in tracks() if t["id"] not in done]


def missing_mp3() -> list[str]:
    return [t["id"] for t in pending() if not (WORK / f"{t['id']}.mp3").exists()]


def needs_analyze() -> list[str]:
    out = []
    for t in pending():
        sid = t["id"]
        if not (WORK / f"{sid}.mp3").exists():
            continue
        if not (WORK / f"{sid}.json").exists():
            out.append(sid)
    return out


def needs_cover() -> list[str]:
    out = []
    for t in pending():
        sid = t["id"]
        jpg = Path(f"/workspace/music-tagging/covers/gap15/{sid}.jpg")
        if (WORK / f"{sid}.json").exists() and not jpg.exists():
            out.append(sid)
    return out


def ready_finalize() -> list[str]:
    out = []
    for t in pending():
        sid = t["id"]
        jpg = Path(f"/workspace/music-tagging/covers/gap15/{sid}.jpg")
        png = Path(f"/opt/cursor/artifacts/assets/{sid}.png")
        png_jpg = Path(f"/opt/cursor/artifacts/assets/{sid}.jpg")
        cover = png if png.exists() else (png_jpg if png_jpg.exists() else jpg)
        if (WORK / f"{sid}.mp3").exists() and (WORK / f"{sid}.json").exists() and cover.exists():
            if not (WORK / f"{sid}.tagged.mp3").exists():
                out.append(sid)
    return out


def upload_payload(sid: str) -> dict:
    meta = json.loads((WORK / f"{sid}.json").read_text())
    tagged = WORK / f"{sid}.tagged.mp3"
    return {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }


def write_upload_files(sid: str) -> None:
    p = upload_payload(sid)
    (WORK / f"{sid}.upload.json").write_text(json.dumps(p))
    (WORK / f"{sid}.upload.b64").write_text(p["base64Content"])
    print(json.dumps({"sid": sid, "b64_len": len(p["base64Content"]), "bytes": (WORK / f"{sid}.tagged.mp3").stat().st_size}))


def batch_analyze() -> None:
    for t in pending():
        sid = t["id"]
        mp3 = WORK / f"{sid}.mp3"
        if not mp3.exists():
            continue
        cmd_analyze(sid, mp3, t["title"])
        meta = json.loads((WORK / f"{sid}.json").read_text())
        (WORK / f"{sid}.prompt.txt").write_text(cover_prompt(meta))
        print("analyzed", sid)


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        print(
            json.dumps(
                {
                    "pending": len(pending()),
                    "missing_mp3": len(missing_mp3()),
                    "needs_analyze": len(needs_analyze()),
                    "needs_cover": len(needs_cover()),
                    "ready_finalize": len(ready_finalize()),
                    "done": len(load_done_ids()),
                },
                indent=2,
            )
        )
    elif cmd == "missing-ids":
        for i in missing_mp3():
            print(i)
    elif cmd == "batch-analyze":
        batch_analyze()
    elif cmd == "prompt":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        print(cover_prompt(meta))
    elif cmd == "finalize":
        sid, cover = sys.argv[2], Path(sys.argv[3])
        mp3 = WORK / f"{sid}.mp3"
        cmd_finalize(sid, mp3, cover)
        write_upload_files(sid)
    elif cmd == "append":
        cmd_append(sys.argv[2], sys.argv[3])
    elif cmd == "upload-prep":
        write_upload_files(sys.argv[2])
    elif cmd == "list-ready-upload":
        for t in pending():
            sid = t["id"]
            if (WORK / f"{sid}.tagged.mp3").exists() and not (WORK / f"{sid}.upload.json").exists():
                print(sid)
    else:
        print("commands: status missing-ids batch-analyze prompt finalize append upload-prep list-ready-upload")
        sys.exit(2)


if __name__ == "__main__":
    main()
