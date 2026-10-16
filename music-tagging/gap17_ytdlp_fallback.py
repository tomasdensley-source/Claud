#!/usr/bin/env python3
"""Download MP3 via YouTube id when Drive MCP hits 10MB limit (gap17 batch 46)."""
import re
import subprocess
import sys
from pathlib import Path

MP3 = Path("/tmp/gap17-work")


def yt_id_from_title(title: str) -> str:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    return m.group(1) if m else ""


def fetch(source_id: str, title: str) -> Path:
    yt = yt_id_from_title(title)
    if not yt:
        raise SystemExit(f"No YouTube id in title: {title}")
    out = MP3 / f"{source_id}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://www.youtube.com/watch?v={yt}"
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        str(out.with_suffix(".%(ext)s")),
        url,
    ]
    subprocess.check_call(cmd)
    if not out.exists():
        for p in out.parent.glob(out.stem + ".*"):
            if p.suffix in {".m4a", ".webm", ".opus"}:
                p.rename(out)
                break
    if not out.exists():
        raise SystemExit("yt-dlp did not produce mp3")
    return out


if __name__ == "__main__":
    fetch(sys.argv[1], sys.argv[2])
    print(MP3 / f"{sys.argv[1]}.mp3")
