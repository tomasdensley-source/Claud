#!/usr/bin/env python3
"""Scan agent-tools download JSON blobs; save any matching tracks_297_370 ids."""
import base64
import glob
import json
from pathlib import Path

WORK = Path("/tmp/gap17-work")
TRACKS = {t["id"] for t in json.loads((WORK / "tracks_297_370.json").read_text())}
TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")


def main() -> None:
    saved = 0
    for fp in glob.glob(str(TOOLS / "*.txt")):
        try:
            obj = json.loads(Path(fp).read_text())
        except Exception:
            continue
        fid = obj.get("id")
        if fid not in TRACKS:
            continue
        b64 = obj.get("content") or obj.get("base64Content")
        if not b64:
            continue
        out = WORK / f"{fid}.mp3"
        if out.exists() and out.stat().st_size > 1000:
            continue
        out.write_bytes(base64.b64decode(b64))
        saved += 1
        print("saved", fid, out.stat().st_size)
    have = sum(1 for tid in TRACKS if (WORK / f"{tid}.mp3").exists())
    print(f"have {have}/{len(TRACKS)}")


if __name__ == "__main__":
    main()
