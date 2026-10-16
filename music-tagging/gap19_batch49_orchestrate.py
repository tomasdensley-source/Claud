#!/usr/bin/env python3
"""Batch 49 orchestration helpers (lines 291-435)."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/gap19-work/tracks.jsonl")
MP3 = Path("/tmp/gap19-work")
COVERS_PNG = Path("/tmp/gap19-work/covers")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-c.csv")
PIPE = Path(__file__).with_name("gap19_batch49.py")


def tracks() -> list[dict]:
    return [json.loads(l) for l in JSONL.read_text().splitlines() if l.strip()]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 500:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def cmd_needs_cover(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = MP3 / f"{t['id']}.json"
        png = COVERS_PNG / f"{t['id']}.png"
        if meta.exists() and not png.exists():
            prompt = subprocess.check_output(
                ["python3", str(PIPE), "prompt", t["id"]], text=True
            ).strip()
            m = json.loads(meta.read_text())
            print(
                json.dumps(
                    {
                        "id": t["id"],
                        "title": m.get("TIT2", ""),
                        "artist": m.get("TPE1", ""),
                        "prompt": prompt,
                    }
                )
            )
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 20) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        png = COVERS_PNG / f"{t['id']}.png"
        tagged = MP3 / "tagged" / f"{t['id']}.mp3"
        if png.exists() and not tagged.exists():
            print(t["id"])
            n -= 1
            if n <= 0:
                break


def cmd_needs_upload(n: int = 20) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        tagged = MP3 / "tagged" / f"{t['id']}.mp3"
        if tagged.exists():
            print(t["id"])
            n -= 1
            if n <= 0:
                break


def cmd_status() -> None:
    done = done_ids()
    ts = tracks()
    have_mp3 = sum(1 for t in ts if (MP3 / f"{t['id']}.mp3").exists())
    have_meta = sum(1 for t in ts if (MP3 / f"{t['id']}.json").exists())
    have_png = sum(1 for t in ts if (COVERS_PNG / f"{t['id']}.png").exists())
    have_tagged = sum(1 for t in ts if (MP3 / "tagged" / f"{t['id']}.mp3").exists())
    print(
        json.dumps(
            {
                "total": len(ts),
                "csv_done": len(done),
                "mp3": have_mp3,
                "meta": have_meta,
                "cover_png": have_png,
                "tagged": have_tagged,
            }
        )
    )


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "status"
    if c == "needs-cover":
        cmd_needs_cover(int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    elif c == "needs-finalize":
        cmd_needs_finalize(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "needs-upload":
        cmd_needs_upload(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    elif c == "status":
        cmd_status()
