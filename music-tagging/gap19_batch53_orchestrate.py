#!/usr/bin/env python3
"""Batch 53 orchestration helpers."""
from __future__ import annotations

import base64
import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/gap19-work/batch53_tracks.jsonl")
MP3 = Path("/tmp/gap19-work/mp3")
COVERS_PNG = Path("/tmp/gap19-work/covers")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-g.csv")
PIPE = Path(__file__).with_name("gap19_batch53.py")


def tracks() -> list[dict]:
    return [json.loads(l) for l in JSONL.read_text().splitlines() if l.strip()]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 500:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def cmd_needs_download(n: int = 20) -> None:
    done = done_ids()
    out = []
    for t in tracks():
        if t["id"] in done:
            continue
        if not (MP3 / f"{t['id']}.mp3").exists():
            out.append(t["id"])
        if len(out) >= n:
            break
    print("\n".join(out))


def cmd_needs_analyze(n: int = 50) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        mp3 = MP3 / f"{t['id']}.mp3"
        meta = MP3 / f"{t['id']}.json"
        if mp3.exists() and not meta.exists():
            print(t["id"], t["title"][:70])
            n -= 1
            if n <= 0:
                break


def cmd_needs_cover(n: int = 20) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = MP3 / f"{t['id']}.json"
        png = COVERS_PNG / f"{t['id']}.png"
        if meta.exists() and not png.exists():
            m = json.loads(meta.read_text())
            print(json.dumps({"id": t["id"], "title": m["TIT2"], "prompt": subprocess.check_output(
                ["python3", str(PIPE), "prompt", t["id"]], text=True
            ).strip()}))
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 20) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        png = COVERS_PNG / f"{t['id']}.png"
        mp3 = MP3 / f"{t['id']}.mp3"
        meta = MP3 / f"{t['id']}.json"
        if mp3.exists() and meta.exists() and png.exists():
            print(t["id"], t["title"][:60])
            n -= 1
            if n <= 0:
                break


def cmd_upload_prep(source_id: str) -> None:
    tagged = MP3 / f"{source_id}.tagged.mp3"
    if not tagged.exists():
        print("missing tagged mp3", file=sys.stderr)
        sys.exit(1)
    meta = json.loads((MP3 / f"{source_id}.json").read_text())
    print(json.dumps({
        "title": meta["filename"],
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }))


def cmd_status() -> None:
    done = done_ids()
    ts = tracks()
    have_mp3 = sum(1 for t in ts if (MP3 / f"{t['id']}.mp3").exists())
    have_meta = sum(1 for t in ts if (MP3 / f"{t['id']}.json").exists())
    have_png = sum(1 for t in ts if (COVERS_PNG / f"{t['id']}.png").exists())
    have_jpg = sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists())
    print(json.dumps({
        "total": len(ts),
        "csv_done": len(done),
        "mp3": have_mp3,
        "meta": have_meta,
        "cover_png": have_png,
        "cover_jpg": have_jpg,
    }))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("needs-download|needs-analyze|needs-cover|needs-finalize|upload-prep|status")
        sys.exit(1)
    c = sys.argv[1]
    if c == "needs-download":
        cmd_needs_download(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "needs-analyze":
        cmd_needs_analyze(int(sys.argv[2]) if len(sys.argv) > 2 else 50)
    elif c == "needs-cover":
        cmd_needs_cover(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "needs-finalize":
        cmd_needs_finalize(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "upload-prep":
        cmd_upload_prep(sys.argv[2])
    elif c == "status":
        cmd_status()
