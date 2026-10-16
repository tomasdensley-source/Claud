#!/usr/bin/env python3
"""Fallback: fetch >10MB batch-54 tracks via YouTube id (Drive MCP size cap)."""
import json
import re
import subprocess
from pathlib import Path

JSONL = Path("/tmp/batch54-tracks.jsonl")
OUT = Path("/tmp/gap19-work/mp3")
YTDLP = "/home/ubuntu/.local/bin/yt-dlp"
LARGE = Path("/tmp/batch54-missing-large.txt")


def yt_id(title: str) -> str | None:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]", title)
    return m.group(1) if m else None


def main():
    tracks = {json.loads(l)["id"]: json.loads(l) for l in JSONL.read_text().strip().split("\n")}
    for fid in LARGE.read_text().strip().split("\n"):
        if not fid:
            continue
        dest = OUT / f"{fid}.mp3"
        if dest.exists() and dest.stat().st_size > 100_000:
            print("skip", fid)
            continue
        t = tracks[fid]
        vid = yt_id(t["title"])
        if not vid:
            print("no yt", fid)
            continue
        tmp = OUT / f"{fid}.part.mp3"
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
            "-o",
            str(tmp),
            url,
        ]
        print("fetch", fid, vid)
        subprocess.run(cmd, check=True)
        if tmp.exists():
            tmp.rename(dest)
            print("saved", dest, dest.stat().st_size)


if __name__ == "__main__":
    main()
