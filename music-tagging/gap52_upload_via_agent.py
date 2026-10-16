#!/usr/bin/env python3
"""Print create_file payload path for agent CallDynamicTool upload (large base64)."""
import json
import sys
from pathlib import Path

WORK = Path("/tmp/gap52-work")


def main() -> None:
    sid = sys.argv[1]
    payload = json.loads((WORK / "upload" / f"{sid}.payload.json").read_text())
    meta = {k: v for k, v in payload.items() if k != "base64Content"}
    meta["b64_len"] = len(payload.get("base64Content", ""))
    print(json.dumps({"payload_json": str(WORK / "upload" / f"{sid}.payload.json"), **meta}))


if __name__ == "__main__":
    main()
