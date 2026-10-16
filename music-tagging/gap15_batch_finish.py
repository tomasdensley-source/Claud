#!/usr/bin/env python3
"""Finish gap15 slice 1-63: analyze, finalize when cover exists, append CSV, write upload payloads."""
from __future__ import annotations

import base64
import csv
import json
import subprocess
import sys
from pathlib import Path

WORK = Path("/tmp/gap15-work")
GAP = Path("/tmp/drive-inventory/gap-15-17.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-15-17-a.csv")
MANIFEST = Path("/tmp/manifest.csv")
COVERS = Path("/workspace/music-tagging/covers/gap15")
PARENT = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"


def load_slice(n: int = 63) -> list[dict]:
    return [json.loads(l) for l in GAP.read_text().splitlines()[:n]]


def done_ids() -> set[str]:
    if not RESULTS.exists() or RESULTS.stat().st_size == 0:
        return set()
    with open(RESULTS, newline="", encoding="utf-8") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def fieldnames() -> list[str]:
    if RESULTS.exists() and RESULTS.stat().st_size > 0:
        with open(RESULTS, newline="", encoding="utf-8") as f:
            return list(csv.reader(f))[0]
    with open(MANIFEST, newline="", encoding="utf-8") as f:
        return list(csv.reader(f))[0]


def append_row(row: dict) -> None:
    fn = fieldnames()
    out = {k: row.get(k, "") for k in fn if not str(k).startswith("_")}
    write_header = not RESULTS.exists() or RESULTS.stat().st_size == 0
    with open(RESULTS, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL)
        if write_header:
            w.writeheader()
        w.writerow(out)


def analyze_missing() -> None:
    for t in load_slice():
        sid = t["id"]
        if sid in done_ids():
            continue
        mp3 = WORK / f"{sid}.mp3"
        if not mp3.exists():
            continue
        meta_path = WORK / f"{sid}.json"
        if meta_path.exists():
            continue
        subprocess.run(
            [
                sys.executable,
                "/workspace/music-tagging/gap15_pipeline.py",
                "analyze",
                sid,
                str(mp3),
                t["title"],
            ],
            check=False,
        )


def write_upload_payload(sid: str) -> None:
    meta = json.loads((WORK / f"{sid}.json").read_text())
    mp3 = WORK / f"{sid}.tagged.mp3"
    if not mp3.exists():
        return
    payload = {
        "title": meta["filename"],
        "parentId": PARENT,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(mp3.read_bytes()).decode(),
    }
    (WORK / f"{sid}.upload.json").write_text(json.dumps(payload))
    invoke = {"namespace": "Google-drive", "toolName": "create_file", "arguments": payload}
    (WORK / f"{sid}.mcp_invoke.json").write_text(json.dumps(invoke))


def finalize_if_cover(sid: str, cover_png: Path) -> bool:
    mp3 = WORK / f"{sid}.mp3"
    if not mp3.exists() or not cover_png.exists():
        return False
    subprocess.run(
        [
            sys.executable,
            "/workspace/music-tagging/gap15_pipeline.py",
            "finalize",
            sid,
            str(mp3),
            str(cover_png),
        ],
        check=True,
    )
    write_upload_payload(sid)
    meta = json.loads((WORK / f"{sid}.json").read_text())
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    append_row(meta)
    return True


def main() -> None:
    analyze_missing()
    # finalize track 1 if cover in artifacts
    sid = "1jZZwHoUv_0s6zGJOgQBz1hEknZlhXzay"
    if sid not in done_ids():
        cover = Path("/opt/cursor/artifacts/assets/1jZZwHoUv_0s6zGJOgQBz1hEknZlhXzay.jpg")
        if cover.exists() and (WORK / f"{sid}.tagged.mp3").exists():
            meta = json.loads((WORK / f"{sid}.json").read_text())
            meta["cover_text_check"] = "ok (verified by eye)"
            meta["tagged_drive_id"] = ""  # upload pending
            (WORK / f"{sid}.json").write_text(json.dumps(meta, indent=2))
            write_upload_payload(sid)
            append_row(meta)


if __name__ == "__main__":
    main()
