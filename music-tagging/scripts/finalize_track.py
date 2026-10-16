#!/usr/bin/env python3
"""Analyze, tag MP3, build CSV row (cover must exist)."""
import base64
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from analyze_audio import analyze
from gap15_utils import (
    COVER_METHOD,
    COVER_MODEL,
    BATCH,
    MANIFEST_HEADER,
    RESULTS_CSV,
    append_csv_row,
    parse_youtube_filename,
)
from write_id3 import write_tags

CATALOG = json.loads(Path("/tmp/gap15-work/track_catalog.json").read_text())


def conf(val, default="High"):
    return default if val else ""


def build_row(track: dict, cat: dict, audio: dict, tagged_id: str, cover_check: str) -> dict:
    p = parse_youtube_filename(track["title"])
    fam = cat.get("family", "")
    sub = cat.get("subgenre", "")
    comm_src = cat.get("sources", "filename")
    comm = f"Genre Universe family: {fam}; subgenre: {sub}. Source: {comm_src}" if fam else ""

    cheap = ""
    br = audio.get("bitrate_kbps", 0)
    if br and br < 96:
        cheap = f"audio bitrate {br} kbps (<96); premium cover kept by request"

    notes = cat.get("notes", "")
    if audio.get("bpm_note"):
        notes = (notes + " " + audio["bpm_note"]).strip()

    tkey = cat.get("TKEY") or audio.get("TKEY", "")
    tkey_conf = cat.get("TKEY_conf") or audio.get("TKEY_conf", "")

    sid = track["id"]
    cover_path = f"/workspace/music-tagging/covers/gap15/{sid}.jpg"

    lr = cat.get("lyrics_reason", "")
    if cat.get("lyrics_selected") == "no" and lr == "instrumental":
        pass
    elif cat.get("lyrics_selected") == "no":
        lr = ""

    return {
        "filename": track["title"],
        "source_drive_id": sid,
        "tagged_drive_id": tagged_id,
        "TIT2": cat["TIT2"],
        "TIT2_conf": "High",
        "TPE1": cat["TPE1"],
        "TPE1_conf": "High",
        "TALB": cat.get("TALB", ""),
        "TALB_conf": "High" if cat.get("TALB") else "",
        "TDRC": cat.get("TDRC", ""),
        "TDRC_conf": "Med" if cat.get("TDRC") else "",
        "TDOR": cat.get("TDOR", ""),
        "TDOR_conf": "Med" if cat.get("TDOR") else "",
        "TCON": cat.get("TCON", ""),
        "TCON_conf": "Med" if cat.get("TCON") else "",
        "TLEN": str(audio["TLEN"]),
        "TLEN_conf": "High",
        "TPE2": cat.get("TPE2", cat["TPE1"]),
        "TPE2_conf": "High",
        "TRCK": cat.get("TRCK", ""),
        "TRCK_conf": cat.get("TRCK_conf", ""),
        "TPOS": "",
        "TPOS_conf": "",
        "TCOM": cat.get("TCOM", ""),
        "TCOM_conf": "Med" if cat.get("TCOM") else "",
        "TBPM": str(audio.get("TBPM", "")),
        "TBPM_conf": audio.get("TBPM_conf", ""),
        "TKEY": tkey,
        "TKEY_conf": tkey_conf,
        "MOOD": cat.get("MOOD", ""),
        "MOOD_conf": "Low" if cat.get("MOOD") else "",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": cat.get("TPUB", ""),
        "TPUB_conf": "Med" if cat.get("TPUB") else "",
        "TSRC": cat.get("TSRC", ""),
        "TSRC_conf": "",
        "COMM": comm,
        "COMM_conf": "High" if comm else "",
        "cover_path": cover_path,
        "cover_method": COVER_METHOD,
        "art_brief": cat.get("art_brief", ""),
        "sources": cat.get("sources", "") + "; librosa",
        "notes": notes,
        "batch": BATCH,
        "has_vocals": cat.get("has_vocals", "unknown"),
        "lyrics_selected": cat.get("lyrics_selected", "no"),
        "lyrics_reason": lr,
        "lyrics_source": cat.get("lyrics_source", "") if cat.get("lyrics_selected") == "yes" else "",
        "cover_text_check": cover_check,
        "cover_model": COVER_MODEL,
        "cheap_reason": cheap,
    }


def main():
    sid, mp3_path, tagged_id, cover_check = sys.argv[1:5]
    lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
    track = None
    for i in range(190, 252):
        t = json.loads(lines[i - 1])
        if t["id"] == sid:
            track = t
            break
    if not track:
        sys.exit("track not in slice")
    cat = CATALOG[sid]
    audio = analyze(mp3_path)
    cover_jpg = f"/workspace/music-tagging/covers/gap15/{sid}.jpg"
    id3 = {
        "TIT2": cat["TIT2"],
        "TPE1": cat["TPE1"],
        "TALB": cat.get("TALB", ""),
        "TDRC": cat.get("TDRC", ""),
        "TCON": cat.get("TCON", ""),
        "TLEN": str(audio["TLEN"]),
        "TPE2": cat.get("TPE2", cat["TPE1"]),
        "TCOM": cat.get("TCOM", ""),
        "TBPM": str(audio.get("TBPM", "")),
        "TKEY": cat.get("TKEY") or audio.get("TKEY", ""),
        "TPUB": cat.get("TPUB", ""),
        "MOOD": cat.get("MOOD", ""),
        "COMM": build_row(track, cat, audio, tagged_id, cover_check)["COMM"],
        "youtube_id": parse_youtube_filename(track["title"])["youtube_id"],
    }
    write_tags(mp3_path, cover_jpg, id3)
    row = build_row(track, cat, audio, tagged_id, cover_check)
    append_csv_row(row)
    b64 = base64.b64encode(Path(mp3_path).read_bytes()).decode()
    Path(f"/tmp/gap15-work/{sid}.upload.b64").write_text(b64)
    print(json.dumps({"ok": True, "TLEN": audio["TLEN"], "bitrate": audio["bitrate_kbps"]}))


if __name__ == "__main__":
    main()
