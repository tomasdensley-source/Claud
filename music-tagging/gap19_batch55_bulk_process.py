#!/usr/bin/env python3
"""Process one batch-55 track end-to-end after cover PNG exists in artifacts."""
import json
import subprocess
import sys
from pathlib import Path

ART = Path("/opt/cursor/artifacts/assets")
WORK = Path("/tmp/gap19-work")
FINISH = Path(__file__).with_name("gap19_batch55_finish.py")


def find_cover(sid: str) -> Path | None:
    for ext in (".png", ".jpg", ".webp"):
        p = ART / f"{sid}{ext}"
        if p.exists():
            return p
    return None


def main() -> None:
    sid = sys.argv[1]
    tagged_id = sys.argv[2] if len(sys.argv) > 2 else ""
    cover = find_cover(sid)
    if not cover:
        raise SystemExit(f"no cover art for {sid}")
    mp3 = WORK / f"{sid}.mp3"
    subprocess.check_call(
        ["python3", str(FINISH), sid, str(cover), tagged_id],
    )
    up = json.loads((WORK / f"{sid}.upload.json").read_text())
    print(json.dumps({"source_id": sid, "upload_size": len(up["base64Content"])}))


if __name__ == "__main__":
    main()
