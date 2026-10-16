#!/usr/bin/env python3
"""Print create_file payload JSON path for agent CallDynamicTool (large files on disk)."""
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap19-work")


def main() -> None:
    sid = sys.argv[1]
    prep = WORK / f"{sid}.upload.json"
    if not prep.exists():
        import subprocess

        subprocess.check_call(
            ["python3", "/workspace/music-tagging/gap19_batch58_l.py", "upload-prep", sid]
        )
    meta = json.loads(prep.read_text())
    print(
        json.dumps(
            {
                "sid": sid,
                "title": meta["title"],
                "b64_len": len(meta.get("base64Content", "")),
                "upload_json": str(prep),
            }
        )
    )


if __name__ == "__main__":
    main()
