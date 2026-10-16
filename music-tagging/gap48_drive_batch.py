#!/usr/bin/env python3
"""Emit next N pending source IDs for Drive download (batch 48)."""
import json
import subprocess
import sys
from pathlib import Path

SLICE = (146, 290)
JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
WORK = Path("/tmp/gap48-work")


def pending(limit: int = 10) -> list[dict]:
    out = subprocess.check_output(
        [sys.executable, str(Path(__file__).parent / "gap48_batch19_21.py"), "list-pending"],
        text=True,
    )
    ids = []
    for line in out.strip().split("\n"):
        if not line.strip():
            continue
        sid = line.split()[0]
        ids.append(sid)
        if len(ids) >= limit:
            break
    lines = JSONL.read_text().splitlines()
    a, b = SLICE
    by_id = {json.loads(l)["id"]: json.loads(l) for l in lines[a - 1 : b]}
    return [by_id[i] for i in ids if i in by_id]


def needs_mp3(limit: int = 20) -> list[str]:
    pending_ids = []
    out = subprocess.check_output(
        [sys.executable, str(Path(__file__).parent / "gap48_batch19_21.py"), "list-pending"],
        text=True,
    )
    for line in out.strip().split("\n"):
        if not line.strip():
            continue
        sid = line.split()[0]
        if not (WORK / f"{sid}.mp3").exists():
            pending_ids.append(sid)
        if len(pending_ids) >= limit:
            break
    return pending_ids


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "needs-mp3":
        for i in needs_mp3(int(sys.argv[2]) if len(sys.argv) > 2 else 15):
            print(i)
    elif cmd == "needs-cover":
        subprocess.run([sys.executable, str(Path(__file__).parent / "gap48_batch19_21.py"), "list-needs-cover"])
    else:
        for t in pending(int(sys.argv[1]) if len(sys.argv) > 1 else 5):
            print(t["id"])
