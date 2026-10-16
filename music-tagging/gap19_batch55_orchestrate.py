#!/usr/bin/env python3
"""Batch 55 orchestration — gap-19-21.jsonl lines 1161-1305."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/gap19-batch55-tracks.json")
MP3 = Path("/tmp/gap19-work")
COVERS_ART = Path("/opt/cursor/artifacts/assets")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-i.csv")
PIPE = Path(__file__).with_name("gap19_batch55.py")


def tracks() -> list[dict]:
    return json.loads(JSONL.read_text())


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 200:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def mp3_path(sid: str) -> Path | None:
    p = MP3 / f"{sid}.mp3"
    if p.exists() and p.stat().st_size > 1000:
        return p
    return None


def cmd_needs_download(n: int = 25) -> None:
    done = done_ids()
    out = []
    for t in tracks():
        if t["id"] in done:
            continue
        if not mp3_path(t["id"]):
            out.append(f"{t['id']}\t{t['title']}")
        if len(out) >= n:
            break
    print("\n".join(out))


def cmd_needs_analyze(n: int = 50) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        if mp3_path(t["id"]) and not (MP3 / f"{t['id']}.json").exists():
            print(t["id"], t["title"][:70])
            n -= 1
            if n <= 0:
                break


def cmd_needs_cover(n: int = 15) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = MP3 / f"{t['id']}.json"
        jpg = COVERS_JPG / f"{t['id']}.jpg"
        if meta.exists() and not jpg.exists():
            prompt = subprocess.check_output(
                ["python3", str(PIPE), "prompt", t["id"]], text=True
            ).strip()
            m = json.loads(meta.read_text())
            print(json.dumps({"id": t["id"], "title": m["TIT2"], "prompt": prompt}))
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 25) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        meta = MP3 / f"{sid}.json"
        for ext in (".png", ".jpg", ".webp"):
            art = COVERS_ART / f"{sid}{ext}"
            if art.exists() and meta.exists() and mp3_path(sid):
                print(sid, str(art))
                n -= 1
                break
        if n <= 0:
            break


def cmd_needs_upload(n: int = 25) -> None:
    if not RESULTS.exists():
        return
    with open(RESULTS, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        if r.get("batch") != "55":
            continue
        if r.get("tagged_drive_id"):
            continue
        sid = r["source_drive_id"]
        if (MP3 / f"{sid}.tagged.mp3").exists():
            print(sid, r.get("filename", "")[:50])
            n -= 1
            if n <= 0:
                break


def cmd_status() -> None:
    ts = tracks()
    done = done_ids()
    have_mp3 = sum(1 for t in ts if mp3_path(t["id"]))
    have_meta = sum(1 for t in ts if (MP3 / f"{t['id']}.json").exists())
    have_jpg = sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists())
    tagged = sum(1 for t in ts if (MP3 / f"{t['id']}.tagged.mp3").exists())
    print(
        json.dumps(
            {
                "total": len(ts),
                "csv_done": len(done),
                "mp3": have_mp3,
                "meta": have_meta,
                "cover_jpg": have_jpg,
                "tagged_local": tagged,
            }
        )
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "needs-download|needs-analyze|needs-cover|needs-finalize|needs-upload|status"
        )
        sys.exit(1)
    c = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    {
        "needs-download": cmd_needs_download,
        "needs-analyze": cmd_needs_analyze,
        "needs-cover": cmd_needs_cover,
        "needs-finalize": cmd_needs_finalize,
        "needs-upload": cmd_needs_upload,
        "status": cmd_status,
    }[c](n) if c != "status" else cmd_status()
