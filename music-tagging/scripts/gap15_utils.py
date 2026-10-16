#!/usr/bin/env python3
"""Shared utilities for gap15 music tagging pipeline."""
import csv
import io
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

MANIFEST_HEADER = Path("/tmp/manifest.csv").read_text().splitlines()[0]
RESULTS_CSV = Path("/tmp/drive-inventory/results-15-17-d.csv")
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
BATCH = "38"
PARENT_TAGGED = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
UA = "PersonalMusicLibraryTagger/1.0 (https://github.com/cursor; contact: local)"


def parse_youtube_filename(title: str) -> dict:
    """Parse 'Uploader - Artist - Title [ytid].mp3' variants."""
    m = re.match(r"^(.+?)\s+\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    if not m:
        return {"filename": title, "youtube_id": "", "raw_title": title}
    body, ytid = m.group(1), m.group(2)
    parts = body.split(" - ", 1)
    if len(parts) == 2:
        uploader, rest = parts[0].strip(), parts[1].strip()
    else:
        uploader, rest = "", body.strip()
    # Often "Artist - Title" or duplicate "Artist - Artist - Title"
    sub = rest.split(" - ")
    if len(sub) >= 2:
        artist = sub[0].strip()
        track_title = " - ".join(sub[1:]).strip()
        track_title = re.sub(
            r"\s*\((Official (Audio|Video|Music Video)|OFFICIAL|Audio|Video)\)\s*",
            "",
            track_title,
            flags=re.I,
        )
        track_title = re.sub(r"\s*Official Audio\s*$", "", track_title, flags=re.I)
        track_title = re.sub(r"\s*｜.*$", "", track_title)
        track_title = re.sub(r"\s*\[Lyrics.*\]\s*", "", track_title, flags=re.I)
    else:
        artist = uploader or rest
        track_title = rest
    return {
        "filename": title,
        "youtube_id": ytid,
        "uploader": uploader,
        "artist_guess": artist,
        "title_guess": track_title,
    }


def mb_search(query: str, limit: int = 5) -> list:
    url = (
        "https://musicbrainz.org/ws/2/recording/?"
        + urllib.parse.urlencode({"fmt": "json", "query": query, "limit": str(limit)})
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        return data.get("recordings", [])
    except Exception as e:
        return [{"error": str(e)}]


def load_slice(start_line=190, end_line=251):
    lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(start_line, end_line + 1)]


def done_ids() -> set:
    if not RESULTS_CSV.exists() or RESULTS_CSV.stat().st_size <= len(MANIFEST_HEADER) + 2:
        return set()
    ids = set()
    with RESULTS_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ids.add(row.get("source_drive_id", ""))
    return ids


def append_csv_row(row: dict):
    fieldnames = MANIFEST_HEADER.split(",")
    exists = RESULTS_CSV.exists() and RESULTS_CSV.stat().st_size > 0
    with RESULTS_CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        if not exists:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in fieldnames})


def cover_prompt(artist: str, title: str, album: str, art_brief: str) -> str:
    album_clause = f'\n- Smaller italic serif album title directly beneath: "{album}".' if album else ""
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve matching the Benny Goodman reference style). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{artist}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{title}".{album_clause}

Scene (full bleed, no text in the middle): {art_brief}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere, no celebrity faces."""
