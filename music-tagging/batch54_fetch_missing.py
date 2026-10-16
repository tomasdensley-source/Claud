#!/usr/bin/env python3
"""Fetch missing batch-54 MP3s via YouTube id when Drive MCP unavailable/slow."""
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

JSONL = Path("/tmp/batch54-tracks.jsonl")
OUT = Path("/tmp/gap19-work/mp3")
YTDLP = "/home/ubuntu/.local/bin/yt-dlp"


def yt_id(title: str) -> str | None:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]", title)
    return m.group(1) if m else None


def fetch_one(t: dict) -> tuple[str, str]:
    fid = t["id"]
    dest = OUT / f"{fid}.mp3"
    if dest.exists() and dest.stat().st_size > 100_000:
        return fid, "skip"
    vid = yt_id(t["title"])
    if not vid:
        return fid, "no_yt"
    tmp = OUT / f"{fid}.dl.mp3"
    url = f"https://www.youtube.com/watch?v={vid}"
    cmd = [
        YTDLP,
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--no-playlist",
        "-o",
        str(tmp),
        url,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    except subprocess.CalledProcessError as e:
        return fid, f"err:{e.stderr.decode()[:120]}"
    except subprocess.TimeoutExpired:
        return fid, "timeout"
    if not tmp.exists():
        # yt-dlp may use .mp3 extension differently
        cands = list(OUT.glob(f"{fid}.dl.*"))
        if cands:
            cands[0].rename(dest)
            return fid, "ok"
        return fid, "no_file"
    tmp.rename(dest)
    return fid, "ok"


def main():
    tracks = [json.loads(l) for l in JSONL.read_text().strip().split("\n")]
    missing = [t for t in tracks if not (OUT / f"{t['id']}.mp3").exists()]
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    print("missing", len(missing), "workers", workers)
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fetch_one, t): t["id"] for t in missing}
        for fut in as_completed(futs):
            fid, status = fut.result()
            print(fid, status)
            if status == "ok":
                ok += 1
            elif status != "skip":
                fail += 1
    print("done ok", ok, "fail", fail)


if __name__ == "__main__":
    main()
