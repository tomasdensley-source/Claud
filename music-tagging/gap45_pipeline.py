#!/usr/bin/env python3
"""Gap batch 45 (gap-17-19.jsonl lines 445-518): analyze, tag, CSV."""
from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Optional

# Reuse core logic from gap15
sys.path.insert(0, str(Path(__file__).parent))
from gap15_pipeline import (  # noqa: E402
    KEYS,
    COVER_METHOD,
    COVER_MODEL,
    analyze_audio,
    apply_tags,
    musicbrainz_lookup,
    parse_filename,
    resize_cover,
)

WORK = Path("/tmp/gap45-work")
COVERS = Path("/workspace/music-tagging/covers/gap17")
RESULTS = Path("/tmp/drive-inventory/results-17-19-g.csv")
SLICE = Path("/tmp/gap-batch-45.jsonl")
BATCH = "45"
UA = "PersonalMusicLibraryTagger/1.0 (personal library; batch 45)"

FAMOUS_LYRICS_EXTRA = {
    "wildwood flower": ("Appalachian folk standard", "https://lrclib.net/api/search?q=Wildwood+Flower+Carter+Family"),
    "love me or leave me": ("1920s Broadway standard", "https://lrclib.net/api/search?q=Love+Me+or+Leave+Me"),
    "west end blues": ("jazz landmark recording", "https://lrclib.net/api/search?q=West+End+Blues+Louis+Armstrong"),
    "blue yodel": ("country yodel standard", "https://lrclib.net/api/search?q=Blue+Yodel+Jimmie+Rodgers"),
    "keep on the sunny side": ("gospel-tinged country standard", "https://lrclib.net/api/search?q=Keep+On+the+Sunny+Side"),
    "see see rider": ("blues standard", "https://lrclib.net/api/search?q=See+See+Rider"),
    "rhapsody in blue": ("American classical-jazz standard", "https://lrclib.net/api/search?q=Rhapsody+in+Blue+Gershwin"),
    "island in the sun": ("Weezer hit", "https://lrclib.net/api/search?q=Island+in+the+Sun+Weezer"),
    "kill bill": ("SZA hit", "https://lrclib.net/api/search?q=Kill+Bill+SZA"),
    "nightcall": ("Drive soundtrack hit", "https://lrclib.net/api/search?q=Nightcall+Kavinsky"),
    "flamingo": ("Kero Kero Bonito signature", "https://lrclib.net/api/search?q=Flamingo+Kero+Kero+Bonito"),
    "buttercup": ("Jack Stauber viral hit", "https://lrclib.net/api/search?q=Buttercup+Jack+Stauber"),
    "ruler of everything": ("Tally Hall cult favorite", "https://lrclib.net/api/search?q=Ruler+of+Everything+Tally+Hall"),
    "hidden in the sand": ("Tally Hall fan favorite", "https://lrclib.net/api/search?q=Hidden+in+the+Sand+Tally+Hall"),
    "kerosene": ("Crystal Castles track", "https://lrclib.net/api/search?q=Kerosene+Crystal+Castles"),
    "leni": ("Crystal Castles track", "https://lrclib.net/api/search?q=Leni+Crystal+Castles"),
    "deep swim": ("Windows 96 vaporwave staple", "https://lrclib.net/api/search?q=Deep+Swim+Windows+96"),
}


def guess_genre_vintage(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    vintage = [
        "weems", "lucas", "vallee", "etting", "carter family", "kane", "whiteman",
        "rodgers", "armstrong", "jones", "dalhart", "rainey", "marvin", "pettis",
        "bernie", "lopez", "lewis", "hall", "woods", "edwards", "waring",
    ]
    if any(v in t for v in vintage) or "192" in title or "193" in title:
        if "blues" in t or "rainey" in t:
            return "Classic blues / Blues", "Blues", "Classic blues"
        if "country" in t or "yodel" in t or "carter" in t or "rodgers" in t or "dalhart" in t:
            return "Country / Folk", "Folk", "Country"
        if "armstrong" in t or "jazz" in t or "blues" in t:
            return "Early jazz / Jazz", "Jazz", "Early jazz"
        return "Jazz age pop / Jazz", "Jazz", "Jazz age pop"
    if "gershwin" in t or "rhapsody in blue" in t:
        return "Symphonic jazz / Western art music", "Western art music", "Symphonic jazz"
    if any(x in t for x in ["ray charles", "alabamy"]):
        return "R&B / Soul", "Soul", "R&B"
    if any(x in t for x in ["weezer", "sza", "tally hall", "superorganism", "kavinsky", "kero kero"]):
        return "Indie pop / Pop", "Pop", "Indie pop"
    if any(x in t for x in ["crystal castles", "molchat", "windows 96", "voyage", "instupendo", "pilotred", "oliver buckland", "vaporwave", "weirdcore", "dreamcore", "sitcom", "temporex", "miracle musical", "ocular", "stegosaurus", "caretaker", "mild high club", "home alone.", "rectangle", "hisohkah", "xori", "pastel sataniko", "lisuga", "jack stauber"]):
        return "Vaporwave / Electronic", "Electronic", "Vaporwave"
    if "mingus" in t or "charles mingus" in t:
        return "Post-bop / Jazz", "Jazz", "Post-bop"
    if "toby fox" in t:
        return "Video game score / Electronic", "Electronic", "Video game score"
    if "nic raine" in t or "rebellious bird" in t:
        return "Film score / Western art music", "Western art music", "Film score"
    return "Pop / Pop", "Pop", "Pop"


def art_brief_vintage(artist: str, title: str, album: str, tcon: str) -> str:
    sub = tcon.split(" / ")[0] if " / " in tcon else tcon
    if "Vaporwave" in sub or "Electronic" in sub and "game" not in sub.lower():
        return f"Retro-futurist painted sunset: palm silhouettes, magenta-cyan gradient sky, soft VHS grain haze (album: {album or 'Single'}; artist nod: synth glow)."
    if "Jazz" in sub or "Blues" in sub:
        return f"Art-deco club interior painted in gouache: brass saxophone bell, amber spotlight on empty dance floor (album: {album or 'Single'}; artist nod: piano keys at edge)."
    if "Country" in sub or "Folk" in sub:
        return f"Rustic painted porch at golden hour, wildflowers in mason jar, worn acoustic guitar leaning on railing (album: {album or 'Single'}; artist nod: Appalachian hills)."
    if "Western art" in sub or "Symphonic" in sub:
        return f"Concert hall still life: open score on velvet drape, city skyline through arched window at dusk (album: {album or 'Single'}; artist nod: clarinet silhouette)."
    if "Soul" in sub or "R&B" in sub:
        return f"Warm painted night street with neon diner glow and empty booth, vinyl record on table (album: {album or 'Single'}; artist nod: piano bar light)."
    if "Pop" in sub or "Indie" in sub:
        return f"Contemporary painted coastal scene: soft sun flare over calm water, minimal horizon (album: {album or 'Single'}; artist nod: electric guitar case)."
    return f"Premium painted abstract warm scene suggesting {title[:50]} (album: {album or 'Single'}; artist nod: music)." 


def lyrics_policy_extra(title: str, has_vocals: str) -> tuple[str, str, str]:
    if has_vocals == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (reason, url) in FAMOUS_LYRICS_EXTRA.items():
        if k in tl:
            return "yes", reason, url
    return "no", "", ""


def has_vocals_guess_vintage(title: str, tcon: str, artist: str) -> str:
    tl = title.lower()
    if "rhapsody in blue" in tl or "full album" in tl.lower():
        return "no"
    if "mingus ah um" in tl.lower() and "full album" in tl.lower():
        return "no"
    if "instrumental" in tl:
        return "no"
    if any(x in tl for x in ["blues", "yodel", "love me", "wildwood", "prisoner", "rider"]):
        return "yes"
    if "Vaporwave" in tcon or "Electronic" in tcon:
        if any(x in tl for x in ["deep swim", "microchip", "icosa", "anemoia", "backroom", "hourglass", "vacillate", "pinkover", "school rooftop", "six forty", "burning memory"]):
            return "unknown"
    return "yes"


def build_row_gap45(
    filename: str,
    source_id: str,
    tagged_id: str,
    parsed: dict,
    audio: dict,
    mb: dict,
    overrides: Optional[dict] = None,
) -> dict[str, str]:
    o = overrides or {}
    artist = o.get("TPE1") or parsed["artist_hint"]
    title = o.get("TIT2") or parsed["title_hint"]
    if mb.get("best") and not o.get("TIT2") and mb.get("title"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or ""
    tdrc = o.get("TDRC") or mb.get("date") or ""
    tcom = o.get("TCOM") or ""
    tpub = o.get("TPUB") or ""
    tdor = o.get("TDOR") or ""
    tcon, family, sub = guess_genre_vintage(artist, title)
    if o.get("TCON"):
        tcon = o["TCON"]
        if " / " in tcon:
            sub, family = tcon.split(" / ", 1)
    comm = f"Genre Universe family: {family}; subgenre: {sub}."
    if o.get("COMM_extra"):
        comm += " " + o["COMM_extra"]
    has_v = o.get("has_vocals") or has_vocals_guess_vintage(title, tcon, artist)
    ly_sel, ly_reas, ly_src = lyrics_policy_extra(title, has_v)
    if o.get("lyrics_selected"):
        ly_sel = o["lyrics_selected"]
        ly_reas = o.get("lyrics_reason", ly_reas)
        ly_src = o.get("lyrics_source", ly_src)
    mood = o.get("MOOD") or "nostalgic; warm; gentle"
    art = o.get("art_brief") or art_brief_vintage(artist, title, album or "Single", tcon)
    cover_path = str(COVERS / f"{source_id}.jpg")
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    notes = o.get("notes") or ""
    if not mb.get("best") and not mb.get("recordings"):
        notes = (notes + " MusicBrainz: no confident match; metadata from filename and audio.").strip()
    elif not mb.get("best"):
        notes = (notes + " MusicBrainz: weak match; filename preferred where conflict.").strip()
    if audio.get("bpm_note") and audio["bpm_note"] not in notes:
        notes = (notes + " " + audio["bpm_note"]).strip()
    if mb.get("error"):
        notes = (notes + f" MusicBrainz lookup error: {mb['error']}.").strip()
    sources = o.get("sources") or "filename parse; MusicBrainz; librosa"
    yt = parsed.get("youtube_id") or ""
    conf = lambda v, c="Med": c if v else ""

    display_artist = artist
    if len(display_artist) > 48:
        display_artist = display_artist.split(";")[0].split(",")[0].strip()

    return {
        "filename": filename,
        "source_drive_id": source_id,
        "tagged_drive_id": tagged_id,
        "TIT2": title,
        "TIT2_conf": o.get("TIT2_conf", "Med" if title else ""),
        "TPE1": artist,
        "TPE1_conf": o.get("TPE1_conf", "Med" if artist else ""),
        "TALB": album,
        "TALB_conf": conf(album, o.get("TALB_conf", "Med")),
        "TDRC": tdrc,
        "TDRC_conf": conf(tdrc, o.get("TDRC_conf", "Med")),
        "TDOR": tdor,
        "TDOR_conf": conf(tdor, o.get("TDOR_conf", "")),
        "TCON": tcon,
        "TCON_conf": "Med",
        "TLEN": str(audio["duration_ms"]),
        "TLEN_conf": "High",
        "TPE2": o.get("TPE2") or display_artist.split(" feat")[0].strip(),
        "TPE2_conf": "Med",
        "TRCK": o.get("TRCK", ""),
        "TRCK_conf": o.get("TRCK_conf", ""),
        "TPOS": o.get("TPOS", ""),
        "TPOS_conf": o.get("TPOS_conf", ""),
        "TCOM": tcom,
        "TCOM_conf": conf(tcom, "High" if tcom else ""),
        "TBPM": str(audio["bpm"]) if audio.get("bpm") else "",
        "TBPM_conf": audio.get("bpm_conf", "Med"),
        "TKEY": o.get("TKEY", audio.get("tkey", "")),
        "TKEY_conf": o.get("TKEY_conf", audio.get("tkey_conf", "")),
        "MOOD": mood,
        "MOOD_conf": "Low",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": tpub,
        "TPUB_conf": conf(tpub, "Med"),
        "TSRC": o.get("TSRC", ""),
        "TSRC_conf": o.get("TSRC_conf", ""),
        "COMM": comm,
        "COMM_conf": "Med",
        "cover_path": cover_path,
        "cover_method": COVER_METHOD,
        "art_brief": art,
        "sources": sources,
        "notes": notes,
        "batch": BATCH,
        "has_vocals": has_v,
        "lyrics_selected": ly_sel,
        "lyrics_reason": ly_reas,
        "lyrics_source": ly_src,
        "cover_text_check": o.get("cover_text_check", ""),
        "cover_model": COVER_MODEL,
        "cheap_reason": cheap,
        "_youtube_id": yt,
        "_cover_artist": display_artist,
        "_cover_title": title,
        "_cover_album": album or "Single",
    }


def cover_prompt_from_row(row: dict) -> str:
    artist = row.get("_cover_artist") or row["TPE1"]
    title = row.get("_cover_title") or row["TIT2"]
    album = row.get("_cover_album") or row["TALB"] or "Single"
    art = row["art_brief"]
    album_clause = f'\n- Smaller italic serif album title directly beneath: "{album}".' if album else ""
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{artist}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{title}".{album_clause}

Scene (full bleed, no text in the middle): {art}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere, no celebrity faces."""


def cmd_analyze(source_id: str, mp3: Path, drive_title: str) -> dict:
    parsed = parse_filename(drive_title)
    parsed["filename"] = drive_title
    audio = analyze_audio(mp3)
    mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
    row = build_row_gap45(drive_title, source_id, "", parsed, audio, mb)
    meta_path = WORK / f"{source_id}.json"
    meta_path.write_text(json.dumps(row, indent=2))
    return row


def cmd_finalize(source_id: str, mp3: Path, cover_src: Path, tagged_id: str = "", text_check: str = "ok (verified by eye)") -> dict:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = text_check
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_src, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, cover_jpg, out)
    append_csv(meta)
    return meta


def append_csv(row: dict) -> None:
    header_line = Path("/tmp/manifest.csv").read_text().splitlines()[0]
    fieldnames = next(csv.reader([header_line]))
    exists = RESULTS.exists() and RESULTS.stat().st_size > 0
    out_row = {k: row.get(k, "") for k in fieldnames}
    with RESULTS.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        if not exists:
            w.writeheader()
        w.writerow(out_row)


def load_done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with RESULTS.open(newline="", encoding="utf-8") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def load_slice() -> list[dict]:
    return [json.loads(l) for l in SLICE.read_text().splitlines() if l.strip()]


def init_results_header() -> None:
    if not RESULTS.exists():
        header = Path("/tmp/manifest.csv").read_text().splitlines()[0]
        RESULTS.write_text(header + "\n", encoding="utf-8")


if __name__ == "__main__":
    init_results_header()
    if sys.argv[1] == "list-pending":
        done = load_done_ids()
        for item in load_slice():
            if item["id"] not in done:
                print(item["id"], item["title"][:70])
    elif sys.argv[1] == "analyze":
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
    elif sys.argv[1] == "prompt":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        print(cover_prompt_from_row(meta))
    elif sys.argv[1] == "finalize":
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else "", sys.argv[6] if len(sys.argv) > 6 else "ok (verified by eye)")
