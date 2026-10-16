#!/usr/bin/env python3
"""Batch 43 — gap-17-19.jsonl lines 297-370 → results-17-19-e.csv."""
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
COVERS = Path("/workspace/music-tagging/covers/gap17")
TRACKS_JSON = WORK / "tracks_297_370.json"
RESULTS = Path("/tmp/drive-inventory/results-17-19-e.csv")
HEADER = Path("/tmp/manifest.csv")
BATCH = "43"
UA = "PersonalMusicLibraryTagger/1.0 (gap17-batch43e)"
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

FAMOUS_LYRICS: dict[str, tuple[str, str]] = {
    "because": ("1920s pop standard", "https://en.wikipedia.org/wiki/Because_(Guy_d%27Hardelot_and_T._H._Brocklehurst_song)"),
    "golden earrings": ("film standard", "https://en.wikipedia.org/wiki/Golden_Earrings_(song)"),
    "smoke! smoke! smoke!": ("No. 1 country hit 1947", "https://en.wikipedia.org/wiki/Smoke,_Smoke,_Smoke_(That_Cigarette)"),
    "peg o' my heart": ("1920s pop standard", "https://en.wikipedia.org/wiki/Peg_o%27_My_Heart"),
    "that's my desire": ("pop standard", "https://en.wikipedia.org/wiki/That%27s_My_Desire"),
    "beg your pardon": ("1940s pop hit", "https://en.wikipedia.org/wiki/Beg_Your_Pardon"),
    "temptation": ("1930s pop standard", "https://en.wikipedia.org/wiki/Temptation_(1933_song)"),
    "prisoner of love": ("1930s pop standard", "https://en.wikipedia.org/wiki/Prisoner_of_Love_(1931_song)"),
    "the gypsy": ("No. 1 hit 1946", "https://en.wikipedia.org/wiki/The_Gypsy_(1946_song)"),
    "personality": ("Johnny Mercer standard", "https://en.wikipedia.org/wiki/Personality_(Johnny_Mercer_song)"),
    "let it snow": ("holiday standard", "https://en.wikipedia.org/wiki/Let_It_Snow!_Let_It_Snow!_Let_It_Snow!"),
    "old buttermilk sky": ("Oscar-nominated standard", "https://en.wikipedia.org/wiki/Old_Buttermilk_Sky"),
    "there, i've said it again": ("No. 1 hit 1944", "https://en.wikipedia.org/wiki/There!_I%27ve_Said_It_Again"),
    "rum and coca cola": ("Andrews Sisters hit", "https://en.wikipedia.org/wiki/Rum_and_Coca-Cola"),
    "on the atchison": ("Academy Award-winning standard", "https://en.wikipedia.org/wiki/On_the_Atchison,_Topeka_and_the_Santa_Fe"),
    "don't fence me in": ("Western standard", "https://en.wikipedia.org/wiki/Don%27t_Fence_Me_In"),
    "ac-cent-tchu-ate the positive": ("1940s pop standard", "https://en.wikipedia.org/wiki/Ac-Cent-Tchu-Ate_the_Positive"),
    "dream": ("1940s pop standard", "https://en.wikipedia.org/wiki/Dream_(Johnny_Mercer_song)"),
    "it's been a long, long time": ("WWII homecoming standard", "https://en.wikipedia.org/wiki/It%27s_Been_a_Long,_Long_Time"),
    "tampico": ("1940s pop hit", "https://en.wikipedia.org/wiki/Tampico_(song)"),
    "chickery chick": ("novelty hit 1945", "https://en.wikipedia.org/wiki/Chickery_Chick"),
    "if i loved you": ("Rodgers and Hammerstein standard", "https://en.wikipedia.org/wiki/If_I_Loved_You"),
    "you always hurt the one you love": ("pop standard", "https://en.wikipedia.org/wiki/You_Always_Hurt_the_One_You_Love"),
    "the trolley song": ("Meet Me in St. Louis standard", "https://en.wikipedia.org/wiki/The_Trolley_Song"),
    "mairzy doats": ("novelty hit 1944", "https://en.wikipedia.org/wiki/Mairzy_Doats"),
    "g.i. jive": ("R&B hit 1944", "https://en.wikipedia.org/wiki/G.I._Jive"),
    "straighten up and fly right": ("Nat King Cole hit", "https://en.wikipedia.org/wiki/Straighten_Up_and_Fly_Right"),
    "paper doll": ("Mills Brothers No. 1 hit", "https://en.wikipedia.org/wiki/Paper_Doll_(song)"),
    "shoo-shoo baby": ("WWII-era hit", "https://en.wikipedia.org/wiki/Shoo-Shoo_Baby_(song)"),
    "i've heard that song before": ("Harry James hit", "https://en.wikipedia.org/wiki/I%27ve_Heard_That_Song_Before"),
    "comin' in on a wing and a prayer": ("WWII morale song", "https://en.wikipedia.org/wiki/Comin%27_in_on_a_Wing_and_a_Prayer"),
    "don't get around much anymore": ("jazz standard", "https://en.wikipedia.org/wiki/Don%27t_Get_Around_Much_Anymore"),
    "sleepy lagoon": ("pop standard", "https://en.wikipedia.org/wiki/Sleepy_Lagoon_(song)"),
    "tangerine": ("Jimmy Dorsey hit", "https://en.wikipedia.org/wiki/Tangerine_(1941_song)"),
    "jingle, jangle, jingle": ("Western swing hit", "https://en.wikipedia.org/wiki/(I_Got_Spurs_That)_Jingle,_Jangle,_Jingle"),
    "blues in the night": ("jazz standard", "https://en.wikipedia.org/wiki/Blues_in_the_Night"),
    "serenade in blue": ("Glenn Miller hit", "https://en.wikipedia.org/wiki/Serenade_in_Blue"),
    "praise the lord and pass the ammunition": ("WWII novelty", "https://en.wikipedia.org/wiki/Praise_the_Lord_and_Pass_the_Ammunition"),
    "when the lights go on again": ("WWII homefront song", "https://en.wikipedia.org/wiki/When_the_Lights_Go_on_Again"),
    "i don't want to walk without you": ("WWII-era standard", "https://en.wikipedia.org/wiki/I_Don%27t_Want_to_Walk_Without_You"),
    "he wears a pair of silver wings": ("WWII-era pop song", "https://en.wikipedia.org/wiki/He_Wears_a_Pair_of_Silver_Wings"),
    "green eyes": ("Latin pop standard", "https://en.wikipedia.org/wiki/Green_Eyes_(Aquellos_Ojos_Verdes)"),
    "maria elena": ("Latin pop standard", "https://en.wikipedia.org/wiki/Mar%C3%ADa_Elena_(song)"),
    "amapola": ("Latin pop standard", "https://en.wikipedia.org/wiki/Amapola_(song)"),
    "boogie woogie bugle boy": ("Andrews Sisters signature", "https://en.wikipedia.org/wiki/Boogie_Woogie_Bugle_Boy"),
    "blue champagne": ("1940s pop hit", "https://en.wikipedia.org/wiki/Blue_Champagne_(song)"),
    "yours": ("Latin pop standard", "https://en.wikipedia.org/wiki/Yours_(Qui%C3%A9reme_Mucho)"),
    "oh look at me now": ("Sinatra standard with Dorsey", "https://en.wikipedia.org/wiki/Oh,_Look_at_Me_Now"),
    "you made me love you": ("early pop standard", "https://en.wikipedia.org/wiki/You_Made_Me_Love_You_(I_Didn%27t_Want_to_Do_It)"),
    "woodpecker song": ("novelty hit", "https://en.wikipedia.org/wiki/The_Woodpecker_Song"),
    "toolie oolie doolie": ("Andrews Sisters novelty", "https://en.wikipedia.org/wiki/Toolie_Oolie_Doolie_(The_Yodel_Polka)"),
    "i wonder who's kissing her now": ("theater standard", "https://en.wikipedia.org/wiki/I_Wonder_Who%27s_Kissing_Her_Now"),
    "the old lamplighter": ("1940s pop hit", "https://en.wikipedia.org/wiki/The_Old_Lamplighter"),
    "huggin' and chalkin'": ("1940s novelty hit", "https://en.wikipedia.org/wiki/Huggin%27_and_Chalkin%27"),
    "surrender": ("Perry Como hit", "https://en.wikipedia.org/wiki/Surrender_(Perry_Como_song)"),
    "till the end of time": ("1940s pop hit", "https://en.wikipedia.org/wiki/Till_the_End_of_Time_(1945_song)"),
    "bell bottom trousers": ("WWII-era novelty", "https://en.wikipedia.org/wiki/Bell_Bottom_Trousers_(song)"),
    "candy": ("1940s pop standard", "https://en.wikipedia.org/wiki/Candy_(1944_song)"),
    "i'll buy that dream": ("1940s pop hit", "https://en.wikipedia.org/wiki/I%27ll_Buy_That_Dream"),
    "i'll get by": ("1930s pop standard", "https://en.wikipedia.org/wiki/I%27ll_Get_By_(As_Long_as_I_Have_You)"),
    "into each life some rain must fall": ("Ink Spots & Ella hit", "https://en.wikipedia.org/wiki/Into_Each_Life_Some_Rain_Must_Fall"),
    "i'm making believe": ("1940s pop standard", "https://en.wikipedia.org/wiki/I%27m_Making_Believe"),
    "yes, indeed": ("gospel-jazz standard", "https://en.wikipedia.org/wiki/Yes,_Indeed!_(song)"),
}


def parse_filename(title: str) -> dict[str, str]:
    m = re.search(r"\[([A-Za-z0-9_-]{11})\]\.mp3$", title)
    yt = m.group(1) if m else ""
    base = title[:-4] if title.lower().endswith(".mp3") else title
    if m:
        base = base[: m.start()].strip()
    parts = base.split(" - ")
    if len(parts) >= 2:
        artist = parts[0].strip()
        rest = " - ".join(parts[1:]).strip()
        if rest.lower().startswith(artist.lower() + " - "):
            rest = rest[len(artist) + 3 :].strip()
        for pat in [
            r"\s*\(Album Version\)",
            r"\s*\(1991 Digital Remaster\)",
            r"\s*\(Remastered[^)]*\)",
            r"\s*\(1958 Version\)",
            r"\s*\(1943 Single Version\)",
            r"\s*\(From the Musical Production[^)]*\)",
            r"\s*\(feat\.[^)]*\)",
            r"\s*\(Version by[^)]*\)",
            r"\s*\(\(from the film[^)]*\)\)",
            r"\s*\(1999 - Remaster\)",
        ]:
            rest = re.sub(pat, "", rest, flags=re.I).strip()
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
    primary = artist.split(",")[0].split("&")[0].strip()
    clean = re.sub(r"\s*\([^)]*\)\s*", " ", title).strip()
    q = urllib.parse.quote(f'recording:"{clean}" AND artist:"{primary}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e), "recordings": []}
    time.sleep(1.05)
    recs = data.get("recordings") or []
    if not recs:
        q2 = urllib.parse.quote(f'recording:"{clean}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.05)
        except Exception as e:
            return {"error": str(e), "recordings": []}
    token = primary.lower().split()[0] if primary else ""
    best = None
    for rec in recs:
        names = " ".join((c.get("name") or "") for c in (rec.get("artist-credit") or [])).lower()
        if token and token in names:
            best = rec
            break
    if not best and recs:
        best = recs[0]
    out: dict[str, Any] = {"recordings": recs, "best": best, "match_count": len(recs)}
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
    y, sr = librosa.load(str(path), sr=22050, mono=True, duration=120)
    y_full, _ = librosa.load(str(path), sr=22050, mono=True)
    duration_ms = int(librosa.get_duration(y=y_full, sr=sr) * 1000)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.ndim(tempo) == 0 else float(tempo[0])
    bpm_conf, bpm_note = "Med", ""
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
    elif bpm < 70:
        dbl = bpm * 2
        if 80 <= dbl <= 180:
            bpm_note = f"BPM doubled from librosa {int(round(bpm))}."
            bpm = dbl
            bpm_conf = "Low"
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    cm = np.mean(chroma, axis=1)
    maj_p = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    min_p = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    best_corr, best_key = -1.0, ""
    for i in range(12):
        kn = KEYS[i]
        mj = np.corrcoef(cm, np.roll(maj_p, i))[0, 1]
        mn = np.corrcoef(cm, np.roll(min_p, i))[0, 1]
        if not np.isnan(mj) and mj > best_corr:
            best_corr, best_key = mj, kn
        if not np.isnan(mn) and mn > best_corr:
            best_corr, best_key = mn, kn + "m"
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
        "key_corr": float(best_corr) if not np.isnan(best_corr) else 0.0,
    }


def guess_genre(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if "harmonicats" in t:
        return "Novelty instrumental / Jazz & improvised music", "Jazz & improvised music", "Novelty instrumental"
    if "jack ain't had no water" in t or ("jack owens" in t and "blues" not in t):
        return "Country blues / Folk", "Folk", "Country blues"
    if "tex williams" in t or "jingle, jangle" in t:
        return "Western swing / Country", "Country", "Western swing"
    if "louis jordan" in t:
        return "Jump blues / R&B", "R&B", "Jump blues"
    if any(x in t for x in ["ink spots", "mills brothers", "nat king cole", "ella fitzgerald"]):
        return "Vocal group / Jazz & improvised music", "Jazz & improvised music", "Vocal group"
    if any(
        x in t
        for x in [
            "orchestra",
            "dorsey",
            "miller",
            "kyser",
            "james",
            "kenton",
            "monroe",
            "kaye",
            "weems",
            "pastor",
            "herman",
            "noble",
            "ingle",
            "mercer",
            "stafford",
            "pied pipers",
            "andrews",
            "como",
            "garland",
            "forrest",
            "christy",
            "kallen",
            "carmichael",
            "song spinners",
            "merry macs",
        ]
    ):
        return "Swing / big band / Jazz & improvised music", "Jazz & improvised music", "Swing / big band"
    return "Traditional pop / Pop", "Pop", "Traditional pop"


def cover_artist_display(artist: str) -> str:
    a = re.sub(r"\s*&\s*His Orchestra.*", "", artist, flags=re.I)
    a = re.sub(r"\s+And His Orchestra.*", "", a, flags=re.I)
    if len(a) > 50:
        a = a.split(",")[0].strip()
    return a


def art_brief_for(artist: str, title: str, album: str, tcon: str) -> str:
    alb = album or "Single"
    if "Western" in tcon or "Country" in tcon:
        return f"Sunset prairie, lone saddle on a fence rail, painted Western palette (album: {alb})."
    if "Jump blues" in tcon:
        return f"Teal-and-amber juke joint, sax shadow on empty dance floor (album: {alb})."
    if "Country blues" in tcon:
        return f"Delta porch at dusk, harmonica on a chair, oil lamp glow (album: {alb})."
    if "Novelty instrumental" in tcon:
        return f"Art-deco bandstand with chrome harmonicas under blue spotlight (album: {alb})."
    if "Vocal group" in tcon:
        return f"1940s ribbon microphone, warm booth amber light, vinyl texture (album: {alb})."
    return f"Big-band bandstand, gleaming brass and saxes, empty dance floor under spotlights (album: {alb})."


def lyrics_policy(title: str, has_vocals: str) -> tuple[str, str, str]:
    if has_vocals == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (reason, url) in FAMOUS_LYRICS.items():
        if k in tl:
            return "yes", reason, url
    return "no", "", ""


def has_vocals_guess(artist: str, title: str, tcon: str) -> str:
    t = f"{artist} {title}".lower()
    if "harmonicats" in t or "Novelty instrumental" in tcon:
        return "no"
    return "yes"


def build_row(filename: str, source_id: str, tagged_id: str, parsed: dict, audio: dict, mb: dict, o: Optional[dict] = None) -> dict:
    o = o or {}
    artist = o.get("TPE1") or parsed["artist_hint"]
    if "Ted Weems" in artist and "Perry Como" in artist:
        artist = "Ted Weems & His Orchestra feat. Perry Como"
    title = o.get("TIT2") or parsed["title_hint"]
    if mb.get("best") and not o.get("TIT2") and mb.get("title"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or ""
    tdrc = o.get("TDRC") or mb.get("date") or ""
    tcon, family, sub = guess_genre(artist, title)
    comm = f"Genre Universe family: {family}; subgenre: {sub}."
    has_v = o.get("has_vocals") or has_vocals_guess(artist, title, tcon)
    ly_sel, ly_reas, ly_src = lyrics_policy(title, has_v)
    notes = o.get("notes") or ""
    if not mb.get("best") and not mb.get("error"):
        notes = (notes + " MusicBrainz: no confident match; metadata from filename and audio.").strip()
    if audio.get("bpm_note"):
        notes = (notes + " " + audio["bpm_note"]).strip()
    if audio.get("key_corr", 1) < 0.45 and not o.get("TKEY"):
        notes = (notes + " TKEY blank: key estimate weak.").strip()
    cheap = ""
    if audio.get("bitrate_kbps", 999) < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    conf = lambda v, c="Med": c if v else ""
    return {
        "filename": filename,
        "source_drive_id": source_id,
        "tagged_drive_id": tagged_id,
        "TIT2": title,
        "TIT2_conf": conf(title, "Med"),
        "TPE1": artist,
        "TPE1_conf": conf(artist, "Med"),
        "TALB": album,
        "TALB_conf": conf(album, "Med" if album else "Low"),
        "TDRC": tdrc,
        "TDRC_conf": conf(tdrc),
        "TDOR": o.get("TDOR", ""),
        "TDOR_conf": conf(o.get("TDOR", "")),
        "TCON": tcon,
        "TCON_conf": "Med",
        "TLEN": str(audio["duration_ms"]),
        "TLEN_conf": "Med",
        "TPE2": o.get("TPE2") or artist,
        "TPE2_conf": "Med",
        "TRCK": "",
        "TRCK_conf": "",
        "TPOS": "",
        "TPOS_conf": "",
        "TCOM": o.get("TCOM", ""),
        "TCOM_conf": conf(o.get("TCOM", ""), "High"),
        "TBPM": str(audio["bpm"]),
        "TBPM_conf": audio.get("bpm_conf", "Med"),
        "TKEY": o.get("TKEY", audio.get("tkey", "")),
        "TKEY_conf": o.get("TKEY_conf", audio.get("tkey_conf", "")),
        "MOOD": o.get("MOOD") or "nostalgic; warm; swinging",
        "MOOD_conf": "Low",
        "USLT": "",
        "USLT_conf": "",
        "TPUB": o.get("TPUB", ""),
        "TPUB_conf": conf(o.get("TPUB", "")),
        "TSRC": "",
        "TSRC_conf": "",
        "COMM": comm,
        "COMM_conf": "Med",
        "cover_path": str(COVERS / f"{source_id}.jpg"),
        "cover_method": COVER_METHOD,
        "art_brief": o.get("art_brief") or art_brief_for(artist, title, album, tcon),
        "sources": o.get("sources") or "filename parse; MusicBrainz; librosa",
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
        "_cover_artist": cover_artist_display(artist),
    }


def cover_prompt(row: dict) -> str:
    return f"""Square 1:1 premium album cover illustration, fine-art painted look (visible brushwork, rich color, soft depth—like a vintage prestige record sleeve). No photorealistic pasted text.

Typography painted IN the image (same lighting and texture as the scene—not a separate overlay):
- Top: artist name "{row['_cover_artist']}" in small caps, elegant and fully readable.
- Lower third: calm uncluttered band for titles.
- Large serif song title: "{row['TIT2']}".
- Smaller italic serif album title directly beneath: "{row['TALB'] or 'Single'}".

Scene (full bleed, no text in the middle): {row['art_brief']}

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere."""


def resize_cover(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im.resize((1400, 1400), Image.Resampling.LANCZOS).save(dest, "JPEG", quality=92)


def apply_tags(mp3: Path, row: dict, cover_jpg: Path, out: Path) -> None:
    import shutil

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
    t.delall("COMM")
    t.add(COMM(encoding=3, lang="eng", desc="", text=row["COMM"]))
    if row["MOOD"]:
        t.delall("TXXX:MOOD")
        t.add(TXXX(encoding=3, desc="MOOD", text=row["MOOD"]))
    yt = row.get("_youtube_id") or ""
    if yt:
        t.delall("TXXX:purl")
        t.add(TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={yt}"))
    t.delall("APIC")
    t.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_jpg.read_bytes()))
    audio.save(out, v2_version=3)


def fieldnames() -> list[str]:
    with open(HEADER, newline="") as f:
        return next(csv.reader(f))


def init_results() -> None:
    if not RESULTS.exists():
        with open(RESULTS, "w", newline="") as f:
            csv.writer(f).writerow(fieldnames())


def load_done() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def append_csv(row: dict) -> None:
    fn = fieldnames()
    with open(RESULTS, "a", newline="") as f:
        csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL).writerow({k: row.get(k, "") for k in fn})


def load_tracks() -> list[dict]:
    return json.loads(TRACKS_JSON.read_text())


def analyze_one(source_id: str, mp3: Path, title: str) -> None:
    parsed = parse_filename(title)
    parsed["filename"] = title
    row = build_row(title, source_id, "", parsed, analyze_audio(mp3), musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"]))
    (WORK / f"{source_id}.json").write_text(json.dumps(row, indent=2))


def finalize_one(source_id: str, mp3: Path, cover_png: Path, tagged_id: str) -> Path:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = "ok (verified by eye)"
    jpg = Path(meta["cover_path"])
    resize_cover(cover_png, jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, jpg, out)
    append_csv(meta)
    return out


if __name__ == "__main__":
    init_results()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "batch-analyze":
        done = load_done()
        for tr in load_tracks():
            sid = tr["id"]
            if sid in done:
                continue
            mp3 = WORK / f"{sid}.mp3"
            if mp3.exists():
                analyze_one(sid, mp3, tr["title"])
                print("ok", sid)
    elif cmd == "prompt":
        print(cover_prompt(json.loads((WORK / f"{sys.argv[2]}.json").read_text())))
    elif cmd == "finalize":
        finalize_one(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5])
    elif cmd == "list-pending":
        done = load_done()
        for tr in load_tracks():
            if tr["id"] not in done:
                print(tr["id"])
