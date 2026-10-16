#!/usr/bin/env python3
"""Download Drive files by ID via public export URL (personal library access)."""
import sys
import urllib.request
from pathlib import Path

OUT = Path("/tmp/gap15-work")


def download(file_id: str) -> Path:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    out = OUT / f"{file_id}.mp3"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    # virus scan warning page for large files
    if b"<!DOCTYPE html" in data[:200] or b"confirm=" in data[:5000]:
        import re

        m = re.search(rb"confirm=([0-9A-Za-z_]+)", data)
        if m:
            confirm = m.group(1).decode()
            url2 = f"https://drive.google.com/uc?export=download&confirm={confirm}&id={file_id}"
            with urllib.request.urlopen(urllib.request.Request(url2, headers={"User-Agent": "Mozilla/5.0"}), timeout=300) as resp2:
                data = resp2.read()
    out.write_bytes(data)
    return out


if __name__ == "__main__":
    for fid in sys.argv[1:]:
        p = download(fid)
        print(p, p.stat().st_size)
