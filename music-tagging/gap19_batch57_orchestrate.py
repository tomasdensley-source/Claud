#!/usr/bin/env python3
"""Batch 57 orchestration helpers (lines 1451-1595 → results-19-21-k.csv)."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
SLICE_START, SLICE_END = 1451, 1595
MP3 = Path("/tmp/gap19-work/mp3")
WORK = Path("/tmp/gap19-work")
COVERS_PNG = Path("/opt/cursor/artifacts/assets")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-k.csv")
PIPE = Path(__file__).with_name("gap19_batch57.py")


def tracks() -> list[dict]:
    lines = JSONL.read_text().strip().split("\n")
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 500:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def cmd_needs_download(n: int = 30) -> None:
    done = done_ids()
    out = []
    for t in tracks():
        if t["id"] in done:
            continue
        if not (MP3 / f"{t['id']}.mp3").exists():
            out.append(json.dumps(t))
        if len(out) >= n:
            break
    print("\n".join(out))


def cmd_needs_analyze(n: int = 50) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        mp3 = MP3 / f"{t['id']}.mp3"
        meta = WORK / f"{t['id']}.json"
        if mp3.exists() and mp3.stat().st_size > 10000 and not meta.exists():
            print(t["id"], t["title"][:80])
            n -= 1
            if n <= 0:
                break


def cmd_needs_cover(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = WORK / f"{t['id']}.json"
        jpg = COVERS_JPG / f"{t['id']}.jpg"
        if meta.exists() and not jpg.exists():
            m = json.loads(meta.read_text())
            prompt = subprocess.check_output(
                ["python3", str(PIPE), "prompt", t["id"]], text=True
            ).strip()
            print(json.dumps({"id": t["id"], "filename": f"{t['id']}.jpg", "TIT2": m["TIT2"], "prompt": prompt}))
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 20) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        meta = WORK / f"{sid}.json"
        mp3 = MP3 / f"{sid}.mp3"
        png = COVERS_PNG / f"{sid}.jpg"
        if not png.exists():
            png = COVERS_JPG / f"{sid}.jpg"
        if mp3.exists() and meta.exists() and png.exists() and not (WORK / f"{sid}.tagged.mp3").exists():
            print(json.dumps({"id": sid, "title": t["title"], "cover": str(png), "mp3": str(mp3)}))
            n -= 1
            if n <= 0:
                break


def cmd_needs_upload(n: int = 20) -> None:
    done = set()
    missing_tagged = []
    with open(RESULTS, newline="") as f:
        for r in csv.DictReader(f):
            sid = r.get("source_drive_id", "")
            if sid and not r.get("tagged_drive_id"):
                missing_tagged.append(sid)
    for sid in missing_tagged[:n]:
        tagged = WORK / f"{sid}.tagged.mp3"
        if tagged.exists():
            meta = json.loads((WORK / f"{sid}.json").read_text())
            print(json.dumps({"id": sid, "filename": meta["filename"]}))


def cmd_status() -> None:
    done = done_ids()
    ts = tracks()
    have_mp3 = sum(1 for t in ts if (MP3 / f"{t['id']}.mp3").exists())
    have_meta = sum(1 for t in ts if (WORK / f"{t['id']}.json").exists())
    have_jpg = sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists())
    have_tagged = sum(1 for t in ts if (WORK / f"{t['id']}.tagged.mp3").exists())
    print(json.dumps({
        "total": len(ts),
        "csv_rows": len(done),
        "mp3": have_mp3,
        "meta": have_meta,
        "cover_jpg": have_jpg,
        "tagged_mp3": have_tagged,
    }))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("needs-download|needs-analyze|needs-cover|needs-finalize|needs-upload|status")
        sys.exit(1)
    c = sys.argv[1]
    if c == "needs-download":
        cmd_needs_download(int(sys.argv[2]) if len(sys.argv) > 2 else 30)
    elif c == "needs-analyze":
        cmd_needs_analyze(int(sys.argv[2]) if len(sys.argv) > 2 else 50)
    elif c == "needs-cover":
        cmd_needs_cover(int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    elif c == "needs-finalize":
        cmd_needs_finalize(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "needs-upload":
        cmd_needs_upload(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "status":
        cmd_status()
