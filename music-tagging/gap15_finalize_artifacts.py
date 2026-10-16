#!/usr/bin/env python3
"""Finalize tracks when artifact cover exists."""
import subprocess
from pathlib import Path

ART = Path("/opt/cursor/artifacts/assets")
for art in sorted(ART.glob("gap15-*")):
    prefix = art.stem.replace("gap15-", "")
    sid = subprocess.check_output(
        ["python3", "/workspace/music-tagging/gap15_map_artifact.py", prefix], text=True
    ).strip()
    jpg = Path(f"/workspace/music-tagging/covers/gap15/{sid}.jpg")
    if jpg.exists():
        continue
    subprocess.run(
        [
            "python3",
            "/workspace/music-tagging/gap15_batch38_d.py",
            "finalize",
            sid,
            str(art),
            "",
        ],
        check=True,
    )
    print("finalized", sid)
