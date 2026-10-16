#!/usr/bin/env python3
"""Batch 49 autopilot: prep-tagged + upload-json for tracks with cover JPG."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import gap19_batch49 as b49
from gap17_pipeline import load_done_ids

WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
PIPE = Path(__file__).with_name("gap19_batch49.py")
UPLOAD = Path(__file__).with_name("gap19_upload_one.py")


def slice_ids() -> list[str]:
    return [t["id"] for t in b49.load_slice()]


def prep_one(sid: str, cover: Path) -> Path | None:
    mp3 = b49.mp3_path(sid)
    if not mp3.exists() or not cover.exists():
        return None
    subprocess.check_call(
        [sys.executable, str(PIPE), "prep-tagged", sid, str(cover)],
    )
    tagged = WORK / "tagged" / f"{sid}.mp3"
    return tagged if tagged.exists() else None


def upload_json(sid: str) -> Path:
    subprocess.check_call([sys.executable, str(UPLOAD), sid])
    return WORK / "upload" / f"{sid}.json"


def main() -> None:
    cmd = sys.argv[1]
    done = load_done_ids()
    if cmd == "list-ready":
        for sid in slice_ids():
            if sid in done:
                continue
            cov = COVERS / f"{sid}.jpg"
            tagged = WORK / "tagged" / f"{sid}.mp3"
            if cov.exists() and not tagged.exists():
                print(sid)
            elif tagged.exists() and sid not in done:
                print(sid, "needs-upload")
    elif cmd == "prep-all-covers":
        n = 0
        for sid in slice_ids():
            if sid in done:
                continue
            cov = COVERS / f"{sid}.jpg"
            if cov.exists() and not (WORK / "tagged" / f"{sid}.mp3").exists():
                prep_one(sid, cov)
                n += 1
        print("prepped", n)
    elif cmd == "prep":
        sid = sys.argv[2]
        cover = Path(sys.argv[3])
        prep_one(sid, cover)
        print(upload_json(sid))
    elif cmd == "finalize-row":
        sid, tid = sys.argv[2], sys.argv[3]
        subprocess.check_call([sys.executable, str(PIPE), "append-row", sid, tid])
        print("ok", sid, tid)


if __name__ == "__main__":
    main()
