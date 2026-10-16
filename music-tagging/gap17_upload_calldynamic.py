#!/usr/bin/env python3
"""Print create_file arguments JSON (for CallDynamicTool) from gap17-work upload sidecar."""
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap17-work")


def main() -> None:
    sid = sys.argv[1]
    p = WORK / f"{sid}.upload.json"
    if not p.exists():
        raise SystemExit(f"missing {p}; run gap17_upload.py first")
    print(p.read_text())


if __name__ == "__main__":
    main()
