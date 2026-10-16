#!/usr/bin/env python3
"""Harvest MCP download JSON from agent-tools into /tmp/gap19-work/mp3/."""
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
MP3 = Path("/tmp/gap19-work/mp3")


def main() -> None:
    MP3.mkdir(parents=True, exist_ok=True)
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            if '"content"' not in text and '"base64Content"' not in text:
                continue
            obj = json.loads(text)
            if obj.get("mimeType") not in (None, "audio/mpeg") and "audio" not in str(obj.get("mimeType", "")):
                continue
            fid = obj.get("id")
            content = obj.get("content") or obj.get("base64Content")
            if not fid or not content:
                continue
            dest = MP3 / f"{fid}.mp3"
            if dest.exists() and dest.stat().st_size > 50000:
                continue
            dest.write_bytes(base64.b64decode(content))
            print("harvested", fid, dest.stat().st_size)
            n += 1
        except Exception:
            continue
    print("new", n)


if __name__ == "__main__":
    main()
