#!/usr/bin/env python3
import base64
import json
from pathlib import Path

TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")
OUT = Path("/tmp/gap19-work/mp3")
IDS = {
    json.loads(l)["id"]
    for l in Path("/tmp/batch54-tracks.jsonl").read_text().strip().split("\n")
}


def main():
    n = 0
    for p in TOOLS.glob("*.txt"):
        try:
            if p.stat().st_size < 200_000:
                continue
            obj = json.loads(p.read_text())
            fid = obj.get("id")
            if fid not in IDS or obj.get("mimeType") != "audio/mpeg":
                continue
            content = obj.get("content")
            if not content:
                continue
            dest = OUT / f"{fid}.mp3"
            if dest.exists() and dest.stat().st_size > 50_000:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(base64.b64decode(content))
            print("saved", fid, dest.stat().st_size)
            n += 1
        except Exception:
            continue
    print("new", n)


if __name__ == "__main__":
    main()
