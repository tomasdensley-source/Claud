#!/usr/bin/env python3
"""Gap 17-19 batch C (jsonl lines 149-222), manifest batch 41."""
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

import librosa
import numpy as np
from mutagen.id3 import APIC, COMM, TALB, TBPM, TCOM, TCON, TDRC, TIT2, TKEY, TLEN, TPE1, TPE2, TPUB, TXXX, ID3
from mutagen.mp3 import MP3
from PIL import Image

WORK = Path("/tmp/gap17-work")
MP3_DIR = WORK / "mp3"
META_DIR = WORK / "meta"
COVERS = Path("/workspace/music-tagging/covers/gap17")
RESULTS = Path("/tmp/drive-inventory/results-17-19-c.csv")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
BATCH = "41"
UA = "PersonalMusicLibraryTagger/1.0 (personal; gap17c batch 41)"
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

FAMOUS_LYRICS: dict[str, tuple[str, str]] = {
    "handy man": ("No. 1 pop hit; widely quoted hook", "https://lrclib.net/api/search?q=Handy+Man+Jimmy+Jones"),
    "greenfields": ("folk-pop standard", "https://lrclib.net/api/search?q=Greenfields+Brothers+Four"),
    "el paso": ("country storytelling classic; Grammy-winning narrative", "https://lrclib.net/api/search?q=El+Paso+Marty+Robbins"),
    "only the lonely": ("Roy Orbison signature ballad", "https://lrclib.net/api/search?q=Only+the+Lonely+Roy+Orbison"),
    "the three bells": ("No. 1 hit; narrative ballad", "https://lrclib.net/api/search?q=Three+Bells+Browns"),
    "lonely boy": ("Paul Anka hit", "https://lrclib.net/api/search?q=Lonely+Boy+Paul+Anka"),
    "come softly to me": ("Fleetwoods No. 1 hit", "https://lrclib.net/api/search?q=Come+Softly+To+Me+Fleetwoods"),
    "kansas city": ("R&B/pop standard", "https://lrclib.net/api/search?q=Kansas+City+Wilbert+Harrison"),
    "put your head on my shoulder": ("Paul Anka standard", "https://lrclib.net/api/search?q=Put+Your+Head+On+My+Shoulder"),
    "stagger lee": ("American folk/blues narrative standard", "https://lrclib.net/api/search?q=Stagger+Lee+Lloyd+Price"),
    "charlie brown": ("Coasters hit; iconic catchphrase", "https://lrclib.net/api/search?q=Charlie+Brown+Coasters"),
    "donna": ("Ritchie Valens classic", "https://lrclib.net/api/search?q=Donna+Ritchie+Valens"),
    "all i have to do is dream": ("Everly Brothers No. 1 hit", "https://lrclib.net/api/search?q=All+I+Have+To+Do+Is+Dream"),
    "it's all in the game": ("pop standard", "https://lrclib.net/api/search?q=It%27s+All+In+The+Game"),
    "tequila": ("instrumental hook widely known", "https://lrclib.net/api/search?q=Tequila+Champs"),
    "get a job": ("doo-wop hit; iconic refrain", "https://lrclib.net/api/search?q=Get+a+Job+Silhouettes"),
    "purple people eater": ("novelty hit; singalong", "https://lrclib.net/api/search?q=Purple+People+Eater"),
    "twilight time": ("Platters standard", "https://lrclib.net/api/search?q=Twilight+Time+Platters"),
    "he's got the whole world": ("gospel/tradition widely sung", "https://lrclib.net/api/search?q=He%27s+Got+The+Whole+World"),
    "yakety yak": ("Coasters hit", "https://lrclib.net/api/search?q=Yakety+Yak+Coasters"),
    "tom dooley": ("folk standard; Kingston Trio hit", "https://lrclib.net/api/search?q=Tom+Dooley+Kingston+Trio"),
    "lollipop": ("Chordettes hit", "https://lrclib.net/api/search?q=Lollipop+Chordettes"),
    "young love": ("1950s pop standard (multiple versions)", "https://lrclib.net/api/search?q=Young+Love"),
    "bye bye love": ("Everly Brothers classic", "https://lrclib.net/api/search?q=Bye+Bye+Love+Everly"),
    "a white sport coat": ("Marty Robbins country hit", "https://lrclib.net/api/search?q=White+Sport+Coat+Marty+Robbins"),
    "day o": ("Belafonte signature; calypso standard", "https://lrclib.net/api/search?q=Day-O+Harry+Belafonte"),
    "banana boat": ("Belafonte signature; calypso standard", "https://lrclib.net/api/search?q=Day-O+Harry+Belafonte"),
    "you send me": ("Sam Cooke No. 1 hit", "https://lrclib.net/api/search?q=You+Send+Me+Sam+Cooke"),
    "wake up little susie": ("Everly Brothers hit", "https://lrclib.net/api/search?q=Wake+Up+Little+Susie"),
    "the great pretender": ("Platters classic", "https://lrclib.net/api/search?q=Great+Pretender+Platters"),
    "hot diggity": ("Perry Como hit", "https://lrclib.net/api/search?q=Hot+Diggity+Perry+Como"),
    "the green door": ("Jim Lowe hit", "https://lrclib.net/api/search?q=Green+Door+Jim+Lowe"),
    "cherry pink": ("Latin pop instrumental/vocal standard", "https://lrclib.net/api/search?q=Cherry+Pink+Apple+Blossom+White"),
    "yellow rose of texas": ("American folk standard", "https://lrclib.net/api/search?q=Yellow+Rose+of+Texas"),
    "ain't that a shame": ("Fats Domino standard (Boone cover hit)", "https://lrclib.net/api/search?q=Ain%27t+That+A+Shame"),
    "love is a many-splendored thing": ("Four Aces standard", "https://lrclib.net/api/search?q=Love+Is+A+Many-Splendored+Thing"),
    "sincerely": ("McGuire Sisters hit", "https://lrclib.net/api/search?q=Sincerely+McGuire+Sisters"),
    "sixteen tons": ("Tennessee Ernie Ford classic; widely quoted", "https://lrclib.net/api/search?q=Sixteen+Tons"),
    "hearts of stone": ("Fontane Sisters hit", "https://lrclib.net/api/search?q=Hearts+Of+Stone"),
    "moments to remember": ("Four Lads standard", "https://lrclib.net/api/search?q=Moments+To+Remember"),
    "mister sandman": ("Chordettes No. 1 hit", "https://lrclib.net/api/search?q=Mister+Sandman"),
    "sh-boom": ("doo-wop standard", "https://lrclib.net/api/search?q=Sh-Boom+Crew+Cuts"),
    "little things mean a lot": ("Kitty Kallen No. 1 hit", "https://lrclib.net/api/search?q=Little+Things+Mean+A+Lot"),
    "hey there": ("Broadway/pop standard (Rosemary Clooney)", "https://lrclib.net/api/search?q=Hey+There+Rosemary+Clooney"),
    "three coins in the fountain": ("Oscar-winning song standard", "https://lrclib.net/api/search?q=Three+Coins+In+The+Fountain"),
    "this ole house": ("Rosemary Clooney hit", "https://lrclib.net/api/search?q=This+Ole+House"),
    "poor little fool": ("first Billboard Hot 100 No. 1", "https://lrclib.net/api/search?q=Poor+Little+Fool+Ricky+Nelson"),
    "mr. blue": ("Fleetwoods hit", "https://lrclib.net/api/search?q=Mr+Blue+Fleetwoods"),
    "alley-oop": ("novelty hit", "https://lrclib.net/api/search?q=Alley-Oop+Hollywood+Argyles"),
}


def manifest_header() -> list[str]:
    return list(csv.reader(open("/tmp/manifest.csv", newline="")))[0]


def parse_filename(title: str) -> dict[str, str]:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    yt = m.group(1) if m else ""
    base = title[:-4] if title.lower().endswith(".mp3") else title
    if m:
        base = base[: m.start()].strip()
    parts = base.split(" - ")
    artist = parts[0].strip() if parts else ""
    song = " - ".join(parts[1:]).strip() if len(parts) >= 2 else base
    if len(parts) >= 3:
        artist = parts[0].strip()
        song = " - ".join(parts[1:]).strip()
    song = re.sub(r"\s*\(Remaster[^)]*\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(2007 Remaster\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(1996 Digital Remaster\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(Digitally Mastered[^)]*\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(Single\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(Original\)", "", song, flags=re.I)
    song = re.sub(r"\s*\(Rerecorded\)", "", song, flags=re.I)
    dup = f"{artist} - "
    if song.lower().startswith(dup.lower()):
        song = song[len(dup) :].strip()
    return {"artist_hint": artist, "title_hint": song, "youtube_id": yt, "filename": title}


def mb_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode())


def musicbrainz_lookup(artist: str, title: str) -> dict[str, Any]:
    clean_title = re.sub(r"\s*\([^)]*\)\s*", " ", title).strip()
    q = urllib.parse.quote(f'recording:"{clean_title}" AND artist:"{artist}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e), "recordings": []}
    time.sleep(1.1)
    recs = data.get("recordings") or []
    if not recs:
        q2 = urllib.parse.quote(f'recording:"{clean_title}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.1)
        except Exception as e:
            return {"error": str(e), "recordings": []}
    al = artist.lower().split(",")[0].strip()
    best = None
    for rec in recs:
        ac = rec.get("artist-credit") or []
        names = " ".join((c.get("name") or "") for c in ac).lower()
        if al and al.split()[0] in names:
            best = rec
            break
    if not best and recs:
        best = recs[0]
    out: dict[str, Any] = {"recordings": recs, "best": best}
    if best:
        out["mbid"] = best.get("id")
        out["title"] = best.get("title")
        rels = best.get("releases") or []
        if rels:
            rel = sorted(rels, key=lambda r: r.get("date") or "9999")[0]
            out["album"] = rel.get("title")
            out["date"] = rel.get("date")
    return out


def analyze_audio(path: Path) -> dict[str, Any]:
    audio = MP3(path)
    bitrate = int(audio.info.bitrate / 1000) if audio.info.bitrate else 0
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    duration_ms = int(librosa.get_duration(y=y, sr=sr) * 1000)
    y_seg, _ = librosa.load(str(path), sr=22050, mono=True, duration=120)
    tempo, _ = librosa.beat.beat_track(y=y_seg, sr=sr)
    bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])
    bpm_conf = "Med"
    bpm_note = ""
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
    chroma = librosa.feature.chroma_cqt(y=y_seg, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    best_corr, best_key = -1, ""
    for i in range(12):
        maj = np.corrcoef(chroma_mean, np.roll(major_profile, i))[0, 1]
        min_ = np.corrcoef(chroma_mean, np.roll(minor_profile, i))[0, 1]
        if not np.isnan(maj) and maj > best_corr:
            best_corr, best_key = maj, KEYS[i]
        if not np.isnan(min_) and min_ > best_corr:
            best_corr, best_key = min_, KEYS[i] + "m"
    tkey_conf = "Med" if best_corr >= 0.55 else ("Low" if best_corr >= 0.45 else "")
    tkey = best_key if tkey_conf else ""
    return {
        "duration_ms": duration_ms,
        "bitrate_kbps": bitrate,
        "bpm": int(round(bpm)),
        "bpm_conf": bpm_conf,
        "bpm_note": bpm_note,
        "tkey": tkey,
        "tkey_conf": tkey_conf,
        "key_corr": float(best_corr) if not np.isnan(best_corr) else 0,
    }


def guess_genre(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["marty robbins", "tennessee ernie", "jimmie rodgers", "sonny james", "el paso", "white sport coat", "sixteen tons"]):
        return "Classic country / Country & Americana", "Country & Americana", "Classic country"
    if any(x in t for x in ["denny", "baxter", "winterhalter", "riddle", "stolof", "maddox", "exotica", "quiet village", "lisbon antigua", "canadian sunset", "moonglow", "poor people of paris", "crazy otto"]):
        return "Space-age pop / Easy listening", "Easy listening", "Space-age pop"
    if any(x in t for x in ["prado", "patricia", "cherry pink", "mambo"]):
        return "Latin pop / Pop", "Pop", "Latin pop"
    if any(x in t for x in ["belafonte", "day o", "calypso"]):
        return "Calypso / Folk & roots", "Folk & roots", "Calypso"
    if any(x in t for x in ["kingston trio", "brothers four", "tom dooley", "greenfields"]):
        return "Folk revival / Folk & roots", "Folk & roots", "Folk revival"
    if any(x in t for x in ["coasters", "platters", "silhouettes", "chordettes", "doo-wop", "sh-boom", "crew cuts", "diamonds", "elegants", "four lads", "four aces", "mcguire"]):
        return "Doo-wop / Pop", "Pop", "Doo-wop"
    if any(x in t for x in ["everly", "orbison", "ricky nelson", "paul anka", "pat boone", "fleetwoods", "tommy edwards", "jack scott", "lloyd price", "ritchie valens", "tab hunter", "laurie london", "kitty kallen", "joan weber", "fontane"]):
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    if any(x in t for x in ["champs", "tequila"]):
        return "Rock & roll instrumental / Rock", "Rock", "Rock & roll instrumental"
    if any(x in t for x in ["dorsey", "big band", "orchestra", "mitchell ayres", "perry como", "nat king cole", "sam cooke", "harry belafonte", "rosemary clooney", "kay starr", "mitch miller", "paul weston", "jo stafford"]):
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    if any(x in t for x in ["cooke", "harrison", "price", "stagger"]):
        return "R&B / Soul & R&B", "Soul & R&B", "R&B"
    return "Traditional pop / Pop", "Pop", "Traditional pop"


def art_brief_for(artist: str, title: str, album: str, tcon: str) -> str:
    alb = album or "Single"
    if "Classic country" in tcon or "Country" in tcon:
        return f"Dusty desert highway at sunset, lone saddle on fence post, pink carnation on barbed wire (album: {alb}; artist nod: cowboy hat silhouette)."
    if "Space-age" in tcon or "Easy listening" in tcon:
        return f"Mid-century tiki lounge still life: bamboo torches, orchid lei, turquoise lagoon glow through palm fronds (album: {alb}; artist nod: vibraphone mallets)."
    if "Latin pop" in tcon:
        return f"Vibrant painted trumpet bell and maraca still life on terracotta tiles, tropical sunset (album: {alb}; artist nod: conga drum curve)."
    if "Calypso" in tcon:
        return f"Moonlit dock with banana bunches and woven basket, Caribbean sea gradient (album: {alb}; artist nod: steel pan reflection)."
    if "Folk revival" in tcon or "Folk & roots" in tcon:
        return f"Rustic barn interior, acoustic guitar and banjo leaning on hay bale, golden window light (album: {alb}; artist nod: three-part harmony suggested by three chairs)."
    if "Doo-wop" in tcon:
        return f"Neon-lit street corner at night, chrome diner window reflection, empty sidewalk (album: {alb}; artist nod: streetlamp halo)."
    if "Rock & roll instrumental" in tcon:
        return f"Agave desert and salt shaker on wooden bar, warm amber spotlight (album: {alb}; artist nod: saxophone shadow)."
    if "R&B" in tcon:
        return f"Velvet curtain and vintage microphone on empty stage, amber footlights (album: {alb}; artist nod: soulful glow)."
    return f"1950s painted ballroom still life: crystal chandelier soft focus, empty dance floor warmth (album: {alb}; artist nod: {artist.split(',')[0] if artist else 'vocal'})."


def has_vocals_guess(title: str, tcon: str) -> str:
    tl = title.lower()
    if "tequila" in tl and "champs" in tl.lower():
        return "no"
    if "instrumental" in tl or "rag" in tl or "ivory rag" in tl:
        return "no"
    if "Space-age" in tcon and "village" in tl:
        return "no"
    if "canadian sunset" in tl or "moonglow" in tl or "lisbon antigua" in tl:
        return "no"
    return "yes"


def lyrics_policy(title: str, has_vocals: str) -> tuple[str, str, str]:
    if has_vocals == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (reason, url) in FAMOUS_LYRICS.items():
        if k in tl:
            return "yes", reason, url
    return "no", "", ""


def cover_prompt(artist: str, title: str, album: str, art_brief: str) -> str:
    display_artist = artist.split(",")[0].strip()
    if len(display_artist) > 45:
        display_artist = display_artist[:42] + "…"
    album_clause = (
        f'\n- Smaller italic serif album title directly beneath: "{album}".'
        if album and album.lower() not in ("single", "unknown")
        else ""
    )
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve matching the Benny Goodman reference style). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{display_artist}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{title}".{album_clause}

Scene (full bleed, no text in the middle): {art_brief}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere, no celebrity faces."""


def build_row(
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
    if mb.get("best") and mb.get("title") and not o.get("TIT2"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or ""
    tdrc = o.get("TDRC") or mb.get("date") or ""
    tcon, family, sub = guess_genre(artist, title)
    if o.get("TCON"):
        tcon = o["TCON"]
    comm = f"Genre Universe family: {family}; subgenre: {sub}."
    has_v = o.get("has_vocals") or has_vocals_guess(title, tcon)
    ly_sel, ly_reas, ly_src = lyrics_policy(title, has_v)
    mood = o.get("MOOD") or "nostalgic; warm; gentle"
    art = o.get("art_brief") or art_brief_for(artist, title, album or "Single", tcon)
    cover_path = str(COVERS / f"{source_id}.jpg")
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    notes = o.get("notes") or ""
    if audio.get("bpm_note"):
        notes = (notes + " " + audio["bpm_note"]).strip()
    if mb.get("error"):
        notes = (notes + f" MusicBrainz: {mb['error']}.").strip()
    if not mb.get("best"):
        notes = (notes + " MusicBrainz: no confident match; filename and audio used.").strip()
    sources = o.get("sources") or "filename parse; MusicBrainz; librosa"
    conf = lambda v, c="Med": c if v else ""

    return {
        "filename": filename,
        "source_drive_id": source_id,
        "tagged_drive_id": tagged_id,
        "TIT2": title,
        "TIT2_conf": o.get("TIT2_conf", "High" if mb.get("title") else "Med"),
        "TPE1": artist,
        "TPE1_conf": o.get("TPE1_conf", "Med"),
        "TALB": album,
        "TALB_conf": conf(album, "Med" if mb.get("album") else "Low"),
        "TDRC": tdrc,
        "TDRC_conf": conf(tdrc, "Med" if mb.get("date") else "Low"),
        "TDOR": o.get("TDOR", ""),
        "TDOR_conf": o.get("TDOR_conf", ""),
        "TCON": tcon,
        "TCON_conf": "Med",
        "TLEN": str(audio["duration_ms"]),
        "TLEN_conf": "High",
        "TPE2": o.get("TPE2") or artist.split(",")[0].strip(),
        "TPE2_conf": "Med",
        "TRCK": "",
        "TRCK_conf": "",
        "TPOS": "",
        "TPOS_conf": "",
        "TCOM": o.get("TCOM", ""),
        "TCOM_conf": conf(o.get("TCOM", ""), "High"),
        "TBPM": str(audio["bpm"]) if audio.get("bpm") else "",
        "TBPM_conf": audio.get("bpm_conf", "Med"),
        "TKEY": o.get("TKEY", audio.get("tkey", "")),
        "TKEY_conf": o.get("TKEY_conf", audio.get("tkey_conf", "")),
        "MOOD": mood,
        "MOOD_conf": "Low",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": o.get("TPUB", ""),
        "TPUB_conf": conf(o.get("TPUB", ""), "Med"),
        "TSRC": "",
        "TSRC_conf": "",
        "COMM": comm,
        "COMM_conf": "Med",
        "cover_path": cover_path,
        "cover_method": COVER_METHOD,
        "art_brief": art,
        "sources": sources,
        "notes": notes.strip(),
        "batch": BATCH,
        "has_vocals": has_v,
        "lyrics_selected": ly_sel,
        "lyrics_reason": ly_reas,
        "lyrics_source": ly_src,
        "cover_text_check": o.get("cover_text_check", ""),
        "cover_model": COVER_MODEL,
        "cheap_reason": cheap,
        "_youtube_id": parsed.get("youtube_id") or "",
        "_cover_prompt": cover_prompt(artist, title, album, art),
        "_display_artist": artist.split(",")[0].strip(),
    }


def resize_cover(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im = im.resize((1400, 1400), Image.Resampling.LANCZOS)
    im.save(dest, "JPEG", quality=92)


def apply_tags(mp3_path: Path, row: dict, cover_jpg: Path, out_path: Path) -> None:
    import shutil

    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(mp3_path, out_path)
    audio = MP3(out_path)
    if audio.tags is None:
        audio.add_tags()
    else:
        audio.tags = ID3()
    audio.tags.add(TIT2(encoding=3, text=row["TIT2"]))
    audio.tags.add(TPE1(encoding=3, text=row["TPE1"]))
    if row["TALB"]:
        audio.tags.add(TALB(encoding=3, text=row["TALB"]))
    if row["TDRC"]:
        audio.tags.add(TDRC(encoding=3, text=row["TDRC"]))
    if row["TCON"]:
        audio.tags.add(TCON(encoding=3, text=row["TCON"]))
    audio.tags.add(TLEN(encoding=3, text=row["TLEN"]))
    if row["TPE2"]:
        audio.tags.add(TPE2(encoding=3, text=row["TPE2"]))
    if row["TBPM"]:
        audio.tags.add(TBPM(encoding=3, text=row["TBPM"]))
    if row["TKEY"]:
        audio.tags.add(TKEY(encoding=3, text=row["TKEY"]))
    if row["TCOM"]:
        audio.tags.add(TCOM(encoding=3, text=row["TCOM"]))
    if row["TPUB"]:
        audio.tags.add(TPUB(encoding=3, text=row["TPUB"]))
    audio.tags.add(COMM(encoding=3, lang="eng", desc="", text=row["COMM"]))
    if row["MOOD"]:
        audio.tags.add(TXXX(encoding=3, desc="MOOD", text=row["MOOD"]))
    yt = row.get("_youtube_id") or ""
    if yt:
        audio.tags.add(TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={yt}"))
    cover_data = cover_jpg.read_bytes()
    audio.tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_data))
    audio.save(v2_version=3)


def append_csv(row: dict) -> None:
    fieldnames = manifest_header()
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


def load_batch_tracks() -> list[dict]:
    lines = Path("/tmp/gap-batch-c.jsonl").read_text().splitlines()
    return [json.loads(l) for l in lines if l.strip()]


def cmd_analyze_all() -> None:
    META_DIR.mkdir(parents=True, exist_ok=True)
    done = load_done_ids()
    for tr in load_batch_tracks():
        sid = tr["id"]
        if sid in done:
            continue
        mp3 = MP3_DIR / f"{sid}.mp3"
        if not mp3.exists():
            print("missing", sid, file=sys.stderr)
            continue
        parsed = parse_filename(tr["title"])
        parsed["filename"] = tr["title"]
        audio = analyze_audio(mp3)
        mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
        row = build_row(tr["title"], sid, "", parsed, audio, mb)
        (META_DIR / f"{sid}.json").write_text(json.dumps(row, indent=2))
        print("analyzed", sid, row["TIT2"][:40])


def cmd_finalize(source_id: str, cover_png: Path) -> Path:
    meta = json.loads((META_DIR / f"{source_id}.json").read_text())
    mp3 = MP3_DIR / f"{source_id}.mp3"
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_png, cover_jpg)
    out = WORK / "tagged" / f"{source_id}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    apply_tags(mp3, meta, cover_jpg, out)
    return out


def cmd_set_tagged(source_id: str, tagged_id: str, cover_check: str = "ok (verified by eye)") -> None:
    meta = json.loads((META_DIR / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = cover_check
    append_csv(meta)
    (META_DIR / f"{source_id}.json").write_text(json.dumps(meta, indent=2))
    print("csv", source_id, tagged_id)


if __name__ == "__main__":
    if sys.argv[1] == "analyze-all":
        cmd_analyze_all()
    elif sys.argv[1] == "finalize":
        cmd_finalize(sys.argv[2], Path(sys.argv[3]))
    elif sys.argv[1] == "set-tagged":
        cmd_set_tagged(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "ok (verified by eye)")
    elif sys.argv[1] == "pending":
        done = load_done_ids()
        for tr in load_batch_tracks():
            if tr["id"] not in done:
                print(tr["id"])
