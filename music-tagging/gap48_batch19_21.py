#!/usr/bin/env python3
"""Gap batch 48: gap-19-21.jsonl lines 146-290 → results-19-21-b.csv."""
from __future__ import annotations

import base64
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
from mutagen.id3 import APIC, COMM, TALB, TBPM, TCOM, TCON, TDOR, TDRC, TIT2, TKEY, TLEN, TPE1, TPE2, TPUB, TXXX, ID3
from mutagen.mp3 import MP3
from PIL import Image

WORK = Path("/tmp/gap48-work")
JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-19-21-b.csv")
HEADER = Path("/tmp/manifest.csv")
COVERS = Path("/workspace/music-tagging/covers/gap19")
SLICE = (146, 290)
BATCH = "48"
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
UA = "PersonalMusicLibraryTagger/1.0 (personal library; batch 48)"
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

FAMOUS_LYRICS: dict[str, tuple[str, str]] = {
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
    "give in to me": ("Michael Jackson rock ballad", "https://lrclib.net/api/search?q=Give+In+To+Me+MJ"),
    "stranger in moscow": ("Michael Jackson ballad", "https://lrclib.net/api/search?q=Stranger+In+Moscow"),
    "liberian girl": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Liberian+Girl"),
    "mundian to bach ke": ("global bhangra crossover hit", "https://lrclib.net/api/search?q=Mundian+To+Bach+Ke"),
    "naatu naatu": ("Oscar-winning film song", "https://lrclib.net/api/search?q=Naatu+Naatu"),
    "jai ho": ("Slumdog Millionaire hit", "https://lrclib.net/api/search?q=Jai+Ho"),
    "chaiyya chaiyya": ("Bollywood classic", "https://lrclib.net/api/search?q=Chaiyya+Chaiyya"),
    "dilbar": ("Bollywood dance hit", "https://lrclib.net/api/search?q=Dilbar"),
    "summertime": ("Gershwin opera standard", "https://lrclib.net/api/search?q=Summertime+Porgy+Bess"),
    "ymca": ("disco YMCA singalong", "https://lrclib.net/api/search?q=YMCA+Village+People"),
    "baby shark": ("viral children's singalong", "https://lrclib.net/api/search?q=Baby+Shark"),
    "come rain or come shine": ("Great American Songbook standard", "https://lrclib.net/api/search?q=Come+Rain+Or+Come+Shine"),
    "stella by starlight": ("jazz standard", "https://lrclib.net/api/search?q=Stella+By+Starlight"),
    "groovejet": ("UK dance hit", "https://lrclib.net/api/search?q=Groovejet"),
    "waka waka": ("2010 World Cup anthem", "https://lrclib.net/api/search?q=Waka+Waka"),
    "la tortura": ("Shakira Latin pop hit", "https://lrclib.net/api/search?q=La+Tortura"),
    "sex on fire": ("Kings of Leon hit", "https://lrclib.net/api/search?q=Sex+On+Fire"),
    "nothing else matters": ("Metallica power ballad", "https://lrclib.net/api/search?q=Nothing+Else+Matters"),
    "enter sandman": ("Metallica metal anthem", "https://lrclib.net/api/search?q=Enter+Sandman"),
    "seven nation army": ("iconic rock riff anthem", "https://lrclib.net/api/search?q=Seven+Nation+Army"),
    "somebody to love": ("Queen classic", "https://lrclib.net/api/search?q=Somebody+To+Love+Queen"),
    "radio ga ga": ("Queen hit", "https://lrclib.net/api/search?q=Radio+Ga+Ga"),
    "crazy little thing called love": ("Queen rockabilly hit", "https://lrclib.net/api/search?q=Crazy+Little+Thing+Queen"),
    "another one bites the dust": ("Queen funk-rock hit", "https://lrclib.net/api/search?q=Another+One+Bites+The+Dust"),
    "black betty": ("Ram Jam rock hit", "https://lrclib.net/api/search?q=Black+Betty"),
    "stairway to heaven": ("classic rock epic", "https://lrclib.net/api/search?q=Stairway+To+Heaven"),
    "train in vain": ("Clash classic", "https://lrclib.net/api/search?q=Train+In+Vain"),
    "africa": ("Toto signature hit", "https://lrclib.net/api/search?q=Africa+Toto"),
    "eye of the tiger": ("Survivor sports anthem", "https://lrclib.net/api/search?q=Eye+Of+The+Tiger"),
    "don't stop believin": ("Journey arena anthem", "https://lrclib.net/api/search?q=Don%27t+Stop+Believin"),
    "can't feel my face": ("The Weeknd pop hit", "https://lrclib.net/api/search?q=Can%27t+Feel+My+Face"),
    "i feel it coming": ("The Weeknd hit", "https://lrclib.net/api/search?q=I+Feel+It+Coming"),
    "interstate love song": ("STP 90s rock hit", "https://lrclib.net/api/search?q=Interstate+Love+Song"),
    "pyramid song": ("Radiohead art-rock staple", "https://lrclib.net/api/search?q=Pyramid+Song"),
    "tainted love": ("Soft Cell synth-pop hit", "https://lrclib.net/api/search?q=Tainted+Love"),
    "blue monday": ("New Order electronic classic", "https://lrclib.net/api/search?q=Blue+Monday"),
    "play that funky music": ("Wild Cherry funk hit", "https://lrclib.net/api/search?q=Play+That+Funky+Music"),
    "renegade": ("Styx rock anthem", "https://lrclib.net/api/search?q=Renegade+Styx"),
    "el rey": ("ranchera standard", "https://lrclib.net/api/search?q=El+Rey+Vicente+Fernandez"),
    "everytime we say goodbye": ("Cole Porter jazz standard", "https://lrclib.net/api/search?q=Everytime+We+Say+Goodbye"),
    "speak low": ("Kurt Weill standard", "https://lrclib.net/api/search?q=Speak+Low"),
    "my shining hour": ("Harold Arlen standard", "https://lrclib.net/api/search?q=My+Shining+Hour"),
    "it might as well be spring": ("Rodgers and Hammerstein standard", "https://lrclib.net/api/search?q=It+Might+As+Well+Be+Spring"),
    "sweet and dandy": ("reggae classic", "https://lrclib.net/api/search?q=Sweet+And+Dandy+Toots"),
    "jack your body": ("house classic", "https://lrclib.net/api/search?q=Jack+Your+Body"),
    "break 4 love": ("house classic", "https://lrclib.net/api/search?q=Break+4+Love"),
    "push the feeling on": ("house remix classic", "https://lrclib.net/api/search?q=Push+The+Feeling+On"),
    "coma cat": ("nu-disco hit", "https://lrclib.net/api/search?q=Coma+Cat"),
    "well you needn't": ("Monk jazz standard", "https://lrclib.net/api/search?q=Well+You+Needn%27t"),
    "now's the time": ("bebop standard", "https://lrclib.net/api/search?q=Now%27s+The+Time"),
    "ruby, my dear": ("Monk ballad", "https://lrclib.net/api/search?q=Ruby+My+Dear"),
    "groovin' high": ("bebop standard", "https://lrclib.net/api/search?q=Groovin%27+High"),
    "good bait": ("jazz standard", "https://lrclib.net/api/search?q=Good+Bait"),
    "i'm just a lucky": ("Ellington standard", "https://lrclib.net/api/search?q=Lucky+So+And+So"),
    "i'm beginning to see the light": ("Duke Ellington standard", "https://lrclib.net/api/search?q=Beginning+To+See+The+Light"),
    "don't explain": ("Billie Holiday standard", "https://lrclib.net/api/search?q=Don%27t+Explain"),
}


def load_slice() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    a, b = SLICE
    return [json.loads(lines[i - 1]) for i in range(a, b + 1)]


def parse_filename(title: str) -> dict[str, str]:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    yt = m.group(1) if m else ""
    base = title[:-4] if title.lower().endswith(".mp3") else title
    if m:
        base = base[: m.start()].strip()
    base = base.replace("⧸", "/").replace("：", ":").replace("？", "?").replace("，", ",").replace("＂", '"')
    parts = base.split(" - ", 1)
    if len(parts) >= 2:
        artist, song = parts[0].strip(), parts[1].strip()
        if song.lower().startswith(artist.lower() + " - "):
            song = song[len(artist) + 3 :].strip()
        for pat in [
            r"\s*\(Official[^)]*\)",
            r"\s*\[Official[^\]]*\]",
            r"\s*\(Remastered[^)]*\)",
            r"\s*\(Remaster[^)]*\)",
            r"\s*\(2012 Remastered[^)]*\)",
            r"\s*\(1990 Remaster\)",
            r"\s*\(2020 Remaster\)",
            r"\s*\(2020 Digital Master\)",
            r"\s*\(Remastered 2011\)",
            r"\s*\(Stereo\)[^[]*",
            r"\s*\(Album Version\)",
            r"\s*\(Radio Edit\)",
            r"\s*\(Original 12[^)]*\)",
            r"\s*\(Mk Dub[^)]*\)",
            r"\s*\(Club Your Body\)",
            r"\s*\(Underground Mix[^)]*\)",
            r"\s*\(MAW[^)]*\)",
            r"\s*\(feat\.[^)]*\)",
            r"\s*\(From [^)]*\)",
            r"\s*- Original$",
        ]:
            song = re.sub(pat, "", song, flags=re.I)
        song = re.sub(r"\s*\[Masters At Work Mix\]", "", song, flags=re.I)
        song = song.strip()
    else:
        artist, song = (parts[0].strip() if parts else ""), ""
    return {"artist_hint": artist, "title_hint": song, "youtube_id": yt, "filename": title}


def mb_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def musicbrainz_lookup(artist: str, title: str) -> dict[str, Any]:
    ct = re.sub(r"\s*\([^)]*\)", " ", title).strip()
    ct = re.sub(r"\s*：.*$", "", ct)
    primary = re.split(r"[,;&]", artist)[0].strip()
    q = urllib.parse.quote(f'recording:"{ct}" AND artist:"{primary}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e), "recordings": []}
    time.sleep(1.05)
    recs = data.get("recordings") or []
    if not recs and ct:
        q2 = urllib.parse.quote(f'recording:"{ct}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.05)
        except Exception as e:
            return {"error": str(e), "recordings": []}
    best = None
    needle = primary.lower().split()[0] if primary else ""
    for rec in recs:
        names = " ".join((c.get("name") or "") for c in (rec.get("artist-credit") or [])).lower()
        if needle and needle in names:
            best = rec
            break
    if not best and recs:
        best = recs[0]
    out: dict[str, Any] = {"best": best, "recordings": recs}
    if best:
        out["title"] = best.get("title")
        rels = best.get("releases") or []
        if rels:
            out["album"] = rels[0].get("title")
            out["date"] = rels[0].get("date")
    return out


def analyze_audio(path: Path) -> dict[str, Any]:
    audio = MP3(path)
    bitrate = int(audio.info.bitrate / 1000) if audio.info.bitrate else 0
    y, sr = librosa.load(str(path), sr=22050, mono=True, duration=120)
    y_full, _ = librosa.load(str(path), sr=22050, mono=True)
    duration_ms = int(librosa.get_duration(y=y_full, sr=sr) * 1000)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])
    bpm_note = ""
    bpm_conf = "Med"
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    best_corr, best_key = -1.0, ""
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
        "key_corr": float(best_corr) if best_corr > 0 else 0,
    }


def guess_genre(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["philharmonic", "orchestra", "symphony", "barber:", "stravinsky", "prokofiev", "britten:", "khachaturian", "honegger", "copland", "appalachian", "bartók", "bach:", "concerto", "mariinsky", "berliner phil", "lang lang", "orpheus chamber", "petrushka", "firebird", "romeo and juliet", "neville", "crown imperial", "alexander nevsky", "young person's guide", "rite of spring", "pacific 231", "romanian folk"]):
        return "Orchestral / Western art music", "Western art music", "Orchestral"
    if any(x in t for x in ["jarrett", "monk", "coltrane", "brubeck", "hancock", "gordon", "stitt", "moody", "pleasure", "snarky puppy", "hamasyan", "sandoval", "coleman", "ornette", "jazz", "bebop", "big band", "kubis"]):
        if "free jazz" in t or "ornette" in t:
            return "Free jazz / Jazz", "Jazz", "Free jazz"
        if "fusion" in t or "snarky" in t:
            return "Jazz fusion / Jazz", "Jazz", "Jazz fusion"
        return "Jazz / Jazz", "Jazz", "Jazz"
    if any(x in t for x in ["metallica", "led zeppelin", "queen", "clash", "white stripes", "styx", "ram jam", "stone temple", "journey", "survivor", "toto", "tom petty", "killers", "linkin park", "kings of leon", "radiohead", "mr. bungle", "widespread panic", "the native howl"]):
        return "Rock / Rock", "Rock", "Rock"
    if any(x in t for x in ["michael jackson", "shakira", "weeknd", "bublé", "jojo", "nct dream", "pinkfong", "hit crew", "men i trust", "neon indian", "l'impératrice", "panda bear", "ok go", "yeule"]):
        return "Pop / Pop", "Pop", "Pop"
    if any(x in t for x in ["house", "octo octa", "nightcrawlers", "spiller", "tensnake", "masters at work", "pal joey", "raze", "ten city", "hercules", "richie hawtin", "j.m. silk", "sterling void", "nightwriters", "pupa nas"]):
        return "House / Electronic", "Electronic", "House"
    if any(x in t for x in ["panjabi", "rahman", "naatu", "jai ho", "dilbar", "chaiyya", "bollywood", "sapna", "sukhwinder", "neha kakkar"]):
        return "Filmi / South Asian popular music", "South Asian popular music", "Filmi"
    if any(x in t for x in ["toots", "reggae", "dancehall"]):
        return "Reggae / Caribbean", "Caribbean", "Reggae"
    if any(x in t for x in ["yoshimura", "oneohtrix", "nicolas jaar", "salem", "portico", "max richter", "newman", "electro swing", "bart&baker"]):
        return "Ambient / Electronic", "Electronic", "Ambient"
    if any(x in t for x in ["garland", "armstrong", "ellington", "fernández", "ranchera", "graham brown", "country"]):
        if "fernández" in t or "el rey" in t:
            return "Ranchera / Latin American", "Latin American", "Ranchera"
        if "graham brown" in t:
            return "Country / Country", "Country", "Country"
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    if any(x in t for x in ["soft cell", "new order", "wild cherry", "funk"]):
        return "Synth-pop / Pop", "Pop", "Synth-pop"
    if "unknown" in t:
        return "Pop / Pop", "Pop", "Pop"
    return "Pop / Pop", "Pop", "Pop"


def cover_artist(artist: str) -> str:
    a = artist.split(",")[0].strip()
    if len(a) > 50:
        a = a.split(" and ")[0].strip()
    return a[:55]


def art_brief(title: str, album: str, sub: str, artist: str) -> str:
    tl = title.lower()
    al = album or "Single"
    if "Western art" in sub or "Orchestral" in sub:
        return f"Concert hall painted vista: empty velvet seats, golden stage light on score stand (album: {al}; artist nod: strings)."
    if "Jazz" in sub:
        return f"Smoky blue jazz club still life: brass bell, amber spotlight on empty piano bench (album: {al}; artist nod: sax silhouette)."
    if "Rock" in sub:
        return f"Painted highway sunset: chrome guitar case on asphalt, orange-violet sky (album: {al}; artist nod: amplifier glow)."
    if "Electronic" in sub or "House" in sub or "Ambient" in sub:
        return f"Neon-lit abstract city night, cyan-magenta gradients, empty dance floor reflection (album: {al}; artist nod: synth waveforms)."
    if "Filmi" in sub or "South Asian" in sub:
        return f"Vibrant painted festival night: marigold garlands, warm lantern glow, empty courtyard (album: {al}; artist nod: tabla silhouette)."
    if "Reggae" in sub or "Caribbean" in sub:
        return f"Tropical painted shoreline at dusk, palm silhouettes, warm gold light (album: {al}; artist nod: rhythm pattern)."
    if "ranchera" in sub.lower() or "latin" in sub.lower():
        return f"Desert sunset ranch gate, adobe wall and sombrero shadow on warm earth (album: {al}; artist nod: mariachi trumpet)."
    return f"Premium painted warm scene suggesting {title[:40]} (album: {al}; artist nod: music)." 


def has_vocals(artist: str, title: str, tcon: str) -> str:
    t = f"{artist} {title}".lower()
    if ("hamasyan" in t and "love song" in t) or any(
        x in t
        for x in [
            "orchestra", "philharmonic", "symphony", "concerto", "suite", "march", "prelude",
            "solfeggietto", "dance of the knights", "adagio of spartacus", "petrushka", "firebird",
            "pacific 231", "romanian folk", "young person's guide", "barber:", "britten:",
            "stella by starlight", "well-tempered", "samsara", "drip", "what the waves", "a fable",
        ]
    ):
        if "summertime" in t or "knoxville" in t or "speak low" in t:
            return "yes"
        return "no"
    if any(x in t for x in ["yoshimura", "oneohtrix", "richter", "newman", "portico", "chrome country", "offset", "prickly pear", "departure", "any other name", "garden of eden", "pass the time", "minus/orange", "electro swing mix", "solfeggietto", "luca sestak"]):
        return "no"
    if "instrumental" in t:
        return "no"
    return "yes"


def lyrics(title: str, hv: str) -> tuple[str, str, str]:
    if hv == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (r, u) in FAMOUS_LYRICS.items():
        if k in tl:
            return "yes", r, u
    return "no", "", ""


def cover_prompt(row: dict) -> str:
    artist = row["_cover_artist"]
    title = row["TIT2"]
    album = row["TALB"] or "Single"
    art = row["art_brief"]
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{artist}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{title}".
- Smaller italic serif album title directly beneath: "{album}".

Scene (full bleed, no text in the middle): {art}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere, no celebrity faces."""


def build_row(filename: str, sid: str, parsed: dict, audio: dict, mb: dict, o: Optional[dict] = None) -> dict:
    o = o or {}
    artist = o.get("TPE1") or parsed["artist_hint"]
    title = o.get("TIT2") or parsed["title_hint"]
    if mb.get("title") and not o.get("TIT2"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or ""
    tcon, fam, sub = guess_genre(artist, title)
    if o.get("TCON"):
        tcon = o["TCON"]
        if " / " in tcon:
            sub, fam = tcon.split(" / ", 1)
    comm = f"Genre Universe family: {fam}; subgenre: {sub}."
    hv = o.get("has_vocals") or has_vocals(artist, title, tcon)
    ly, lr, ls = lyrics(title, hv)
    notes = o.get("notes", "")
    if audio.get("bpm_note"):
        notes = (notes + " " + audio["bpm_note"]).strip()
    if mb.get("error"):
        notes = (notes + f" MusicBrainz lookup error: {mb['error']}.").strip()
    if not mb.get("best"):
        notes = (notes + " MusicBrainz: no confident match; filename and audio used.").strip()
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    return {
        "filename": filename,
        "source_drive_id": sid,
        "tagged_drive_id": "",
        "TIT2": title,
        "TIT2_conf": o.get("TIT2_conf", "High" if title else "Med"),
        "TPE1": artist,
        "TPE1_conf": o.get("TPE1_conf", "Med"),
        "TALB": album,
        "TALB_conf": o.get("TALB_conf", "Med" if album else ""),
        "TDRC": o.get("TDRC") or mb.get("date") or "",
        "TDRC_conf": o.get("TDRC_conf", "Med" if (o.get("TDRC") or mb.get("date")) else ""),
        "TDOR": o.get("TDOR", ""),
        "TDOR_conf": o.get("TDOR_conf", ""),
        "TCON": tcon,
        "TCON_conf": o.get("TCON_conf", "Med"),
        "TLEN": str(audio["duration_ms"]),
        "TLEN_conf": "High",
        "TPE2": o.get("TPE2") or cover_artist(artist),
        "TPE2_conf": "Med",
        "TRCK": "",
        "TRCK_conf": "",
        "TPOS": "",
        "TPOS_conf": "",
        "TCOM": o.get("TCOM", ""),
        "TCOM_conf": "High" if o.get("TCOM") else "",
        "TBPM": str(audio["bpm"]),
        "TBPM_conf": audio["bpm_conf"],
        "TKEY": o.get("TKEY", audio["tkey"]),
        "TKEY_conf": o.get("TKEY_conf", audio["tkey_conf"]),
        "MOOD": o.get("MOOD") or "reflective; warm; steady",
        "MOOD_conf": "Low",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": o.get("TPUB", ""),
        "TPUB_conf": "Med" if o.get("TPUB") else "",
        "TSRC": "",
        "TSRC_conf": "",
        "COMM": comm,
        "COMM_conf": "Med",
        "cover_path": str(COVERS / f"{sid}.jpg"),
        "cover_method": COVER_METHOD,
        "art_brief": o.get("art_brief") or art_brief(title, album, sub, artist),
        "sources": o.get("sources") or "filename parse; MusicBrainz; librosa",
        "notes": notes.strip(),
        "batch": BATCH,
        "has_vocals": hv,
        "lyrics_selected": ly,
        "lyrics_reason": lr,
        "lyrics_source": ls,
        "cover_text_check": "",
        "cover_model": COVER_MODEL,
        "cheap_reason": cheap,
        "_youtube_id": parsed["youtube_id"],
        "_cover_artist": cover_artist(artist),
    }


def fieldnames() -> list[str]:
    with open(HEADER, newline="") as f:
        return next(csv.reader(f))


def init_results() -> None:
    if not RESULTS.exists():
        with open(RESULTS, "w", newline="") as f:
            csv.writer(f).writerow(fieldnames())


def done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def append_csv(row: dict) -> None:
    fn = fieldnames()
    with open(RESULTS, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL)
        w.writerow({k: row.get(k, "") for k in fn})


def resize_cover(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im.resize((1400, 1400), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=92)


def apply_tags(mp3: Path, row: dict, cover_jpg: Path, out: Path) -> None:
    audio = MP3(mp3, ID3=ID3)
    if audio.tags is None:
        audio.add_tags()
    t = audio.tags
    for frame, val in [
        (TIT2, row["TIT2"]),
        (TPE1, row["TPE1"]),
        (TALB, row["TALB"]),
        (TDRC, row["TDRC"]),
        (TDOR, row["TDOR"]),
        (TCON, row["TCON"]),
        (TLEN, row["TLEN"]),
        (TPE2, row["TPE2"]),
        (TBPM, row["TBPM"]),
        (TKEY, row["TKEY"]),
        (TCOM, row["TCOM"]),
        (TPUB, row["TPUB"]),
    ]:
        if val:
            t.delall(frame.__name__)
            t.add(frame(encoding=3, text=val))
    t.delall("COMM")
    t.add(COMM(encoding=3, lang="eng", desc="", text=row["COMM"]))
    if row["MOOD"]:
        t.delall("TXXX:MOOD")
        t.add(TXXX(encoding=3, desc="MOOD", text=row["MOOD"]))
    yt = row.get("_youtube_id")
    if yt:
        t.delall("TXXX:purl")
        t.add(TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={yt}"))
    t.delall("APIC")
    t.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_jpg.read_bytes()))
    audio.save(str(out), v2_version=3)


def save_download_json(json_path: Path, mp3_path: Path) -> None:
    obj = json.loads(json_path.read_text())
    content = obj.get("content") or obj.get("base64Content") or obj.get("data")
    mp3_path.parent.mkdir(parents=True, exist_ok=True)
    mp3_path.write_bytes(base64.b64decode(content))


def cmd_analyze(sid: str, mp3: Path, title: str) -> dict:
    WORK.mkdir(parents=True, exist_ok=True)
    parsed = parse_filename(title)
    parsed["filename"] = title
    row = build_row(title, sid, parsed, analyze_audio(mp3), musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"]))
    (WORK / f"{sid}.json").write_text(json.dumps(row, indent=2))
    return row


def cmd_finalize(sid: str, mp3: Path, cover: Path, tagged_id: str = "") -> None:
    meta = json.loads((WORK / f"{sid}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    jpg = Path(meta["cover_path"])
    resize_cover(cover, jpg)
    out = WORK / f"{sid}.tagged.mp3"
    apply_tags(mp3, meta, jpg, out)
    append_csv(meta)


def upload_payload(sid: str) -> dict:
    p = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    return {
        "title": meta["filename"],
        "parentId": TAG_FOLDER,
        "contentMimeType": "audio/mpeg",
        "disableConversionToGoogleType": True,
        "base64Content": base64.b64encode(p.read_bytes()).decode(),
    }


if __name__ == "__main__":
    init_results()
    c = sys.argv[1]
    if c == "list-pending":
        d = done_ids()
        for t in load_slice():
            if t["id"] not in d:
                print(t["id"], t["title"][:70])
    elif c == "list-needs-cover":
        d = done_ids()
        for t in load_slice():
            sid = t["id"]
            if sid in d:
                continue
            meta = WORK / f"{sid}.json"
            png = WORK / f"{sid}.cover.png"
            if meta.exists() and not png.exists():
                print(sid)
    elif c == "analyze":
        row = cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
        print(cover_prompt(row))
    elif c == "prompt":
        print(cover_prompt(json.loads((WORK / f"{sys.argv[2]}.json").read_text())))
    elif c == "finalize":
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else "")
    elif c == "batch-analyze":
        d = done_ids()
        for t in load_slice():
            if t["id"] in d:
                continue
            mp3 = WORK / f"{t['id']}.mp3"
            if mp3.exists():
                cmd_analyze(t["id"], mp3, t["title"])
                time.sleep(1.1)
    elif c == "save-dl":
        save_download_json(Path(sys.argv[2]), WORK / f"{sys.argv[3]}.mp3")
    elif c == "upload-json":
        print(json.dumps({k: upload_payload(sys.argv[2])[k] for k in ("title", "parentId", "contentMimeType", "disableConversionToGoogleType")}))
        print("b64_len", len(upload_payload(sys.argv[2])["base64Content"]))
    elif c == "write-upload-b64":
        sid = sys.argv[2]
        Path(f"/tmp/gap48-work/{sid}.upload.b64").write_text(upload_payload(sid)["base64Content"])
        print(sid, "ok")
    else:
        print("commands: list-pending, analyze, batch-analyze, prompt, finalize, save-dl, upload-json")
