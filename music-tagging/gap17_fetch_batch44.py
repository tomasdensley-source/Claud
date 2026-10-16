#!/usr/bin/env python3
"""Download batch 44 slice (gap-17-19.jsonl lines 371-444) via gdown."""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-17-19.jsonl")
OUT = Path("/tmp/gap17-work")
GDOWN = "/home/ubuntu/.local/bin/gdown"
SLICE = (371, 444)


def load_tracks() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    a, b = SLICE
    return [json.loads(lines[i - 1]) for i in range(a, b + 1)]


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
        return fid, f"fail: {(r.stderr or r.stdout)[:180]}"
    return fid, f"ok {out.stat().st_size}"


def main() -> None:
    tracks = load_tracks()
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 10
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
                print(fid, status)
            else:
                fail += 1
                print(fid, status)
    print(f"done ok={ok} skip={skip} fail={fail} total={len(tracks)}")


if __name__ == "__main__":
    main()
