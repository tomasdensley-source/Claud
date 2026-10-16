#!/usr/bin/env python3
"""Harvest MCP download_file_content JSON from agent-tools into gap19-work/mp3."""
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap19-work/mp3")


def try_save(obj: dict) -> bool:
    if obj.get("mimeType") != "audio/mpeg":
        return False
    fid = obj.get("id")
    content = obj.get("content") or obj.get("base64Content")
    if not fid or not content:
        return False
    dest = OUT / f"{fid}.mp3"
    if dest.exists() and dest.stat().st_size > 1000:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(base64.b64decode(content))
    print("saved", fid, dest.stat().st_size)
    return True


def main():
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            if '"mimeType"' not in text and "audio/mpeg" not in text:
                continue
            obj = json.loads(text)
            if try_save(obj):
                n += 1
        except Exception:
            continue
    print("new", n)


if __name__ == "__main__":
    main()
