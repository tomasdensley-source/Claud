#!/usr/bin/env python3
"""Harvest MCP download dumps into /tmp/gap17-work/{id}.mp3"""
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap17-work")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for p in sorted(TOOLS.glob("*.txt"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            if '"mimeType"' not in text or "audio/mpeg" not in text:
                continue
            obj = json.loads(text)
            if obj.get("mimeType") != "audio/mpeg":
                continue
            fid = obj.get("id")
            content = obj.get("content")
            if not fid or not content:
                continue
            dest = OUT / f"{fid}.mp3"
            if dest.exists() and dest.stat().st_size > 1000:
                continue
            dest.write_bytes(base64.b64decode(content))
            print("harvested", fid, dest.stat().st_size)
            n += 1
        except Exception:
            continue
    print("total new", n)


if __name__ == "__main__":
    main()
