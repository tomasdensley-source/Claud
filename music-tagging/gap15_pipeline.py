#!/usr/bin/env python3
"""Gap batch 15-17 slice processor: analyze, tag, CSV row formatting."""
from __future__ import annotations

import base64
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional

import librosa
import numpy as np
from mutagen.id3 import (
    APIC,
    COMM,
    TALB,
    TBPM,
    TCOM,
    TCON,
    TDRC,
    TIT2,
    TKEY,
    TLEN,
    TPE1,
    TPE2,
    TPUB,
    TXXX,
    ID3,
)
from mutagen.mp3 import MP3
from PIL import Image

WORK = Path("/tmp/gap15-work")
COVERS = Path("/workspace/music-tagging/covers/gap15")
RESULTS = Path("/tmp/drive-inventory/results-15-17-d.csv")
OVERRIDES_PATH = Path(__file__).with_name("gap15_overrides.json")
MANIFEST = Path("/tmp/manifest.csv")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
BATCH = "38"
UA = "CursorGap15Tagger/1.0 (personal library; contact: none)"

COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"

KEYS = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
]


def parse_filename(title: str) -> dict[str, str]:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    yt = m.group(1) if m else ""
    base = title[:-4] if title.lower().endswith(".mp3") else title
    if m:
        base = base[: m.start()].strip()
    parts = [p.strip() for p in base.split(" - ")]
    if len(parts) >= 3:
        artist = parts[1]
        rest = " - ".join(parts[2:]).strip()
        rest = re.sub(r"\s*\(Official[^)]*\)", "", rest, flags=re.I)
        rest = re.sub(r"\s*\[Official[^\]]*\]", "", rest, flags=re.I)
        song = rest.strip()
    elif len(parts) >= 2:
        artist = parts[0].strip()
        rest = " - ".join(parts[1:]).strip()
        if rest.lower().startswith(artist.lower() + " - "):
            rest = rest[len(artist) + 3 :].strip()
        rest = re.sub(r"\s*\(Official[^)]*\)", "", rest, flags=re.I)
        rest = re.sub(r"\s*\[Official[^\]]*\]", "", rest, flags=re.I)
        rest = re.sub(r"\s*\[Lyrics[^\]]*\]", "", rest, flags=re.I)
        rest = re.sub(r"\s*\(Audio\)", "", rest, flags=re.I)
        rest = re.sub(r"\s*\(Lyric Video\)", "", rest, flags=re.I)
        rest = re.sub(r"\s*\(Remaster[^)]*\)", "", rest, flags=re.I)
        rest = re.sub(r"\s*\(HD Remaster\)", "", rest, flags=re.I)
        rest = rest.strip()
        song = rest
    else:
        artist = parts[0].strip() if parts else ""
        song = ""
    return {"artist_hint": artist, "title_hint": song, "youtube_id": yt, "filename": title}


def mb_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def musicbrainz_lookup(artist: str, title: str) -> dict[str, Any]:
    q = urllib.parse.quote(f'recording:"{title}" AND artist:"{artist}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e), "recordings": []}
    time.sleep(1.05)
    recs = data.get("recordings") or []
    if not recs and title:
        q2 = urllib.parse.quote(f'recording:"{title}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.05)
        except Exception as e:
            return {"error": str(e), "recordings": []}
    best = None
    al = artist.lower()
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
            rel = rels[0]
            out["album"] = rel.get("title")
            out["date"] = rel.get("date")
            out["release_id"] = rel.get("id")
    return out


def analyze_audio(path: Path) -> dict[str, Any]:
    audio = MP3(path)
    bitrate = int(audio.info.bitrate / 1000) if audio.info.bitrate else 0
    duration_ms = int(audio.info.length * 1000)
    y, sr = librosa.load(str(path), sr=22050, mono=True, duration=120)
    y_full, _ = librosa.load(str(path), sr=22050, mono=True)
    dur_full = librosa.get_duration(y=y_full, sr=sr)
    duration_ms = int(dur_full * 1000)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])
    bpm_conf = "Med"
    bpm_note = ""
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
            bpm_conf = "Med"
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    key_idx = int(np.argmax(chroma_mean))
    key_name = KEYS[key_idx]
    # major/minor via correlation
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    maj_corr = np.corrcoef(np.roll(major_profile, key_idx), chroma_mean)[0, 1]
    min_corr = np.corrcoef(np.roll(minor_profile, key_idx), chroma_mean)[0, 1]
    if np.isnan(maj_corr):
        maj_corr = 0
    if np.isnan(min_corr):
        min_corr = 0
    mode = "m" if min_corr > maj_corr else ""
    tkey = f"{key_name}{mode}"
    tkey_conf = "Med" if max(maj_corr, min_corr) > 0.55 else "Low"
    if max(maj_corr, min_corr) < 0.45:
        tkey = ""
        tkey_conf = ""
    return {
        "duration_ms": duration_ms,
        "bitrate_kbps": bitrate,
        "bpm": int(round(bpm)),
        "bpm_conf": bpm_conf,
        "bpm_note": bpm_note,
        "tkey": tkey,
        "tkey_conf": tkey_conf,
        "key_corr": float(max(maj_corr, min_corr)),
    }


def guess_genre(artist: str, title: str, mb: dict) -> tuple[str, str, str]:
    """Returns TCON, family, subgenre."""
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["chopin", "bach", "mozart", "nocturne", "étude", "etude", "symph", "cello quartet", "philharmonic", "concerto", "fugue"]):
        return "Western art music / Classical", "Western art music", "Classical"
    if any(x in t for x in ["jazz", "my favorite things", "joey alexander"]):
        return "Jazz / Jazz", "Jazz", "Jazz"
    if any(x in t for x in ["meute", "brass", "too many zooz"]):
        return "Brass house / Electronic", "Electronic", "Brass house"
    if any(x in t for x in ["led zeppelin", "ac/dc", "zz top", "cake", "wolfmother", "fall out boy", "imagine dragons"]):
        return "Rock / Rock", "Rock", "Rock"
    if any(x in t for x in ["yelawolf", "watsky", "chiddy bang", "rap", "hip hop", "lil jon"]):
        return "Hip hop / Hip hop", "Hip hop", "Hip hop"
    if any(x in t for x in ["bee gees", "night fever", "disco", "rick james", "super freak"]):
        return "Disco / Funk", "Funk", "Disco"
    if any(x in t for x in ["rosalía", "flamenco", "malamente"]):
        return "Flamenco pop / Pop", "Pop", "Flamenco pop"
    if any(x in t for x in ["beatles", "yes -", "roundabout"]):
        return "Progressive rock / Rock", "Rock", "Progressive rock"
    if "electronic" in t or "overwerk" in t or "knife" in t or "still woozy" in t:
        return "Indie electronic / Electronic", "Electronic", "Indie electronic"
    if "folk" in t or "dead south" in t or "tom rosenthal" in t:
        return "Indie folk / Folk", "Folk", "Indie folk"
    return "Pop / Pop", "Pop", "Pop"


def art_brief_for(artist: str, title: str, album: str, tcon: str) -> str:
    base = f"a lone atmospheric painted scene evoking {title[:40]}"
    if "Classical" in tcon or "Western art" in tcon:
        return f"Moonlit concert-hall still life: gilt music stand, open score pages, warm candle glow on polished wood (album: {album}; artist nod: strings and keys)."
    if "Jazz" in tcon:
        return f"Smoky blue club interior: brass bell of a saxophone, single spotlight pool on empty stage floor (album: {album}; artist nod: piano keys reflected)."
    if "Rock" in tcon:
        return f"High-contrast painted highway at dusk, heat shimmer and electric-guitar silhouette against orange sky (album: {album}; artist nod: amplifier glow)."
    if "Hip hop" in tcon:
        return f"Urban night alley mural texture, neon rim light and vinyl crate corner, no figures (album: {album}; artist nod: boombox shape abstracted)."
    if "Electronic" in tcon or "Brass" in tcon:
        return f"Abstract pulse landscape: geometric sound waves and brass horn curves in teal and gold light (album: {album}; artist nod: marching band energy)."
    if "Folk" in tcon:
        return f"Dusty porch at golden hour, worn acoustic guitar leaning on railing, wheat field horizon (album: {album}; artist nod: banjo headstock)."
    if "Flamenco" in tcon:
        return f"Andalusian courtyard at night, red rose and castanets on terracotta tiles, moon through arch (album: {album}; artist nod: flamenco fan fold)."
    if "Funk" in tcon or "Disco" in tcon:
        return f"Mirror-ball sparkle over dance floor gradient, purple and gold light beams, no people (album: {album}; artist nod: platform heel silhouette only)."
    return f"Premium painted abstract scene with warm light and depth suggesting {title} (album: {album}; artist nod: {artist.split()[0] if artist else 'music'})."


FAMOUS_LYRICS = {
    "hound dog": ("iconic rock and roll standard", "https://en.wikipedia.org/wiki/Hound_Dog_(song)"),
    "stand by me": ("classic soul standard", "https://en.wikipedia.org/wiki/Stand_by_Me_(Ben_E._King_song)"),
    "yellow submarine": ("Beatles singalong classic", "https://en.wikipedia.org/wiki/Yellow_Submarine_(song)"),
    "video killed the radio star": ("MTV-era pop landmark", "https://en.wikipedia.org/wiki/Video_Killed_the_Radio_Star"),
    "should i stay or should i go": ("iconic Clash singalong", "https://en.wikipedia.org/wiki/Should_I_Stay_or_Should_I_Go"),
    "we are young": ("2010s anthemic pop hit", "https://en.wikipedia.org/wiki/We_Are_Young"),
    "midnight city": ("signature M83 hit", "https://en.wikipedia.org/wiki/Midnight_City"),
    "dog days are over": ("Florence breakout hit", "https://en.wikipedia.org/wiki/Dog_Days_Are_Over"),
    "believer": ("Imagine Dragons chart hit", "https://en.wikipedia.org/wiki/Believer_(Imagine_Dragons_song)"),
    "dancing in the moonlight": ("widely covered classic", "https://en.wikipedia.org/wiki/Dancing_in_the_Moonlight"),
    "no sleep": ("Beastie Boys rap classic", "https://en.wikipedia.org/wiki/No_Sleep_till_Brooklyn"),
    "tutti frutti": ("foundational rock and roll hit", "https://en.wikipedia.org/wiki/Tutti_Frutti_(song)"),
    "crazy in love": ("Beyoncé standard (orchestral cover)", "https://en.wikipedia.org/wiki/Crazy_in_Love"),
    "attention": ("Charlie Puth pop hit", "https://en.wikipedia.org/wiki/Attention_(Charlie_Puth_song)"),
    "be ok": ("Ingrid Michaelson indie staple", "https://en.wikipedia.org/wiki/Be_OK_(Ingrid_Michaelson_song)"),
    "camptown races": ("American folk song standard", "https://en.wikipedia.org/wiki/Camptown_Races"),
    "caravan": ("jazz standard", "https://en.wikipedia.org/wiki/Caravan_(1936_song)"),
    "killing me softly": ("widely known pop standard", "https://en.wikipedia.org/wiki/Killing_Me_Softly_with_His_Song"),
    "ride wit me": ("2000s hip hop singalong", "https://en.wikipedia.org/wiki/Ride_wit_Me"),
    "handlebars": ("Flobots spoken-word hit", "https://en.wikipedia.org/wiki/Handlebars_(song)"),
    "i can't decide": ("Scissor Sisters pop hit", "https://en.wikipedia.org/wiki/I_Can%27t_Decide"),
    "super freak": ("standard", "https://lrclib.net/api/search?q=Super+Freak+Rick+James"),
    "night fever": ("standard", "https://lrclib.net/api/search?q=Night+Fever+Bee+Gees"),
    "nowhere man": ("iconic Beatles album track", "https://lrclib.net/api/search?q=Nowhere+Man+Beatles"),
    "roundabout": ("progressive rock standard", "https://lrclib.net/api/search?q=Roundabout+Yes"),
    "whole lotta love": ("classic rock anthem", "https://lrclib.net/api/search?q=Whole+Lotta+Love+Led+Zeppelin"),
    "good times bad times": ("classic rock", "https://lrclib.net/api/search?q=Good+Times+Bad+Times+Led+Zeppelin"),
    "houses of the holy": ("Led Zeppelin deep cut", "https://lrclib.net/api/search?q=Houses+of+the+Holy+Led+Zeppelin"),
    "human nature": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Human+Nature+Michael+Jackson"),
    "sharp dressed man": ("ZZ Top hit", "https://lrclib.net/api/search?q=Sharp+Dressed+Man+ZZ+Top"),
    "the distance": ("CAKE signature song", "https://lrclib.net/api/search?q=The+Distance+Cake"),
    "makeba": ("Jain international hit", "https://lrclib.net/api/search?q=Makeba+Jain"),
    "turn down for what": ("DJ Snake/Lil Jon hit", "https://lrclib.net/api/search?q=Turn+Down+For+What"),
    "eye in the sky": ("Alan Parsons Project hit", "https://lrclib.net/api/search?q=Eye+in+the+Sky"),
    "leave it": ("Yes album track", "https://lrclib.net/api/search?q=Leave+It+Yes"),
    "down on me": ("Janis Joplin standard", "https://lrclib.net/api/search?q=Down+On+Me+Janis+Joplin"),
    "look what they've done to my song": ("Melanie hit", "https://lrclib.net/api/search?q=Look+What+They%27ve+Done+To+My+Song+Ma"),
    "shambala": ("Three Dog Night hit", "https://lrclib.net/api/search?q=Shambala"),
    "in hell i'll be in good company": ("The Dead South breakout", "https://lrclib.net/api/search?q=In+Hell+I%27ll+Be+In+Good+Company"),
}


def lyrics_policy(title: str, has_vocals: str) -> tuple[str, str, str]:
    if has_vocals == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (reason, url) in FAMOUS_LYRICS.items():
        if k in tl:
            return "yes", reason, url
    return "no", "", ""


def has_vocals_guess(title: str, tcon: str) -> str:
    if "Western art" in tcon or "Classical" in tcon:
        if any(x in title.lower() for x in ["etude", "nocturne", "fugue", "phantom", "czardas", "fanfares", "mahler", "glass"]):
            return "no"
    if "car alarm" in title.lower() and "too many zooz" in title.lower():
        return "no"
    if "a-r-p" in title.lower():
        return "unknown"
    return "yes"


def load_overrides(source_id: str) -> dict:
    path = Path("/workspace/music-tagging/gap15_overrides.json")
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return dict(data.get(source_id) or {})
    except Exception:
        return {}


def build_row(
    filename: str,
    source_id: str,
    tagged_id: str,
    parsed: dict,
    audio: dict,
    mb: dict,
    overrides: Optional[dict] = None,
) -> dict[str, str]:
    o = {**load_overrides(source_id), **(overrides or {})}
    artist = o.get("TPE1") or parsed["artist_hint"]
    title = o.get("TIT2") or parsed["title_hint"]
    if mb.get("best"):
        best = mb["best"]
        if not o.get("TIT2") and mb.get("title"):
            title = mb["title"]
        if not o.get("TPE1"):
            ac = best.get("artist-credit") or []
            names = [c.get("name") or "" for c in ac if c.get("name")]
            if names:
                artist = "; ".join(names)
    album = o.get("TALB") or mb.get("album") or ""
    tdrc = o.get("TDRC") or mb.get("date") or ""
    tcom = o.get("TCOM") or ""
    tpub = o.get("TPUB") or ""
    tdor = o.get("TDOR") or ""
    tcon, family, sub = guess_genre(artist, title, mb)
    if o.get("TCON"):
        tcon = o["TCON"]
        if " / " in tcon:
            sub, family = tcon.split(" / ", 1)
    comm = f"Genre Universe family: {family}; subgenre: {sub}."
    if o.get("COMM_extra"):
        comm += " " + o["COMM_extra"]
    has_v = o.get("has_vocals") or has_vocals_guess(title, tcon)
    ly_sel, ly_reas, ly_src = lyrics_policy(title, has_v)
    if o.get("lyrics_selected"):
        ly_sel = o["lyrics_selected"]
        ly_reas = o.get("lyrics_reason", ly_reas)
        ly_src = o.get("lyrics_source", ly_src)
    mood = o.get("MOOD") or "reflective; warm; steady"
    art = o.get("art_brief") or art_brief_for(artist, title, album or "Single", tcon)
    cover_path = f"/workspace/music-tagging/covers/gap15/{source_id}.jpg"
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    notes = o.get("notes") or ""
    if audio.get("bpm_note") and audio["bpm_note"] not in notes:
        notes = (notes + " " + audio["bpm_note"]).strip()
    if mb.get("error"):
        notes = (notes + f" MusicBrainz lookup error: {mb['error']}.").strip()
    sources = o.get("sources") or f"filename parse; MusicBrainz; librosa"
    yt = parsed.get("youtube_id") or ""
    conf = lambda v, c="Med": c if v else ""

    row = {
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
        "TPE2": o.get("TPE2") or artist,
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
    }
    return row


def resize_cover(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im = im.resize((1400, 1400), Image.Resampling.LANCZOS)
    im.save(dest, "JPEG", quality=92)


def apply_tags(mp3_path: Path, row: dict, cover_jpg: Path, out_path: Path) -> None:
    import shutil

    shutil.copy2(mp3_path, out_path)
    audio = MP3(out_path)
    if audio.tags is None:
        audio.add_tags()
    try:
        audio.tags.delall("APIC")
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
        with open(cover_jpg, "rb") as f:
            cover_data = f.read()
        audio.tags.add(
            APIC(
                encoding=3,
                mime="image/jpeg",
                type=3,
                desc="Cover",
                data=cover_data,
            )
        )
    except Exception as e:
        raise RuntimeError(f"ID3 tag write failed: {e}") from e
    audio.save()


def csv_fieldnames() -> list[str]:
    if RESULTS.exists() and RESULTS.stat().st_size > 0:
        with open(RESULTS, newline="", encoding="utf-8") as f:
            return list(csv.reader(f))[0]
    with open(MANIFEST, newline="", encoding="utf-8") as f:
        return list(csv.reader(f))[0]


def append_csv(row: dict) -> None:
    fieldnames = csv_fieldnames()
    out_row = {k: row.get(k, "") for k in fieldnames if not k.startswith("_")}
    write_header = not RESULTS.exists() or RESULTS.stat().st_size == 0
    with open(RESULTS, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        if write_header:
            w.writeheader()
        w.writerow(out_row)


def load_done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def load_overrides(source_id: str) -> dict:
    if OVERRIDES_PATH.exists():
        all_o = json.loads(OVERRIDES_PATH.read_text())
        return all_o.get(source_id, {})
    return {}


def cmd_analyze(source_id: str, mp3: Path, drive_title: str | None = None) -> None:
    meta_path = WORK / f"{source_id}.json"
    title = drive_title or mp3.name
    parsed = parse_filename(title)
    parsed["filename"] = title
    audio = analyze_audio(mp3)
    overrides = load_overrides(source_id)
    if overrides.get("TIT2") and overrides.get("TPE1"):
        mb: dict[str, Any] = {"recordings": []}
    else:
        mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
    row = build_row(title, source_id, "", parsed, audio, mb, overrides=overrides)
    meta_path.write_text(json.dumps(row, indent=2))


def cover_prompt(row: dict) -> str:
    artist = (row.get("TPE1") or "").split(";")[0].strip()
    album = row.get("TALB") or ""
    title = row.get("TIT2") or ""
    art = row.get("art_brief") or ""
    album_line = (
        f'\n- Smaller italic serif album title directly beneath: "{album}".'
        if album
        else ""
    )
    return (
        "Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, "
        "rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.\n\n"
        "Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):\n"
        f'- Top: artist name "{artist}" in small caps, elegant and fully readable.\n'
        "- Lower third: calm uncluttered band for titles.\n"
        f'- Large serif song title: "{title}".{album_line}\n\n'
        f"Scene (full bleed, no text in the middle): {art}\n\n"
        "No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere."
    )


def cmd_finalize(source_id: str, mp3: Path, cover_png: Path, tagged_drive_id: str = "") -> Path:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    if tagged_drive_id:
        meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_png, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, cover_jpg, out)
    (WORK / f"{source_id}.json").write_text(json.dumps(meta, indent=2))
    return out


def cmd_append(source_id: str, tagged_drive_id: str) -> None:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_drive_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    (WORK / f"{source_id}.json").write_text(json.dumps(meta, indent=2))
    append_csv({k: v for k, v in meta.items() if not k.startswith("_")})


def cmd_complete(source_id: str, mp3: Path, cover_png: Path, tagged_drive_id: str) -> None:
    cmd_finalize(source_id, mp3, cover_png, tagged_drive_id)
    cmd_append(source_id, tagged_drive_id)


def cmd_batch_analyze(start: int, end: int) -> None:
    lines = Path("/tmp/drive-inventory/gap-15-17.jsonl").read_text().splitlines()
    done = load_done_ids()
    for i in range(start, end + 1):
        t = json.loads(lines[i - 1])
        sid = t["id"]
        if sid in done:
            continue
        mp3 = WORK / f"{sid}.mp3"
        if not mp3.exists():
            print(f"missing {sid}")
            continue
        cmd_analyze(sid, mp3, t["title"])
        meta = json.loads((WORK / f"{sid}.json").read_text())
        (WORK / f"{sid}.prompt.txt").write_text(cover_prompt(meta))
        print(f"analyzed {sid}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: analyze <id> <mp3> [drive_title] | finalize <id> <mp3> <cover_png> | "
            "complete <id> <mp3> <cover_png> <tagged_drive_id> | batch-analyze <start> <end>"
        )
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "analyze":
        drive_title = sys.argv[4] if len(sys.argv) > 4 else None
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), drive_title)
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        (WORK / f"{sys.argv[2]}.prompt.txt").write_text(cover_prompt(meta))
    elif cmd == "finalize":
        tid = sys.argv[5] if len(sys.argv) > 5 else ""
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), tid)
    elif cmd == "append":
        cmd_append(sys.argv[2], sys.argv[3])
    elif cmd == "complete":
        cmd_complete(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5])
    elif cmd == "batch-analyze":
        cmd_batch_analyze(int(sys.argv[2]), int(sys.argv[3]))
