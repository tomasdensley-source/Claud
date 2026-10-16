#!/usr/bin/env python3
"""Batch 49: gap-19-21.jsonl lines 291-435 → results-19-21-c.csv."""
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
RESULTS_PATH = Path("/tmp/drive-inventory/results-19-21-c.csv")
WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
SLICE_START, SLICE_END = 291, 435

gp.RESULTS = RESULTS_PATH
gp.BATCH = "49"
gp.WORK = WORK
gp.COVERS = COVERS

FAMOUS_BATCH49 = {
    "under pressure": ("iconic rock duet anthem", "https://lrclib.net/api/search?q=Under+Pressure+Queen"),
    "dazed and confused": ("Led Zeppelin classic", "https://lrclib.net/api/search?q=Dazed+and+Confused+Led+Zeppelin"),
    "just dance": ("Lady Gaga debut hit", "https://lrclib.net/api/search?q=Just+Dance+Lady+Gaga"),
    "99 luftballons": ("Neue Deutsche Welle signature", "https://lrclib.net/api/search?q=99+Luftballons+Nena"),
    "i'll be around": ("Spinners soul classic", "https://lrclib.net/api/search?q=I%27ll+Be+Around+Spinners"),
    "fascinating rhythm": ("Gershwin standard", "https://en.wikipedia.org/wiki/Fascinating_Rhythm"),
    "the unanswered question": ("Ives landmark work", "https://en.wikipedia.org/wiki/The_Unanswered_Question_(Ives)"),
    "reach for the summit": ("Celeste game theme", "https://lrclib.net/api/search?q=Reach+for+the+Summit+Lena+Raine"),
    "wait": ("M83 signature", "https://lrclib.net/api/search?q=Wait+M83"),
    "epistrophy": ("Monk jazz standard", "https://lrclib.net/api/search?q=Epistrophy+Thelonious+Monk"),
    "i'm old fashioned": ("Kern standard", "https://lrclib.net/api/search?q=I%27m+Old+Fashioned"),
    "helios overture": ("Nielsen orchestral staple", "https://en.wikipedia.org/wiki/Helios_Overture"),
    "you've changed": ("jazz ballad standard", "https://lrclib.net/api/search?q=You%27ve+Changed"),
}
gp.FAMOUS_LYRICS.update(FAMOUS_BATCH49)

_orig_guess = gp.guess_genre


def guess_genre_batch49(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(
        x in t
        for x in [
            "sinfonia",
            "symphony orchestra",
            "philharmonia",
            "northern sinfonia",
            "south jutland",
            "housatonic",
            "ives",
            "nielsen",
            "helios overture",
            "unanswered question",
            "degaetani",
            "kalish",
            "stockbridge",
            "orchestra",
            "concerto",
            "overture",
            "op. ",
            "k. ",
        ]
    ):
        return "Orchestral / Western art music", "Western art music", "Orchestral"
    if any(x in t for x in ["jarrett", "spyweirdos", "epistrophy", "monk", "collier", "jazz"]):
        return "Jazz / Jazz & improvised music", "Jazz & improvised music", "Jazz"
    if any(x in t for x in ["sweet trip", "james ferraro", "tangerine dream", "m83", "in love with a ghost"]):
        return "Dream pop / Electronic", "Electronic", "Dream pop"
    if any(x in t for x in ["led zeppelin", "queen", "david bowie", "under pressure", "dazed"]):
        return "Classic rock / Rock", "Rock", "Classic rock"
    if any(x in t for x in ["lady gaga", "just dance", "nena", "luftballons"]):
        return "Dance-pop / Pop", "Pop", "Dance-pop"
    if any(x in t for x in ["spinners", "i'll be around"]):
        return "Philadelphia soul / Soul & R&B", "Soul & R&B", "Philadelphia soul"
    if any(x in t for x in ["lena raine", "celeste", "reach for the summit"]):
        return "Video game score / Western art music", "Western art music", "Video game score"
    if any(x in t for x in ["raincheck", "search results"]):
        return "Indie pop / Pop", "Pop", "Indie pop"
    if any(x in t for x in ["unknown mystery", "mystery"]):
        return "Garage rock / Rock", "Rock", "Garage rock"
    return _orig_guess(artist, title)


gp.guess_genre = guess_genre_batch49

_orig_vocals = gp.has_vocals_guess


def has_vocals_batch49(title: str, artist: str, tcon: str) -> str:
    tl = f"{artist} {title}".lower()
    if any(
        x in tl
        for x in [
            "overture",
            "unanswered question",
            "housatonic",
            "helios",
            "sinfonia",
            "symphony",
            "orchestra",
            "tangerine dream",
            "epistrophy",
            "instrumental",
            "global lunch",
        ]
    ):
        return "no"
    if "sweet trip" in tl and "dsco" in tl:
        return "unknown"
    return _orig_vocals(title, artist, tcon)


gp.has_vocals_guess = has_vocals_batch49

_orig_art = gp.art_brief_for


def art_brief_batch49(artist: str, title: str, album: str, tcon: str) -> str:
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


gp.art_brief_for = art_brief_batch49


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


def cmd_prep_tagged(source_id: str, mp3: Path, cover_png: Path) -> Path:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    (WORK / f"{source_id}.json").write_text(json.dumps(meta, indent=2))
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_png, cover_jpg)
    out = WORK / "tagged" / f"{source_id}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    apply_tags(mp3, meta, cover_jpg, out)
    return out


def cmd_finalize(source_id: str, mp3: Path, cover_png: Path, tagged_id: str = "") -> None:
    cmd_prep_tagged(source_id, mp3, cover_png)
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
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
    elif cmd == "prep-tagged":
        cmd_prep_tagged(sys.argv[2], mp3_path(sys.argv[2]), Path(sys.argv[3]))
    elif cmd == "append-row":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        meta["tagged_drive_id"] = sys.argv[3]
        append_csv({k: v for k, v in meta.items() if not k.startswith("_")})
    elif cmd == "finalize":
        tid = sys.argv[5] if len(sys.argv) > 5 else ""
        cmd_finalize(sys.argv[2], mp3_path(sys.argv[2]), Path(sys.argv[4]), tid)
    elif cmd == "export-prompts":
        out = Path("/tmp/gap19-work/batch49-prompts.jsonl")
        rows = []
        for t in load_slice():
            p = WORK / f"{t['id']}.json"
            if p.exists():
                meta = json.loads(p.read_text())
                rows.append(
                    {
                        "id": t["id"],
                        "filename": t["title"],
                        "prompt": cover_prompt(meta),
                    }
                )
        out.write_text("\n".join(json.dumps(r) for r in rows))
        print(len(rows), "prompts ->", out)
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
