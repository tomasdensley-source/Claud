#!/usr/bin/env python3
"""After covers exist in assets/, prep/upload/append for batch-37 slice."""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gap15_pipeline import load_done_ids, cmd_append

WORK = Path("/tmp/gap15-work")
ASSETS = Path("/opt/cursor/artifacts/assets")
UPLOAD = Path(__file__).parent / "gap15_upload_http.py"
FINISH = Path(__file__).parent / "gap15_finish_one.py"
LINES = range(127, 190)


def main():
    lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
    ids = [json.loads(lines[i - 1])["id"] for i in LINES]
    done = load_done_ids()
    ok = fail = skip = 0
    for sid in ids:
        if sid in done:
            skip += 1
            continue
        if not any((ASSETS / f"{sid}{e}").exists() for e in (".jpg", ".jpeg", ".png")):
            continue
        mp3 = WORK / f"{sid}.mp3"
        if not mp3.exists():
            fail += 1
            continue
        r = subprocess.run([sys.executable, str(FINISH), "prep", sid], capture_output=True, text=True)
        if r.returncode:
            print("prep fail", sid, r.stderr.strip())
            fail += 1
            continue
        u = subprocess.run([sys.executable, str(UPLOAD), sid], capture_output=True, text=True)
        if u.returncode:
            print("upload skip (large or error)", sid, u.stderr.strip() or u.stdout.strip())
            fail += 1
            continue
        tagged_id = u.stdout.strip()
        cmd_append(sid, tagged_id)
        ok += 1
        print("OK", sid, tagged_id)
    print("summary ok", ok, "fail", fail, "skip", skip, "done_total", len(load_done_ids()))


if __name__ == "__main__":
    main()
