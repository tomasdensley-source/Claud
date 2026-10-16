#!/usr/bin/env python3
"""Batch 47 orchestration: gap-19-21.jsonl lines 1-145."""
from __future__ import annotations

import base64
import csv
import json
import subprocess
import sys
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
SLICE = (1, 145)
MP3 = Path("/tmp/gap19-work/mp3")
META = Path("/tmp/gap19-work")
COVERS_PNG = Path("/tmp/gap19-work/covers")
COVERS_JPG = Path("/workspace/music-tagging/covers/gap19")
RESULTS = Path("/tmp/drive-inventory/results-19-21-a.csv")
PIPE = Path(__file__).with_name("gap19_batch47.py")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def tracks() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE[0], SLICE[1] + 1)]


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
            out.append(t["id"])
        if len(out) >= n:
            break
    print("\n".join(out))


def cmd_needs_analyze(n: int = 100) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        mp3 = MP3 / f"{t['id']}.mp3"
        meta = META / f"{t['id']}.json"
        if mp3.exists() and not meta.exists():
            print(t["id"], t["title"][:75])
            n -= 1
            if n <= 0:
                break


def cmd_needs_cover(n: int = 30) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        meta = META / f"{t['id']}.json"
        png = COVERS_PNG / f"{t['id']}.png"
        jpg = COVERS_JPG / f"{t['id']}.jpg"
        if meta.exists() and not png.exists() and not jpg.exists():
            m = json.loads(meta.read_text())
            prompt = subprocess.check_output(
                ["python3", str(PIPE), "prompt", t["id"]], text=True
            ).strip()
            print(
                json.dumps(
                    {
                        "id": t["id"],
                        "filename": m["filename"],
                        "title": m["TIT2"],
                        "cover_artist": m.get("_cover_artist", m["TPE1"]),
                        "prompt": prompt,
                    }
                )
            )
            n -= 1
            if n <= 0:
                break


def cmd_needs_finalize(n: int = 30) -> None:
    done = done_ids()
    for t in tracks():
        if t["id"] in done:
            continue
        sid = t["id"]
        mp3 = MP3 / f"{sid}.mp3"
        meta = META / f"{sid}.json"
        png = COVERS_PNG / f"{sid}.png"
        art = Path(f"/opt/cursor/artifacts/assets/cover-{sid}.jpg")
        if mp3.exists() and meta.exists() and (png.exists() or art.exists() or (COVERS_JPG / f"{sid}.jpg").exists()):
            cover = png if png.exists() else (art if art.exists() else COVERS_JPG / f"{sid}.jpg")
            print(json.dumps({"id": sid, "cover": str(cover), "title": t["title"][:60]}))
            n -= 1
            if n <= 0:
                break


def cmd_upload_prep(sid: str) -> None:
    tagged = META / f"{sid}.tagged.mp3"
    if not tagged.exists():
        sys.exit(f"missing tagged {tagged}")
    meta = json.loads((META / f"{sid}.json").read_text())
    payload = {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    out = META / f"{sid}.upload.json"
    out.write_text(json.dumps(payload))
    print(json.dumps({"upload_json": str(out), "b64_len": len(payload["base64Content"])}))


def cmd_status() -> None:
    done = done_ids()
    ts = tracks()
    print(
        json.dumps(
            {
                "total": len(ts),
                "csv_done": len(done),
                "mp3": sum(1 for t in ts if (MP3 / f"{t['id']}.mp3").exists()),
                "meta": sum(1 for t in ts if (META / f"{t['id']}.json").exists()),
                "cover_jpg": sum(1 for t in ts if (COVERS_JPG / f"{t['id']}.jpg").exists()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("needs-download|needs-analyze|needs-cover|needs-finalize|upload-prep|status")
        sys.exit(1)
    c = sys.argv[1]
    if c == "needs-download":
        cmd_needs_download(int(sys.argv[2]) if len(sys.argv) > 2 else 30)
    elif c == "needs-analyze":
        cmd_needs_analyze(int(sys.argv[2]) if len(sys.argv) > 2 else 100)
    elif c == "needs-cover":
        cmd_needs_cover(int(sys.argv[2]) if len(sys.argv) > 2 else 30)
    elif c == "needs-finalize":
        cmd_needs_finalize(int(sys.argv[2]) if len(sys.argv) > 2 else 30)
    elif c == "upload-prep":
        cmd_upload_prep(sys.argv[2])
    elif c == "status":
        cmd_status()
