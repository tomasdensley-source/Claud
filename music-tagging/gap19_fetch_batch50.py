#!/usr/bin/env python3
"""Download batch 50 MP3s via gdown (public/shared Drive)."""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

TRACKS = Path("/tmp/gap19-work/tracks_batch50.jsonl")
OUT = Path("/tmp/gap19-work/mp3")
GDOWN = "/home/ubuntu/.local/bin/gdown"


def download_one(t: dict) -> tuple[str, str]:
    fid = t["id"]
    out = OUT / f"{fid}.mp3"
    if out.exists() and out.stat().st_size > 5000:
        return fid, "skip"
    r = subprocess.run(
        [GDOWN, fid, "-O", str(out)],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if r.returncode != 0 or not out.exists():
        return fid, f"fail: {r.stderr[:200]}"
    return fid, f"ok {out.stat().st_size}"


def main() -> None:
    tracks = [json.loads(l) for l in TRACKS.read_text().splitlines() if l.strip()]
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    OUT.mkdir(parents=True, exist_ok=True)
    ok = skip = fail = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(download_one, t): t for t in tracks}
        for fut in as_completed(futs):
            fid, status = fut.result()
            if status.startswith("skip"):
                skip += 1
            elif status.startswith("ok"):
                ok += 1
            else:
                fail += 1
                print(fid, status, file=sys.stderr)
    print(json.dumps({"ok": ok, "skip": skip, "fail": fail, "total": len(tracks)}))


if __name__ == "__main__":
    main()
