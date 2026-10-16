#!/usr/bin/env python3
"""Batch 51 orchestration — gap-19-21.jsonl lines 581-725."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/gap19-work/tracks.json")
WORK = Path("/tmp/gap19-work")
COVERS_ART = Path("/opt/cursor/artifacts/assets")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-e.csv")
PIPE = Path(__file__).with_name("gap19_batch51.py")


def tracks() -> list[dict]:
    return json.loads(JSONL.read_text())


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 200:
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def mp3_path(sid: str) -> Path | None:
    p = WORK / f"{sid}.mp3"
    return p if p.exists() and p.stat().st_size > 1000 else None


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
        if mp3_path(t["id"]) and not (WORK / f"{t['id']}.json").exists():
            print(t["id"], t["title"][:70])
            n -= 1
            if n <= 0:
                break


def cmd_needs_cover(n: int = 15) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = WORK / f"{t['id']}.json"
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
        meta = WORK / f"{sid}.json"
        for name in (f"gap19-{sid}.jpg", f"{sid}.jpg", f"gap19-{sid}.png", f"{sid}.png"):
            art = COVERS_ART / name
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
        if r.get("batch") != "51":
            continue
        sid = r.get("source_drive_id", "")
        if not sid or r.get("tagged_drive_id"):
            continue
        tagged = WORK / f"{sid}.tagged.mp3"
        if tagged.exists():
            meta = json.loads((WORK / f"{sid}.json").read_text())
            print(json.dumps({"id": sid, "filename": meta["filename"], "upload_json": str(WORK / f"{sid}.upload.json")}))
            n -= 1
            if n <= 0:
                break


def cmd_status() -> None:
    done = done_ids()
    ts = tracks()
    print(
        json.dumps(
            {
                "total": len(ts),
                "csv_rows": len(done),
                "mp3": sum(1 for t in ts if mp3_path(t["id"])),
                "meta": sum(1 for t in ts if (WORK / f"{t['id']}.json").exists()),
                "cover_jpg": sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists()),
                "tagged_mp3": sum(1 for t in ts if (WORK / f"{t['id']}.tagged.mp3").exists()),
            }
        )
    )


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
