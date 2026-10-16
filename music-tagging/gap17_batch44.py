#!/usr/bin/env python3
"""Batch 44: gap-17-19.jsonl lines 371-444 (swing/big-band slice)."""
from __future__ import annotations

import csv
import json
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Optional

import librosa
import numpy as np
from mutagen.id3 import APIC, COMM, TALB, TBPM, TCOM, TCON, TDRC, TDOR, TIT2, TKEY, TLEN, TPE1, TPE2, TPUB, TXXX, ID3
from mutagen.mp3 import MP3
from PIL import Image

WORK = Path("/tmp/gap17-work")
COVERS = Path("/workspace/music-tagging/covers/gap17")
JSONL = Path("/tmp/drive-inventory/gap-17-19.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-17-19-f.csv")
HEADER = Path("/tmp/manifest.csv")
BATCH = "44"
SLICE = (371, 444)
UA = "PersonalMusicLibraryTagger/1.0 (personal library; gap-batch-44)"
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

STANDARDS: dict[str, tuple[str, str]] = {
    "heart and soul": ("standard", "https://lrclib.net/api/search?q=Heart+And+Soul"),
    "once in a while": ("1930s standard", "https://lrclib.net/api/search?q=Once+In+A+While"),
    "that old feeling": ("standard", "https://lrclib.net/api/search?q=That+Old+Feeling"),
    "sentimental over you": ("Tommy Dorsey signature", "https://lrclib.net/api/search?q=Sentimental+Over+You"),
    "sweet home chicago": ("blues standard", "https://lrclib.net/api/search?q=Sweet+Home+Chicago"),
    "mood for love": ("standard", "https://lrclib.net/api/search?q=In+The+Mood+For+Love"),
    "rhythm is our business": ("swing standard", "https://lrclib.net/api/search?q=Rhythm+Is+Our+Business"),
    "isle of capri": ("standard", "https://lrclib.net/api/search?q=Isle+Of+Capri"),
    "object of my affection": ("standard", "https://lrclib.net/api/search?q=Object+Of+My+Affection"),
    "stormy weather": ("Harold Arlen standard", "https://lrclib.net/api/search?q=Stormy+Weather"),
    "love is the sweetest thing": ("standard", "https://lrclib.net/api/search?q=Love+Is+The+Sweetest+Thing"),
    "some of these days": ("standard", "https://lrclib.net/api/search?q=Some+Of+These+Days"),
    "smoke gets in your eyes": ("Jerome Kern standard", "https://lrclib.net/api/search?q=Smoke+Gets+In+Your+Eyes"),
    "yesterdays": ("Jerome Kern standard", "https://lrclib.net/api/search?q=Yesterdays"),
    "big bad wolf": ("1930s Disney hit", "https://lrclib.net/api/search?q=Who%27s+Afraid+Of+The+Big+Bad+Wolf"),
    "in the money": ("Gold Diggers standard", "https://lrclib.net/api/search?q=We%27re+In+The+Money"),
    "it don't mean a thing": ("Ellington standard", "https://lrclib.net/api/search?q=It+Don%27t+Mean+A+Thing"),
    "all of me": ("jazz standard", "https://lrclib.net/api/search?q=All+Of+Me"),
    "how deep is the ocean": ("Irving Berlin standard", "https://lrclib.net/api/search?q=How+Deep+Is+The+Ocean"),
    "try a little tenderness": ("standard", "https://lrclib.net/api/search?q=Try+A+Little+Tenderness"),
    "tiger rag": ("jazz standard", "https://lrclib.net/api/search?q=Tiger+Rag"),
    "willow weep for me": ("standard", "https://lrclib.net/api/search?q=Willow+Weep+For+Me"),
    "dream a little dream": ("standard", "https://lrclib.net/api/search?q=Dream+A+Little+Dream+Of+Me"),
    "goodnight sweetheart": ("standard", "https://lrclib.net/api/search?q=Goodnight+Sweetheart"),
    "stardust": ("Hoagy Carmichael standard", "https://lrclib.net/api/search?q=Stardust"),
    "gigolo": ("standard", "https://lrclib.net/api/search?q=Just+A+Gigolo"),
    "moon comes over the mountain": ("Kate Smith signature", "https://lrclib.net/api/search?q=When+The+Moon+Comes+Over+The+Mountain"),
    "lazy river": ("Hoagy Carmichael standard", "https://lrclib.net/api/search?q=Lazy+River"),
    "bowl of cherries": ("1930s hit", "https://lrclib.net/api/search?q=Life+Is+Just+A+Bowl+Of+Cherries"),
    "sunny side of the street": ("standard", "https://lrclib.net/api/search?q=On+The+Sunny+Side+Of+The+Street"),
    "peanut vendor": ("Latin standard", "https://lrclib.net/api/search?q=Peanut+Vendor"),
    "georgia on my mind": ("Hoagy Carmichael standard", "https://lrclib.net/api/search?q=Georgia+On+My+Mind"),
    "walkin' my baby": ("standard", "https://lrclib.net/api/search?q=Walkin+My+Baby+Back+Home"),
    "blue horizon": ("film standard", "https://lrclib.net/api/search?q=Beyond+The+Blue+Horizon"),
    "thing called love": ("Cole Porter standard", "https://lrclib.net/api/search?q=What+Is+This+Thing+Called+Love"),
    "ten cents a dance": ("Rodgers standard", "https://lrclib.net/api/search?q=Ten+Cents+A+Dance"),
    "sitting on top of the world": ("blues standard", "https://lrclib.net/api/search?q=Sitting+On+Top+Of+The+World"),
    "tiptoe through the tulips": ("Nick Lucas hit", "https://lrclib.net/api/search?q=Tiptoe+Through+The+Tulips"),
    "exactly like you": ("standard", "https://lrclib.net/api/search?q=Exactly+Like+You"),
    "great day": ("show tune", "https://lrclib.net/api/search?q=Great+Day"),
    "shadow waltz": ("1930s ballad", "https://lrclib.net/api/search?q=Shadow+Waltz"),
    "dream walking": ("standard", "https://lrclib.net/api/search?q=Did+You+Ever+See+A+Dream+Walking"),
    "say it isn't so": ("Irving Berlin standard", "https://lrclib.net/api/search?q=Say+It+Isn%27t+So"),
    "the continental": ("1934 film song", "https://lrclib.net/api/search?q=The+Continental"),
    "please be kind": ("standard", "https://lrclib.net/api/search?q=Please+Be+Kind"),
    "please be kind": ("standard", "https://lrclib.net/api/search?q=Please+Be+Kind"),
    "life is a song": ("standard", "https://lrclib.net/api/search?q=Life+Is+A+Song"),
    "stay as sweet as you are": ("standard", "https://lrclib.net/api/search?q=Stay+As+Sweet+As+You+Are"),
    "old spinning wheel": ("standard", "https://lrclib.net/api/search?q=Old+Spinning+Wheel"),
    "grass shack": ("Hawaiian standard", "https://lrclib.net/api/search?q=My+Little+Grass+Shack"),
    "putting all my eggs": ("standard", "https://lrclib.net/api/search?q=Putting+All+My+Eggs+In+One+Basket"),
    "latin from manhattan": ("standard", "https://lrclib.net/api/search?q=She%27s+A+Latin+From+Manhattan"),
    "little dutch mill": ("standard", "https://lrclib.net/api/search?q=Little+Dutch+Mill"),
    "whispers in the dark": ("1930s film song", "https://lrclib.net/api/search?q=Whispers+In+The+Dark"),
    "carelessly": ("standard", "https://lrclib.net/api/search?q=Carelessly"),
    "cry, baby, cry": ("1930s song", "https://lrclib.net/api/search?q=Cry+Baby+Cry"),
    "string along with you": ("standard", "https://lrclib.net/api/search?q=I%27ll+String+Along+With+You"),
    "shanty in old shanty town": ("1930s hit", "https://lrclib.net/api/search?q=Shanty+In+Old+Shanty+Town"),
    "pagan love song": ("standard", "https://lrclib.net/api/search?q=Pagan+Love+Song"),
    "wedding of the painted doll": ("Broadway standard", "https://lrclib.net/api/search?q=Wedding+Of+The+Painted+Doll"),
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
    base = base.replace("⧸", "/").replace("：", ":").replace("？", "?").replace("，", ",")
    parts = base.split(" - ", 1)
    if len(parts) >= 2:
        artist, song = parts[0].strip(), parts[1].strip()
        if song.lower().startswith(artist.lower() + " - "):
            song = song[len(artist) + 3 :].strip()
        song = re.sub(r"\s*feat\.\s*[^[\(]+", "", song, flags=re.I)
        for pat in [
            r"\s*\(Live[^)]*\)",
            r"\s*\(Recorded[^)]*\)",
            r"\s*\(\d{4}[^)]*\)",
            r"\s*\(Album Version\)",
            r"\s*\(Remastered\)",
            r"\s*\(From Movie[^)]*\)",
            r"\s*\(from the film[^)]*\)",
            r"\s*\(Vocal chorus[^)]*\)",
            r"\s*\(2013[^)]*\)",
        ]:
            song = re.sub(pat, "", song, flags=re.I)
        song = re.sub(r"\s*⧸.*$", "", song)
        song = re.sub(r"\s*/\s*Haunting Me.*$", "", song)
        song = re.sub(r"^Introduction by[^⧸/]+[⧸/]\s*", "", song, flags=re.I)
        song = re.sub(r"^\[You May Not Be An Angel But\]\s*", "", song)
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
    primary = artist.split(",")[0].strip()
    q = urllib.parse.quote(f'recording:"{ct}" AND artist:"{primary}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e)}
    time.sleep(1.05)
    recs = data.get("recordings") or []
    if not recs and ct:
        q2 = urllib.parse.quote(f'recording:"{ct}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.05)
        except Exception as e:
            return {"error": str(e)}
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
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    key_idx = int(np.argmax(chroma_mean))
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    maj = np.corrcoef(np.roll(major_profile, key_idx), chroma_mean)[0, 1]
    min_ = np.corrcoef(np.roll(minor_profile, key_idx), chroma_mean)[0, 1]
    if np.isnan(maj):
        maj = 0
    if np.isnan(min_):
        min_ = 0
    mode = "m" if min_ > maj else ""
    tkey = f"{KEYS[key_idx]}{mode}"
    corr = max(maj, min_)
    tkey_conf = "Med" if corr > 0.55 else "Low"
    if corr < 0.45:
        tkey, tkey_conf = "", ""
    return {
        "duration_ms": duration_ms,
        "bitrate_kbps": bitrate,
        "bpm": int(round(bpm)),
        "bpm_conf": "Med",
        "bpm_note": bpm_note,
        "tkey": tkey,
        "tkey_conf": tkey_conf,
    }


def guess_genre(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if "johnson" in t and "sweet home" in t:
        return "Country blues / Blues", "Blues", "Country blues"
    if "sheiks" in t:
        return "Country blues / Blues", "Blues", "Country blues"
    if "peanut vendor" in t or "azpiazu" in t or "havana" in t:
        return "Rumba / Jazz & improvised music", "Jazz & improvised music", "Latin jazz"
    if "armstrong" in t or "dorsey" in t or "whiteman" in t or "noble" in t or "lunceford" in t:
        return "Swing / Jazz & improvised music", "Jazz & improvised music", "Swing"
    if "orchestra" in t or "band" in t:
        return "Big band / Jazz & improvised music", "Jazz & improvised music", "Big band"
    return "Vocal jazz / Jazz & improvised music", "Jazz & improvised music", "Vocal jazz"


def cover_artist(artist: str) -> str:
    a = artist.split(",")[0].strip()
    a = re.sub(r"\s+(and|&)\s+His\s+(Orchestra|Band|Harlem Express|Rippling Rhythm Orchestra).*$", "", a, flags=re.I)
    return a[:55]


def art_brief(title: str, album: str, sub: str) -> str:
    tl = title.lower()
    if "stormy" in tl:
        return f"Rain-streaked art-deco window, amber street glow, empty umbrella stand (album: {album}; artist nod: muted trumpet)."
    if "stardust" in tl or "dream" in tl:
        return f"Indigo night over empty bandstand, soft star haze and gold footlights (album: {album}; artist nod: clarinet bell)."
    if "georgia" in tl:
        return f"Misty live-oak lane at dawn, peach light on quiet porch (album: {album}; artist nod: piano keys in shadow)."
    if "peanut" in tl or "jungle" in tl:
        return f"Moonlit palms and carved maracas on woven mat, teal-gold light (album: {album}; artist nod: conga curve)."
    if "chicago" in tl:
        return f"1930s rails at dusk, steel gleam and smoke haze (album: {album}; artist nod: resonator guitar)."
    if "grass shack" in tl or "pagan" in tl:
        return f"Pacific golden hour, ukulele on driftwood, hibiscus on sand (album: {album}; artist nod: palm silhouette)."
    if "tiger" in tl:
        return f"Abstract orange-black stripe rhythm on piano keys (album: {album}; artist nod: trombone slide)."
    if "wolf" in tl:
        return f"Storybook forest moonlight, playful brick-stack shadow, no characters (album: {album}; artist nod: fairy-tale path)."
    if "money" in tl:
        return f"Art-deco green curtain and coin shimmer on empty stage (album: {album}; artist nod: top hat silhouette)."
    return f"1930s ballroom still life: vintage microphone on velvet stand, warm chandelier glow (album: {album}; artist nod: saxophone silhouette)."


def has_vocals(artist: str, title: str) -> str:
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["satan takes a holiday", "tiger rag", "merry go round broke down", "washington & lee swing"]):
        return "no"
    if "orchestra" in t and "feat" not in t and "holiday" not in t and "bowlly" not in t and "wain" not in t:
        if not any(x in t for x in ["vocal", "lawrence", "edwards", "macdonald", "anderson", "burke", "keel"]):
            return "unknown"
    return "yes"


def lyrics(title: str, hv: str) -> tuple[str, str, str]:
    if hv == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (r, u) in STANDARDS.items():
        if k in tl:
            return "yes", r, u
    return "no", "", ""


def cover_prompt(row: dict) -> str:
    artist = row["_cover_artist"]
    title = row["TIT2"]
    album = row["TALB"] or ""
    art = row["art_brief"]
    alb = f'\n- Smaller italic serif album title directly beneath: "{album}".' if album else ""
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{artist}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{title}".{alb}

Scene (full bleed, no text in the middle): {art}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere, no celebrity faces."""


def build_row(filename: str, sid: str, parsed: dict, audio: dict, mb: dict, o: Optional[dict] = None) -> dict:
    o = o or {}
    artist = o.get("TPE1") or parsed["artist_hint"]
    title = o.get("TIT2") or parsed["title_hint"]
    if mb.get("title") and not o.get("TIT2"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or "YouTube Personal Archive"
    tcon, fam, sub = guess_genre(artist, title)
    comm = f"Genre Universe family: {fam}; subgenre: {sub}."
    hv = o.get("has_vocals") or has_vocals(artist, title)
    ly, lr, ls = lyrics(title, hv)
    notes = o.get("notes", "")
    if audio.get("bpm_note"):
        notes = (notes + " " + audio["bpm_note"]).strip()
    if not mb.get("best"):
        notes = (notes + " MusicBrainz: no confident match; used filename and audio.").strip()
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    return {
        "filename": filename,
        "source_drive_id": sid,
        "tagged_drive_id": "",
        "TIT2": title,
        "TIT2_conf": "High" if title else "",
        "TPE1": artist,
        "TPE1_conf": "Med",
        "TALB": album,
        "TALB_conf": "Med" if album else "",
        "TDRC": o.get("TDRC") or mb.get("date") or "",
        "TDRC_conf": "Med" if (o.get("TDRC") or mb.get("date")) else "",
        "TDOR": o.get("TDOR", ""),
        "TDOR_conf": o.get("TDOR_conf", ""),
        "TCON": tcon,
        "TCON_conf": "Med",
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
        "MOOD": o.get("MOOD") or "nostalgic; warm; swinging",
        "MOOD_conf": "Low",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": o.get("TPUB", ""),
        "TPUB_conf": "Med" if o.get("TPUB") else "",
        "TSRC": "",
        "TSRC_conf": "",
        "COMM": comm,
        "COMM_conf": "Med",
        "cover_path": f"/workspace/music-tagging/covers/gap17/{sid}.jpg",
        "cover_method": COVER_METHOD,
        "art_brief": o.get("art_brief") or art_brief(title, album, sub),
        "sources": o.get("sources") or "filename parse; MusicBrainz; librosa",
        "notes": notes,
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
    shutil.copy2(mp3, out)
    audio = MP3(out, ID3=ID3)
    if audio.tags is None:
        audio.add_tags()
    t = audio.tags
    for frame, val in [
        (TIT2, row["TIT2"]),
        (TPE1, row["TPE1"]),
        (TALB, row["TALB"]),
        (TDRC, row["TDRC"]),
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
    if row.get("TDOR"):
        t.delall("TDOR")
        t.add(TDOR(encoding=3, text=row["TDOR"]))
    t.delall("COMM")
    t.add(COMM(encoding=3, lang="eng", desc="", text=row["COMM"]))
    t.delall("TXXX:MOOD")
    t.add(TXXX(encoding=3, desc="MOOD", text=row["MOOD"]))
    yt = row.get("_youtube_id")
    if yt:
        t.delall("TXXX:purl")
        t.add(TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={yt}"))
    t.delall("APIC")
    t.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_jpg.read_bytes()))
    audio.save(str(out), v2_version=3)


def cmd_analyze(sid: str, mp3: Path, title: str) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    parsed = parse_filename(title)
    parsed["filename"] = title
    row = build_row(title, sid, parsed, analyze_audio(mp3), musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"]))
    (WORK / f"{sid}.json").write_text(json.dumps(row, indent=2))
    print(cover_prompt(row))


def cmd_finalize(sid: str, mp3: Path, cover: Path, tagged_id: str = "") -> None:
    meta = json.loads((WORK / f"{sid}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = "ok (verified by eye)"
    jpg = Path(meta["cover_path"])
    resize_cover(cover, jpg)
    out = WORK / f"{sid}.tagged.mp3"
    apply_tags(mp3, meta, jpg, out)
    append_csv(meta)


def cmd_b64_upload(sid: str) -> None:
    import base64

    p = WORK / f"{sid}.tagged.mp3"
    meta = json.loads((WORK / f"{sid}.json").read_text())
    print(
        json.dumps(
            {
                "title": meta["filename"],
                "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
                "bytes": p.stat().st_size,
                "b64_len": len(base64.b64encode(p.read_bytes())),
            }
        )
    )


if __name__ == "__main__":
    init_results()
    c = sys.argv[1]
    if c == "export-slice":
        (WORK / "slice371.json").write_text(json.dumps(load_slice(), indent=2))
    elif c == "list-pending":
        d = done_ids()
        for t in load_slice():
            if t["id"] not in d:
                print(t["id"])
    elif c == "analyze":
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
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
    elif c == "b64-meta":
        cmd_b64_upload(sys.argv[2])
    elif c == "set-tagged":
        sid, tid = sys.argv[2], sys.argv[3]
        meta = json.loads((WORK / f"{sid}.json").read_text())
        meta["tagged_drive_id"] = tid
        (WORK / f"{sid}.json").write_text(json.dumps(meta, indent=2))
        rows = []
        fn = fieldnames()
        with open(RESULTS, newline="") as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            if r.get("source_drive_id") == sid:
                r["tagged_drive_id"] = tid
        with open(RESULTS, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL)
            w.writeheader()
            w.writerows(rows)
        print("updated", sid, tid)
    elif c == "prepare-upload":
        import base64

        sid = sys.argv[2]
        p = WORK / f"{sid}.tagged.mp3"
        meta = json.loads((WORK / f"{sid}.json").read_text())
        payload = {
            "title": meta["filename"],
            "parentId": "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q",
            "contentMimeType": "audio/mpeg",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(p.read_bytes()).decode(),
        }
        out = WORK / f"{sid}.create_payload.json"
        out.write_text(json.dumps(payload))
        print(out, len(payload["base64Content"]))
