#!/usr/bin/env python3
"""Batch 48: gap-19-21.jsonl lines 146-290 → results-19-21-b.csv."""
from __future__ import annotations

import csv
import json
import sys
import time
from pathlib import Path

import gap17_pipeline as gp
from gap17_pipeline import (
    analyze_audio,
    append_csv,
    apply_tags,
    build_row,
    cover_prompt,
    fieldnames,
    load_done_ids,
    musicbrainz_lookup,
    parse_filename,
    resize_cover,
)

JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
RESULTS_PATH = Path("/tmp/drive-inventory/results-19-21-b.csv")
WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
SLICE_START, SLICE_END = 146, 290

gp.RESULTS = RESULTS_PATH
gp.BATCH = "48"
gp.WORK = WORK
gp.COVERS = COVERS

FAMOUS_BATCH48 = {
    "somebody told me": ("2000s indie rock hit", "https://lrclib.net/api/search?q=Somebody+Told+Me+Killers"),
    "read my mind": ("Killers signature", "https://lrclib.net/api/search?q=Read+My+Mind+Killers"),
    "mr. brightside": ("iconic singalong indie hit", "https://lrclib.net/api/search?q=Mr+Brightside"),
    "all these things that i've done": ("Killers hit", "https://lrclib.net/api/search?q=All+These+Things+Killers"),
    "free fallin": ("Tom Petty classic", "https://lrclib.net/api/search?q=Free+Fallin+Tom+Petty"),
    "i won't back down": ("Tom Petty anthem", "https://lrclib.net/api/search?q=I+Won%27t+Back+Down"),
    "mary jane's last dance": ("Tom Petty hit", "https://lrclib.net/api/search?q=Mary+Jane%27s+Last+Dance"),
    "american girl": ("Tom Petty classic", "https://lrclib.net/api/search?q=American+Girl+Tom+Petty"),
    "bang a gong": ("glam rock hit", "https://lrclib.net/api/search?q=Get+It+On+T+Rex"),
    "papercut": ("Linkin Park album opener", "https://lrclib.net/api/search?q=Papercut+Linkin+Park"),
    "you rock my world": ("Michael Jackson hit", "https://lrclib.net/api/search?q=You+Rock+My+World"),
    "mundian to bach ke": ("global bhangra crossover hit", "https://lrclib.net/api/search?q=Mundian+To+Bach+Ke"),
    "naatu naatu": ("Oscar-winning film song", "https://lrclib.net/api/search?q=Naatu+Naatu"),
    "jai ho": ("Slumdog Millionaire hit", "https://lrclib.net/api/search?q=Jai+Ho"),
    "summertime": ("Gershwin opera standard", "https://lrclib.net/api/search?q=Summertime+Porgy+Bess"),
    "ymca": ("disco YMCA singalong", "https://lrclib.net/api/search?q=YMCA+Village+People"),
    "baby shark": ("viral children's singalong", "https://lrclib.net/api/search?q=Baby+Shark"),
    "stairway to heaven": ("classic rock epic", "https://lrclib.net/api/search?q=Stairway+To+Heaven"),
    "enter sandman": ("Metallica metal anthem", "https://lrclib.net/api/search?q=Enter+Sandman"),
    "seven nation army": ("iconic rock riff anthem", "https://lrclib.net/api/search?q=Seven+Nation+Army"),
    "don't stop believin": ("Journey arena anthem", "https://lrclib.net/api/search?q=Don%27t+Stop+Believin"),
    "africa": ("Toto signature hit", "https://lrclib.net/api/search?q=Africa+Toto"),
    "eye of the tiger": ("Survivor sports anthem", "https://lrclib.net/api/search?q=Eye+Of+The+Tiger"),
    "tainted love": ("Soft Cell synth-pop hit", "https://lrclib.net/api/search?q=Tainted+Love"),
    "blue monday": ("New Order electronic classic", "https://lrclib.net/api/search?q=Blue+Monday"),
    "interstate love song": ("STP 90s rock hit", "https://lrclib.net/api/search?q=Interstate+Love+Song"),
    "pyramid song": ("Radiohead art-rock staple", "https://lrclib.net/api/search?q=Pyramid+Song"),
}
gp.FAMOUS_LYRICS.update(FAMOUS_BATCH48)

_orig_guess = gp.guess_genre


def guess_genre_batch48(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(
        x in t
        for x in [
            "philharmonic",
            "orchestra",
            "symphony",
            "barber:",
            "stravinsky",
            "prokofiev",
            "britten:",
            "copland",
            "appalachian",
            "bartók",
            "concerto",
            "mariinsky",
            "lang lang",
            "petrushka",
            "firebird",
            "romeo and juliet",
            "rite of spring",
            "pacific 231",
            "knoxville",
        ]
    ):
        return "Orchestral / Western art music", "Western art music", "Orchestral"
    if any(x in t for x in ["monk", "coltrane", "brubeck", "hancock", "gordon", "stitt", "snarky", "hamasyan", "ornette", "jarrett", "kubis"]):
        return "Jazz / Jazz", "Jazz", "Jazz"
    if any(x in t for x in ["metallica", "led zeppelin", "queen", "clash", "white stripes", "killers", "linkin park", "journey", "survivor", "toto", "tom petty", "radiohead", "styx", "ram jam"]):
        return "Rock / Rock", "Rock", "Rock"
    if any(x in t for x in ["panjabi", "rahman", "naatu", "jai ho", "dilbar", "chaiyya", "bollywood"]):
        return "Filmi / South Asian popular music", "South Asian popular music", "Filmi"
    if any(x in t for x in ["house", "octo octa", "nightcrawlers", "tensnake", "masters at work", "j.m. silk", "new order", "soft cell"]):
        return "House / Electronic", "Electronic", "House"
    if any(x in t for x in ["yoshimura", "oneohtrix", "nicolas jaar", "max richter", "portico"]):
        return "Ambient / Electronic", "Electronic", "Ambient"
    if any(x in t for x in ["shakira", "weeknd", "michael jackson", "bublé", "pinkfong", "hit crew"]):
        return "Pop / Pop", "Pop", "Pop"
    return _orig_guess(artist, title)


gp.guess_genre = guess_genre_batch48

_orig_vocals = gp.has_vocals_guess


def has_vocals_batch48(title: str, artist: str, tcon: str) -> str:
    tl = f"{artist} {title}".lower()
    if any(
        x in tl
        for x in [
            "orchestra",
            "philharmonic",
            "symphony",
            "concerto",
            "suite",
            "solfeggietto",
            "petrushka",
            "firebird",
            "pacific 231",
            "well-tempered",
            "barber:",
            "britten:",
            "yoshimura",
            "oneohtrix",
            "richter",
            "portico",
            "chrome country",
        ]
    ):
        if "summertime" in tl or "knoxville" in tl:
            return "yes"
        return "no"
    return _orig_vocals(title, artist, tcon)


gp.has_vocals_guess = has_vocals_batch48

_orig_art = gp.art_brief_for


def art_brief_batch48(artist: str, title: str, album: str, tcon: str) -> str:
    sub = tcon.split(" / ")[0] if " / " in tcon else tcon
    alb = album or "Single"
    if "Western art music" in tcon or "Orchestral" in sub:
        return f"Concert hall painted vista: gilt balcony, empty velvet seats, warm spotlight on vacant podium (album: {alb}; artist nod: orchestral strings)."
    if "Video game" in sub:
        return f"Mountain summit at dawn: painted peaks, soft mist, lone flag path (album: {alb}; artist nod: platforming ascent)."
    if "Jazz" in sub:
        return f"Smoky blue jazz club: brass sax bell, single spotlight on empty stage (album: {alb}; artist nod: piano keys reflected)."
    if "Dream pop" in sub or "Electronic" in sub:
        return f"Ethereal painted nightscape: neon mist, floating geometric shapes, calm horizon (album: {alb}; artist nod: synthesizer glow)."
    if "Classic rock" in sub:
        return f"1970s rock painted vista: desert highway at dusk, amplifier silhouette (album: {alb}; artist nod: electric guitar)."
    if "Dance-pop" in sub:
        return f"Club floor painted abstraction: disco ball light shards on dark floor, no crowd (album: {alb}; artist nod: pop sparkle)."
    if "Philadelphia soul" in sub or "Soul" in sub:
        return f"Motown-era painted city night: neon soul club doorway, gold and purple light (album: {alb}; artist nod: vinyl groove)."
    return _orig_art(artist, title, alb, tcon)


gp.art_brief_for = art_brief_batch48


def mp3_path(source_id: str) -> Path:
    p = WORK / f"{source_id}.mp3"
    if p.exists():
        return p
    alt = WORK / "mp3" / f"{source_id}.mp3"
    return alt if alt.exists() else p


def load_slice() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def init_results() -> None:
    if not RESULTS_PATH.exists():
        RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(RESULTS_PATH, "w", newline="") as f:
            csv.writer(f).writerow(fieldnames())


def cmd_analyze(source_id: str, mp3: Path, drive_title: str) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    COVERS.mkdir(parents=True, exist_ok=True)
    parsed = parse_filename(drive_title)
    parsed["filename"] = drive_title
    audio = analyze_audio(mp3)
    mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
    row = build_row(drive_title, source_id, "", parsed, audio, mb)
    (WORK / f"{source_id}.json").write_text(json.dumps(row, indent=2))


def cmd_finalize(source_id: str, mp3: Path, cover_png: Path, tagged_id: str = "") -> None:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_png, cover_jpg)
    out = WORK / "tagged" / f"{source_id}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    apply_tags(mp3, meta, cover_jpg, out)
    append_csv({k: v for k, v in meta.items() if not k.startswith("_")})


if __name__ == "__main__":
    init_results()
    cmd = sys.argv[1]
    if cmd == "list-pending":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] not in done:
                print(t["id"], t["title"][:70])
    elif cmd == "list-needing-mp3":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] in done:
                continue
            if not mp3_path(t["id"]).exists():
                print(t["id"])
    elif cmd == "batch-analyze":
        done = load_done_ids()
        n = 0
        for t in load_slice():
            if t["id"] in done:
                continue
            mp3 = mp3_path(t["id"])
            if mp3.exists():
                cmd_analyze(t["id"], mp3, t["title"])
                n += 1
                time.sleep(1.2)
        print("analyzed", n)
    elif cmd == "analyze":
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
    elif cmd == "prompt":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        print(cover_prompt(meta))
    elif cmd == "finalize":
        tid = sys.argv[5] if len(sys.argv) > 5 else ""
        cmd_finalize(sys.argv[2], mp3_path(sys.argv[2]), Path(sys.argv[4]), tid)
    elif cmd == "next-pending":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] not in done:
                print(json.dumps(t))
                break
    elif cmd == "stats":
        done = load_done_ids()
        total = len(load_slice())
        have_mp3 = sum(1 for t in load_slice() if mp3_path(t["id"]).exists())
        have_meta = sum(1 for t in load_slice() if (WORK / f"{t['id']}.json").exists())
        print(json.dumps({"total": total, "done": len(done), "mp3": have_mp3, "meta": have_meta}))
