#!/usr/bin/env python3
"""Batch 50 orchestration — gap-19-21.jsonl lines 436-580."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/gap19-work/tracks_batch50.jsonl")
WORK = Path("/tmp/gap19-work")
COVERS_ART = Path("/opt/cursor/artifacts/assets")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-d.csv")
PIPE = Path(__file__).with_name("gap19_batch50.py")


def tracks() -> list[dict]:
    return [json.loads(l) for l in JSONL.read_text().splitlines() if l.strip()]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 200:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def mp3_path(sid: str) -> Path | None:
    for p in (WORK / f"{sid}.mp3", WORK / "mp3" / f"{sid}.mp3"):
        if p.exists() and p.stat().st_size > 1000:
            return p
    return None


def cmd_needs_cover(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        meta = WORK / f"{sid}.json"
        jpg = COVERS_JPG / f"{sid}.jpg"
        if meta.exists() and not jpg.exists():
            prompt = subprocess.check_output(
                ["python3", str(PIPE), "prompt", sid], text=True
            ).strip()
            m = json.loads(meta.read_text())
            print(
                json.dumps(
                    {
                        "id": sid,
                        "title": m["TIT2"],
                        "artist": m.get("_cover_artist") or m["TPE1"],
                        "prompt": prompt,
                    }
                )
            )
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 25) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        if not (WORK / f"{sid}.json").exists() or not mp3_path(sid):
            continue
        for ext in (".png", ".webp", ".jpg"):
            for base in (COVERS_ART, Path("/opt/cursor/artifacts")):
                art = base / f"{sid}{ext}"
                if art.exists():
                    print(sid, str(art))
                    n -= 1
                    break
            else:
                continue
            break
        if n <= 0:
            break


def cmd_needs_upload(n: int = 25) -> None:
    if not RESULTS.exists():
        return
    with open(RESULTS, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        if r.get("batch") != "50":
            continue
        if r.get("tagged_drive_id"):
            continue
        sid = r["source_drive_id"]
        if (WORK / f"{sid}.upload.json").exists():
            print(sid, r.get("filename", "")[:55])
            n -= 1
            if n <= 0:
                break


def cmd_status() -> None:
    ts = tracks()
    done = done_ids()
    print(
        json.dumps(
            {
                "total": len(ts),
                "csv_done": len(done),
                "mp3": sum(1 for t in ts if mp3_path(t["id"])),
                "meta": sum(1 for t in ts if (WORK / f"{t['id']}.json").exists()),
                "jpg": sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists()),
            }
        )
    )


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "status"
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    {"needs-cover": cmd_needs_cover, "needs-finalize": cmd_needs_finalize, "needs-upload": cmd_needs_upload, "status": cmd_status}[c](n) if c != "status" else cmd_status()
