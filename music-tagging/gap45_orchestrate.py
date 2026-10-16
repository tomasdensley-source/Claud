#!/usr/bin/env python3
"""Orchestrate batch 45: needs-cover, needs-finalize, needs-upload, save-dl."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

RESULTS = Path("/tmp/drive-inventory/results-17-19-g.csv")
WORK = Path("/tmp/gap45-work")
COVERS = Path("/workspace/music-tagging/covers/gap17")
PIPE = Path(__file__).with_name("gap45_batch45.py")
JSONL = Path("/tmp/gap-batch-45.jsonl")


def tracks() -> list[dict]:
    return [json.loads(l) for l in JSONL.read_text().splitlines() if l.strip()]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size < 200:
        return set()
    with RESULTS.open(newline="", encoding="utf-8") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def mp3_path(sid: str) -> Path:
    for p in (WORK / f"{sid}.mp3", WORK / "mp3" / f"{sid}.mp3"):
        if p.exists():
            return p
    return WORK / f"{sid}.mp3"


def title_for(sid: str) -> str:
    for t in tracks():
        if t["id"] == sid:
            return t["title"]
    return ""


def cmd_needs_download(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done or mp3_path(sid).exists():
            continue
        print(sid, t["title"][:80])
        n -= 1
        if n <= 0:
            break


def cmd_needs_analyze(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done or not mp3_path(sid).exists() or (WORK / f"{sid}.json").exists():
            continue
        print(sid, title_for(sid))
        n -= 1
        if n <= 0:
            break


def cmd_needs_cover(n: int = 5) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done or not (WORK / f"{sid}.json").exists():
            continue
        if (COVERS / f"{sid}.jpg").exists():
            continue
        m = json.loads((WORK / f"{sid}.json").read_text())
        prompt = subprocess.check_output(["python3", str(PIPE), "prompt", sid], text=True).strip()
        print(json.dumps({"id": sid, "TIT2": m.get("TIT2"), "filename": m.get("filename"), "prompt": prompt[:500]}))
        n -= 1
        if n <= 0:
            break


def cmd_needs_finalize(n: int = 10) -> None:
    done = done_ids()
    for t in tracks():
        sid = t["id"]
        if sid in done:
            continue
        art = COVERS / f"{sid}.jpg"
        png = WORK / f"{sid}.cover.png"
        src = art if art.exists() else (png if png.exists() else None)
        if mp3_path(sid).exists() and (WORK / f"{sid}.json").exists() and src:
            print(sid, str(src))
            n -= 1
            if n <= 0:
                break


def cmd_needs_upload(n: int = 10) -> None:
    if not RESULTS.exists():
        return
    with RESULTS.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("tagged_drive_id"):
                continue
            sid = r.get("source_drive_id", "")
            if sid and (WORK / f"{sid}.tagged.mp3").exists():
                print(sid, r.get("filename", "")[:60])
                n -= 1
                if n <= 0:
                    break


if __name__ == "__main__":
    c = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    cmds = {
        "needs-download": cmd_needs_download,
        "needs-analyze": cmd_needs_analyze,
        "needs-cover": cmd_needs_cover,
        "needs-finalize": cmd_needs_finalize,
        "needs-upload": cmd_needs_upload,
    }
    if c not in cmds:
        print("|".join(cmds))
        sys.exit(2)
    cmds[c](n)
