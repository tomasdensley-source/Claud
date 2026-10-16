#!/usr/bin/env python3
"""Batch 38: gap-15-17.jsonl lines 190-251 -> results-15-17-d.csv"""
from __future__ import annotations

import base64
import csv
import json
import subprocess
import sys
from pathlib import Path

import gap15_pipeline as gp

SLICE = (190, 251)
RESULTS = Path("/tmp/drive-inventory/results-15-17-d.csv")
WORK = Path("/tmp/gap15-work")
COVERS = Path("/workspace/music-tagging/covers/gap15")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"

gp.RESULTS = RESULTS
gp.BATCH = "38"


def load_slice():
    lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE[0], SLICE[1] + 1)]


def init_results():
    if not RESULTS.exists() or RESULTS.stat().st_size == 0:
        with open(RESULTS, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(gp.csv_fieldnames())


def needs_cover(sid: str) -> bool:
    return not (COVERS / f"{sid}.jpg").exists()


def artifact_paths(sid: str) -> list[Path]:
    arts = Path("/opt/cursor/artifacts/assets")
    return list(arts.glob(f"gap15-{sid[:8]}*")) + list(arts.glob(f"*{sid}*"))


def cmd_list_needs_cover():
    done = gp.load_done_ids()
    for t in load_slice():
        sid = t["id"]
        if sid in done:
            continue
        if needs_cover(sid):
            print(sid)


def cmd_finalize(sid: str, cover_src: str, tagged_id: str = ""):
    mp3 = WORK / f"{sid}.mp3"
    gp.cmd_finalize(sid, mp3, Path(cover_src), tagged_id)
    if tagged_id:
        gp.cmd_append(sid, tagged_id)


def cmd_make_upload_json(sid: str):
    tagged = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    payload = {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
    }
    p = WORK / f"{sid}.upload.json"
    p.write_text(json.dumps(payload))
    print(p)


def cmd_upload(sid: str):
    p = WORK / f"{sid}.upload.json"
    if not p.exists():
        cmd_make_upload_json(sid)
    out = subprocess.check_output(
        ["python3", "/workspace/music-tagging/mcp_drive_call.py", "create-from-upload-json", str(p)],
        text=True,
    )
    data = json.loads(out)
    fid = None
    if isinstance(data, dict):
        if "result" in data and isinstance(data["result"], dict):
            content = data["result"].get("content")
            if content and isinstance(content, list):
                for block in content:
                    if block.get("type") == "text":
                        inner = json.loads(block["text"])
                        fid = inner.get("id")
        fid = fid or data.get("id")
    if not fid:
        raise RuntimeError(f"upload failed: {out[:500]}")
    gp.cmd_append(sid, fid)
    print(fid)


def cmd_complete(sid: str, cover_src: str):
    cmd_finalize(sid, cover_src, "")
    cmd_upload(sid)


if __name__ == "__main__":
    init_results()
    cmd = sys.argv[1]
    if cmd == "list-needs-cover":
        cmd_list_needs_cover()
    elif cmd == "finalize":
        cmd_finalize(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "")
    elif cmd == "upload":
        cmd_upload(sys.argv[2])
    elif cmd == "complete":
        cmd_complete(sys.argv[2], sys.argv[3])
    else:
        print("list-needs-cover | finalize id cover [tagged_id] | upload id | complete id cover")
        sys.exit(2)
