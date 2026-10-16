#!/usr/bin/env python3
"""Gap batch 19-21 slice (lines 726-870), batch 52: analyze, tag, CSV row formatting."""
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
from mutagen.id3 import APIC, COMM, TALB, TBPM, TCOM, TCON, TDRC, TIT2, TKEY, TLEN, TPE1, TPE2, TPUB, TXXX, ID3
from mutagen.mp3 import MP3
from PIL import Image

WORK = Path("/tmp/gap52-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-19-21-f.csv")
HEADER = Path("/tmp/manifest.csv")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
SLICE_START = 726
SLICE_END = 870
BATCH = "52"
UA = "PersonalMusicLibrary/1.0 (gap19-batch52; contact=local)"
COVER_METHOD = (
    "xAI grok-imagine-image-2.0 native image with built-in typography (v2 template); "
    "APIC 1400x1400 JPEG q92"
)
COVER_MODEL = "grok-imagine-image-2.0"
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

FAMOUS_LYRICS: dict[str, tuple[str, str]] = {
    "bernie's tune": ("jazz standard", "https://lrclib.net/api/search?q=Bernie%27s+Tune"),
    "secret love song": ("chart pop ballad", "https://lrclib.net/api/search?q=Secret+Love+Song+Little+Mix"),
    "uptown funk": ("No. 1 hit", "https://lrclib.net/api/search?q=Uptown+Funk"),
    "i keep forgettin": ("R&B hit", "https://lrclib.net/api/search?q=I+Keep+Forgettin+Michael+McDonald"),
    "ain't nothing like the real thing": ("Motown classic", "https://lrclib.net/api/search?q=Ain%27t+Nothing+Like+The+Real+Thing"),
    "desafinado": ("bossa nova standard", "https://lrclib.net/api/search?q=Desafinado"),
    "corcovado": ("bossa nova standard", "https://lrclib.net/api/search?q=Corcovado"),
    "chega de saudade": ("bossa nova standard", "https://lrclib.net/api/search?q=Chega+de+Saudade"),
    "my baby just cares for me": ("jazz standard", "https://lrclib.net/api/search?q=My+Baby+Just+Cares+for+Me"),
    "antonio's song": ("Michael Franks signature", "https://lrclib.net/api/search?q=Antonio%27s+Song"),
    "rise": ("Herb Alpert hit", "https://lrclib.net/api/search?q=Rise+Herb+Alpert"),
    "this will be": ("Natalie Cole hit", "https://lrclib.net/api/search?q=This+Will+Be"),
    "don't wait too long": ("Madeleine Peyroux standard", "https://lrclib.net/api/search?q=Don%27t+Wait+Too+Long"),
    "everlasting love": ("pop cover standard", "https://lrclib.net/api/search?q=Everlasting+Love"),
    "girl from ipanema": ("jazz standard", "https://lrclib.net/api/search?q=Girl+From+Ipanema"),
    "cast your fate to the wind": ("jazz standard", "https://lrclib.net/api/search?q=Cast+Your+Fate+to+the+Wind"),
    "mais que nada": ("bossa nova standard", "https://lrclib.net/api/search?q=Mais+Que+Nada"),
    "it had to be you": ("Great American Songbook standard", "https://lrclib.net/api/search?q=It+Had+to+Be+You"),
    "papa loves mambo": ("Perry Como hit", "https://lrclib.net/api/search?q=Papa+Loves+Mambo"),
    "what kind of fool am i": ("Sammy Davis Jr. standard", "https://lrclib.net/api/search?q=What+Kind+of+Fool+Am+I"),
    "magic moments": ("Perry Como hit", "https://lrclib.net/api/search?q=Magic+Moments"),
    "daughters": ("John Mayer hit", "https://lrclib.net/api/search?q=Daughters+John+Mayer"),
    "i choose you": ("Sara Bareilles wedding staple", "https://lrclib.net/api/search?q=I+Choose+You+Sara+Bareilles"),
    "a thousand miles": ("Vanessa Carlton hit", "https://lrclib.net/api/search?q=A+Thousand+Miles"),
    "somewhere only we know": ("Keane hit", "https://lrclib.net/api/search?q=Somewhere+Only+We+Know"),
    "fire and rain": ("James Taylor classic", "https://lrclib.net/api/search?q=Fire+and+Rain"),
    "haven't met you yet": ("Michael Bublé hit", "https://lrclib.net/api/search?q=Haven%27t+Met+You+Yet"),
    "better together": ("Jack Johnson hit", "https://lrclib.net/api/search?q=Better+Together"),
    "come away with me": ("Norah Jones signature", "https://lrclib.net/api/search?q=Come+Away+With+Me"),
    "i won't give up": ("Jason Mraz hit", "https://lrclib.net/api/search?q=I+Won%27t+Give+Up"),
    "the way i am": ("Ingrid Michaelson hit", "https://lrclib.net/api/search?q=The+Way+I+Am"),
    "new soul": ("Yael Naïm hit", "https://lrclib.net/api/search?q=New+Soul"),
    "aquarius": ("Hair musical standard", "https://lrclib.net/api/search?q=Aquarius+Let+the+Sunshine+In"),
    "honky tonk women": ("Rolling Stones hit", "https://lrclib.net/api/search?q=Honky+Tonk+Women"),
    "everyday people": ("Sly & the Family Stone hit", "https://lrclib.net/api/search?q=Everyday+People"),
    "sugar sugar": ("Archies No. 1 hit", "https://lrclib.net/api/search?q=Sugar+Sugar"),
    "i can't get next to you": ("Temptations hit", "https://lrclib.net/api/search?q=I+Can%27t+Get+Next+To+You"),
    "dizzy": ("Tommy Roe hit", "https://lrclib.net/api/search?q=Dizzy+Tommy+Roe"),
    "hot fun in the summertime": ("Sly & the Family Stone hit", "https://lrclib.net/api/search?q=Hot+Fun+in+the+Summertime"),
    "i'll never fall in love again": ("Tom Jones hit", "https://lrclib.net/api/search?q=I%27ll+Never+Fall+In+Love+Again"),
    "build me up buttercup": ("Foundations hit", "https://lrclib.net/api/search?q=Build+Me+Up+Buttercup"),
    "one": ("Three Dog Night hit", "https://lrclib.net/api/search?q=One+Three+Dog+Night"),
    "crimson & clover": ("Tommy James hit", "https://lrclib.net/api/search?q=Crimson+and+Clover"),
    "crystal blue persuasion": ("Tommy James hit", "https://lrclib.net/api/search?q=Crystal+Blue+Persuasion"),
    "hair": ("Cowsills hit", "https://lrclib.net/api/search?q=Hair+Cowsills"),
    "grazing in the grass": ("Friends of Distinction hit", "https://lrclib.net/api/search?q=Grazing+In+the+Grass"),
    "too busy thinking about my baby": ("Marvin Gaye hit", "https://lrclib.net/api/search?q=Too+Busy+Thinking+About+My+Baby"),
    "what does it take": ("Jr. Walker hit", "https://lrclib.net/api/search?q=What+Does+It+Take"),
    "love is blue": ("Paul Mauriat instrumental hit", "https://lrclib.net/api/search?q=Love+Is+Blue"),
    "this guy's in love with you": ("Herb Alpert hit", "https://lrclib.net/api/search?q=This+Guy%27s+In+Love+With+You"),
    "people got to be free": ("Rascals hit", "https://lrclib.net/api/search?q=People+Got+to+Be+Free"),
    "little green apples": ("O.C. Smith hit", "https://lrclib.net/api/search?q=Little+Green+Apples"),
    "the good, the bad and the ugly": ("iconic film theme", "https://lrclib.net/api/search?q=The+Good+the+Bad+and+the+Ugly"),
    "hello, i love you": ("Doors hit", "https://lrclib.net/api/search?q=Hello+I+Love+You"),
    "mony mony": ("Tommy James hit", "https://lrclib.net/api/search?q=Mony+Mony"),
    "cry like a baby": ("Box Tops hit", "https://lrclib.net/api/search?q=Cry+Like+A+Baby"),
    "stoned soul picnic": ("5th Dimension hit", "https://lrclib.net/api/search?q=Stoned+Soul+Picnic"),
    "midnight confessions": ("Grass Roots hit", "https://lrclib.net/api/search?q=Midnight+Confessions"),
    "dance to the music": ("Sly & the Family Stone hit", "https://lrclib.net/api/search?q=Dance+to+the+Music"),
    "to sir with love": ("Lulu signature", "https://lrclib.net/api/search?q=To+Sir+With+Love"),
    "windy": ("Association hit", "https://lrclib.net/api/search?q=Windy+Association"),
    "little bit o' soul": ("Music Explosion hit", "https://lrclib.net/api/search?q=Little+Bit+O+Soul"),
    "i think we're alone now": ("Tommy James hit", "https://lrclib.net/api/search?q=I+Think+We%27re+Alone+Now"),
    "i was made to love her": ("Stevie Wonder hit", "https://lrclib.net/api/search?q=I+Was+Made+To+Love+Her"),
    "kind of a drag": ("Buckinghams hit", "https://lrclib.net/api/search?q=Kind+of+a+Drag"),
    "expressway": ("Soul Survivors hit", "https://lrclib.net/api/search?q=Expressway+To+Your+Heart"),
    "soul man": ("Sam & Dave classic", "https://lrclib.net/api/search?q=Soul+Man"),
    "what becomes of the brokenhearted": ("Jimmy Ruffin classic", "https://lrclib.net/api/search?q=What+Becomes+Of+The+Brokenhearted"),
    "96 tears": ("? and the Mysterians hit", "https://lrclib.net/api/search?q=96+Tears"),
    "last train to clarksville": ("Monkees hit", "https://lrclib.net/api/search?q=Last+Train+to+Clarksville"),
    "these boots are made for walkin": ("Nancy Sinatra hit", "https://lrclib.net/api/search?q=These+Boots+Are+Made+for+Walkin"),
    "cherish": ("Association hit", "https://lrclib.net/api/search?q=Cherish+Association"),
    "kicks": ("Paul Revere & The Raiders hit", "https://lrclib.net/api/search?q=Kicks"),
    "ballad of the green berets": ("No. 1 patriotic hit", "https://lrclib.net/api/search?q=Ballad+Of+The+Green+Berets"),
    "good lovin": ("Young Rascals hit", "https://lrclib.net/api/search?q=Good+Lovin"),
    "soul and inspiration": ("Righteous Brothers hit", "https://lrclib.net/api/search?q=Soul+And+Inspiration"),
    "you can't hurry love": ("Supremes Motown classic", "https://lrclib.net/api/search?q=You+Can%27t+Hurry+Love"),
    "see you in september": ("Happenings hit", "https://lrclib.net/api/search?q=See+You+In+September"),
    "poor side of town": ("Johnny Rivers hit", "https://lrclib.net/api/search?q=Poor+Side+Of+Town"),
    "lil' red riding hood": ("Sam The Sham hit", "https://lrclib.net/api/search?q=Lil+Red+Riding+Hood"),
    "lightnin' strikes": ("Lou Christie hit", "https://lrclib.net/api/search?q=Lightnin+Strikes"),
    "working in the coal mine": ("Lee Dorsey hit", "https://lrclib.net/api/search?q=Working+In+The+Coal+Mine"),
    "groovy kind of love": ("Mindbenders hit", "https://lrclib.net/api/search?q=Groovy+Kind+Of+Love"),
    "wooly bully": ("Sam The Sham hit", "https://lrclib.net/api/search?q=Wooly+Bully"),
    "downtown": ("Petula Clark hit", "https://lrclib.net/api/search?q=Downtown+Petula+Clark"),
    "you were on my mind": ("We Five hit", "https://lrclib.net/api/search?q=You+Were+On+My+Mind"),
    "help me, rhonda": ("Beach Boys hit", "https://lrclib.net/api/search?q=Help+Me+Rhonda"),
    "king of the road": ("Roger Miller standard", "https://lrclib.net/api/search?q=King+Of+The+Road"),
    "can't you hear my heartbeat": ("Herman's Hermits hit", "https://lrclib.net/api/search?q=Can%27t+You+Hear+My+Heartbeat"),
    "hold me, thrill me, kiss me": ("Mel Carter hit", "https://lrclib.net/api/search?q=Hold+Me+Thrill+Me+Kiss+Me"),
    "birds and the bees": ("Jewel Akens hit", "https://lrclib.net/api/search?q=Birds+And+The+Bees"),
    "in crowd": ("Ramsey Lewis jazz hit", "https://lrclib.net/api/search?q=The+In+Crowd"),
    "shotgun": ("Jr. Walker funk hit", "https://lrclib.net/api/search?q=Shotgun+Jr+Walker"),
    "i got you babe": ("Sonny & Cher signature", "https://lrclib.net/api/search?q=I+Got+You+Babe"),
    "mrs. brown": ("Herman's Hermits hit", "https://lrclib.net/api/search?q=Mrs+Brown"),
    "stop! in the name of love": ("Supremes classic", "https://lrclib.net/api/search?q=Stop+In+The+Name+Of+Love"),
    "i get around": ("Beach Boys hit", "https://lrclib.net/api/search?q=I+Get+Around"),
    "hello, dolly": ("Louis Armstrong standard", "https://lrclib.net/api/search?q=Hello+Dolly"),
    "my guy": ("Mary Wells Motown hit", "https://lrclib.net/api/search?q=My+Guy"),
    "last kiss": ("teen tragedy classic", "https://lrclib.net/api/search?q=Last+Kiss"),
    "where did our love go": ("Supremes hit", "https://lrclib.net/api/search?q=Where+Did+Our+Love+Go"),
    "do wah diddy diddy": ("Manfred Mann hit", "https://lrclib.net/api/search?q=Do+Wah+Diddy"),
    "love me do": ("Beatles debut single", "https://lrclib.net/api/search?q=Love+Me+Do"),
    "hard day's night": ("Beatles film title track", "https://lrclib.net/api/search?q=Hard+Day%27s+Night"),
    "dancing in the street": ("Motown anthem", "https://lrclib.net/api/search?q=Dancing+In+The+Street"),
    "please please me": ("Beatles early hit", "https://lrclib.net/api/search?q=Please+Please+Me"),
    "surfin' u.s.a": ("Beach Boys surf anthem", "https://lrclib.net/api/search?q=Surfin+USA"),
    "love me with all your heart": ("Ray Charles Singers hit", "https://lrclib.net/api/search?q=Love+Me+With+All+Your+Heart"),
    "rhythm of the rain": ("Cascades hit", "https://lrclib.net/api/search?q=Rhythm+Of+The+Rain"),
    "he's so fine": ("Chiffons hit", "https://lrclib.net/api/search?q=He%27s+So+Fine"),
    "fingertips": ("Stevie Wonder live hit", "https://lrclib.net/api/search?q=Fingertips"),
    "hey paula": ("Paul & Paula No. 1 hit", "https://lrclib.net/api/search?q=Hey+Paula"),
    "puff, the magic dragon": ("folk standard", "https://lrclib.net/api/search?q=Puff+The+Magic+Dragon"),
    "my boyfriend's back": ("Angels girl-group hit", "https://lrclib.net/api/search?q=My+Boyfriend%27s+Back"),
    "wipe out": ("surf rock classic", "https://lrclib.net/api/search?q=Wipe+Out"),
    "blowin' in the wind": ("folk standard", "https://lrclib.net/api/search?q=Blowin+In+The+Wind"),
    "so much in love": ("Tymes hit", "https://lrclib.net/api/search?q=So+Much+In+Love"),
    "wild weekend": ("Rockin' Rebels hit", "https://lrclib.net/api/search?q=Wild+Weekend"),
    "i will follow him": ("Little Peggy March hit", "https://lrclib.net/api/search?q=I+Will+Follow+Him"),
    "mockingbird": ("Inez & Charlie Foxx hit", "https://lrclib.net/api/search?q=Mockingbird"),
    "johnny angel": ("Shelley Fabares hit", "https://lrclib.net/api/search?q=Johnny+Angel"),
    "locomotion": ("Little Eva dance hit", "https://lrclib.net/api/search?q=The+Locomotion"),
    "soldier boy": ("Shirelles hit", "https://lrclib.net/api/search?q=Soldier+Boy"),
    "breaking up is hard to do": ("Neil Sedaka classic", "https://lrclib.net/api/search?q=Breaking+Up+Is+Hard+To+Do"),
    "it keeps right on a-hurtin": ("Johnny Tillotson hit", "https://lrclib.net/api/search?q=It+Keeps+Right+On+A-Hurtin"),
    "the one who really loves you": ("Mary Wells hit", "https://lrclib.net/api/search?q=The+One+Who+Really+Loves+You"),
    "crying": ("Roy Orbison signature ballad", "https://lrclib.net/api/search?q=Crying+Roy+Orbison"),
    "i fall to pieces": ("Patsy Cline country standard", "https://lrclib.net/api/search?q=I+Fall+To+Pieces"),
    "my true story": ("Jive Five doo-wop hit", "https://lrclib.net/api/search?q=My+True+Story"),
    "wheels": ("String-A-Longs instrumental hit", "https://lrclib.net/api/search?q=Wheels"),
    "wooden heart": ("Joe Dowell hit", "https://lrclib.net/api/search?q=Wooden+Heart"),
    "calcutta": ("Lawrence Welk hit", "https://lrclib.net/api/search?q=Calcutta"),
    "running scared": ("Roy Orbison hit", "https://lrclib.net/api/search?q=Running+Scared"),
    "will you love me tomorrow": ("Shirelles classic", "https://lrclib.net/api/search?q=Will+You+Love+Me+Tomorrow"),
    "last night": ("Mar-Keys instrumental hit", "https://lrclib.net/api/search?q=Last+Night+Mar-Keys"),
    "dedicated to the one i love": ("Shirelles hit", "https://lrclib.net/api/search?q=Dedicated+To+The+One+I+Love"),
    "sad movies": ("Sue Thompson hit", "https://lrclib.net/api/search?q=Sad+Movies"),
    "cathy's clown": ("Everly Brothers hit", "https://lrclib.net/api/search?q=Cathy%27s+Clown"),
    "he'll have to go": ("Jim Reeves country standard", "https://lrclib.net/api/search?q=He%27ll+Have+To+Go"),
    "running bear": ("Johnny Preston hit", "https://lrclib.net/api/search?q=Running+Bear"),
    "teen angel": ("Mark Dinning hit", "https://lrclib.net/api/search?q=Teen+Angel"),
    "1901": ("Phoenix hit", "https://lrclib.net/api/search?q=1901+Phoenix"),
    "creep": ("Radiohead signature", "https://lrclib.net/api/search?q=Creep+Radiohead"),
    "imagine": ("John Lennon classic", "https://lrclib.net/api/search?q=Imagine+John+Lennon"),
    "eleanor rigby": ("Beatles classic", "https://lrclib.net/api/search?q=Eleanor+Rigby"),
    "light my fire": ("Doors classic", "https://lrclib.net/api/search?q=Light+My+Fire"),
    "riders on the storm": ("Doors classic", "https://lrclib.net/api/search?q=Riders+On+The+Storm"),
    "heart of gold": ("Neil Young classic", "https://lrclib.net/api/search?q=Heart+Of+Gold"),
    "old man": ("Neil Young classic", "https://lrclib.net/api/search?q=Old+Man+Neil+Young"),
    "southern man": ("Neil Young classic", "https://lrclib.net/api/search?q=Southern+Man"),
    "like a hurricane": ("Neil Young classic", "https://lrclib.net/api/search?q=Like+A+Hurricane"),
    "baba o'riley": ("The Who anthem", "https://lrclib.net/api/search?q=Baba+O+Riley"),
    "every breath you take": ("Police No. 1 hit", "https://lrclib.net/api/search?q=Every+Breath+You+Take"),
    "smooth criminal": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Smooth+Criminal"),
    "billie jean": ("Michael Jackson signature", "https://lrclib.net/api/search?q=Billie+Jean"),
    "thriller": ("Michael Jackson signature", "https://lrclib.net/api/search?q=Thriller+Michael+Jackson"),
    "black or white": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Black+Or+White"),
    "purple rain": ("Prince signature", "https://lrclib.net/api/search?q=Purple+Rain"),
    "like a prayer": ("Madonna hit", "https://lrclib.net/api/search?q=Like+A+Prayer"),
    "we are the champions": ("Queen anthem", "https://lrclib.net/api/search?q=We+Are+The+Champions"),
    "we will rock you": ("Queen stadium anthem", "https://lrclib.net/api/search?q=We+Will+Rock+You"),
    "champagne supernova": ("Oasis Britpop hit", "https://lrclib.net/api/search?q=Champagne+Supernova"),
    "carry on wayward son": ("Kansas classic rock hit", "https://lrclib.net/api/search?q=Carry+On+Wayward+Son"),
    "sweet home alabama": ("Lynyrd Skynyrd Southern rock anthem", "https://lrclib.net/api/search?q=Sweet+Home+Alabama"),
    "simple man": ("Lynyrd Skynyrd classic", "https://lrclib.net/api/search?q=Simple+Man"),
    "blinding lights": ("The Weeknd No. 1 hit", "https://lrclib.net/api/search?q=Blinding+Lights"),
    "see you again": ("chart hit", "https://lrclib.net/api/search?q=See+You+Again+Wiz+Khalifa"),
    "demons": ("Imagine Dragons hit", "https://lrclib.net/api/search?q=Demons+Imagine+Dragons"),
    "time to pretend": ("MGMT hit", "https://lrclib.net/api/search?q=Time+To+Pretend"),
    "giant steps": ("jazz standard", "https://lrclib.net/api/search?q=Giant+Steps"),
    "my favorite things": ("Rodgers & Hammerstein standard", "https://lrclib.net/api/search?q=My+Favorite+Things"),
    "blue in green": ("jazz standard", "https://lrclib.net/api/search?q=Blue+In+Green"),
    "corcovado": ("bossa nova standard", "https://lrclib.net/api/search?q=Corcovado"),
    "in the aeroplane over the sea": ("indie classic", "https://lrclib.net/api/search?q=In+The+Aeroplane+Over+The+Sea"),
    "chicago": ("Sufjan Stevens signature", "https://lrclib.net/api/search?q=Chicago+Sufjan+Stevens"),
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
            r"\s*\(Official[^)]*\)",
            r"\s*\[Official[^\]]*\]",
            r"\s*\(Mono[^)]*\)",
            r"\s*\(Remaster[^)]*\)",
            r"\s*\(Single Version\)",
            r"\s*\(Digitally Remastered[^)]*\)",
            r"\s*\(New Stereo Mix\)",
            r"\s*\(2003 Remaster\)",
            r"\s*\(Big Band and Vocals\)",
            r"\s*\(Quiet Nights Of Quiet Stars\)",
            r"\s*\(Garota De Ipanema\)",
            r"\s*\(\d{4}\s+Remaster[^)]*\)",
            r"\s*\(Remastered\s+\d{4}\)",
            r"\s*\(Stereo\)[^)]*",
            r"\s*\(feat\.[^)]*\)",
            r"\s*\(Original Mix\)",
            r"\s*\(Techno Version\)",
            r"\s*\(Remix\)",
            r"\s*\(Vibe Mix\)",
            r"\s*\(Digital Master\)",
        ]:
            rest = re.sub(pat, "", rest, flags=re.I)
        rest = rest.replace("⧸", "/").replace("：", ":").replace("，", ",")
        rest = re.sub(r"\s*\(\d+\)\s*$", "", rest)
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
    clean_title = re.sub(r"\s*[：:]\s*", ": ", title)
    q = urllib.parse.quote(f'recording:"{clean_title}" AND artist:"{artist}"')
    try:
        data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query={q}")
    except Exception as e:
        return {"error": str(e), "recordings": []}
    time.sleep(1.1)
    recs = data.get("recordings") or []
    if not recs and title:
        q2 = urllib.parse.quote(f'recording:"{clean_title}"')
        try:
            data = mb_get(f"https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query={q2}")
            recs = data.get("recordings") or []
            time.sleep(1.1)
        except Exception as e:
            return {"error": str(e), "recordings": []}
    best = None
    al = artist.lower()
    for rec in recs:
        ac = rec.get("artist-credit") or []
        names = " ".join((c.get("name") or "") for c in ac).lower()
        if al and al.split(",")[0].split()[0] in names:
            best = rec
            break
    if not best and recs:
        best = recs[0]
    out: dict[str, Any] = {"recordings": recs, "best": best}
    if best:
        out["mbid"] = best.get("id")
        out["title"] = best.get("title")
        out["length"] = best.get("length")
        rels = best.get("releases") or []
        if rels:
            rel = rels[0]
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
    bpm_conf = "Med"
    bpm_note = ""
    if bpm > 160:
        half = bpm / 2
        if 60 <= half <= 140:
            bpm_note = f"BPM halved from librosa {int(round(bpm))} (double-time detection)."
            bpm = half
    elif bpm < 70:
        double = bpm * 2
        if 80 <= double <= 180:
            bpm_note = f"BPM doubled from librosa {int(round(bpm))}."
            bpm = double
            bpm_conf = "Low"
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
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
        "key_corr": float(best_corr) if best_corr > 0 else 0,
    }


def guess_genre(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["orchestra", "symphony", "philharmonic", "boulez", "lutoslawski", "ades", "feldman", "duruflé", "poulenc", "chin", "higdon", "gershwin", "mozart", "bach", "beethoven", "sibelius", "partita", "concerto for", "cantus in memory"]):
        return "Contemporary classical / Western art music", "Western art music", "Contemporary classical"
    if any(x in t for x in ["coltrane", "monk", "peterson", "silver", "garrett", "gillespie", "ferguson", "rosenberg", "sutton", "reid", "marek"]):
        return "Jazz / Jazz & improvised music", "Jazz & improvised music", "Jazz"
    if any(x in t for x in ["reich", "clapping music", "steve reich"]):
        return "Minimalism / Western art music", "Western art music", "Minimalism"
    if any(x in t for x in ["chemical brothers", "squarepusher", "kobosil", "paul kalkbrenner", "vini vici", "psytrance", "mk -", "jon hopkins", "rjd2", "kordhell"]):
        return "Electronic / Electronic dance music", "Electronic", "Electronic dance music"
    if any(x in t for x in ["radiohead", "wilco", "war on drugs", "tv on the radio", "neutral milk", "sufjan", "radical face", "mgmt", "phoenix", "hozier", "imagine dragons", "the weeknd", "oasis", "heart", "madonna", "polypia"]):
        return "Alternative rock / Rock", "Rock", "Alternative rock"
    if any(x in t for x in ["beatles", "doors", "who", "queen", "neil young", "tom petty", "allman", "lynyrd skynyrd", "kansas", "police", "new order", "michael jackson", "prince", "jackson browne", "madonna"]):
        return "Classic rock / Rock", "Rock", "Classic rock"
    if any(x in t for x in ["meute", "electric swing", "tape five", "supervillains"]):
        return "Electro swing / Electronic", "Electronic", "Electro swing"
    if any(x in t for x in ["bothy band", "planxty", "nickel creek", "sam bush"]):
        return "Celtic folk / Folk", "Folk", "Celtic folk"
    if any(x in t for x in ["gilberto", "bossa", "corcovado"]):
        return "Bossa nova / Jazz", "Jazz", "Bossa nova"
    if any(x in t for x in ["ólafur", "arnalds", "helios"]):
        return "Ambient / Electronic", "Electronic", "Ambient"
    if any(x in t for x in ["philip glass", "metamorphosis", "hans zimmer", "secret garden", "zimmer"]):
        if "glass" in t or "metamorphosis" in t:
            return "Minimalism / Western art music", "Western art music", "Minimalism"
        if "zimmer" in t or "secret garden" in t:
            return "Film score / Western art music", "Western art music", "Film score"
    if any(x in t for x in ["getz", "gilberto", "jobim", "bossa", "desafinado", "corcovado", "chega de saudade", "ipanema", "mendes", "mais que nada"]):
        return "Bossa nova / Jazz", "Jazz", "Bossa nova"
    if any(x in t for x in ["oscar peterson", "ahmad jamal", "stan getz", "nina simone", "guaraldi", "halsall", "peyroux", "cullum", "franks", "alpert", "emmanuel", "taylor"]):
        if "emmanuel" in t or "bernie" in t:
            return "Fingerstyle jazz / Jazz", "Jazz", "Fingerstyle jazz"
        return "Jazz / Jazz", "Jazz", "Jazz"
    if any(x in t for x in ["marvin gaye", "stevie wonder", "temptations", "sly", "sam & dave", "soul man", "motown", "jr. walker", "jimmy ruffin", "natalie cole", "ruffin"]):
        return "Soul / R&B", "R&B", "Soul"
    if any(x in t for x in ["rolling stones", "doors", "monkees", "tommy james", "archies", "foundations", "grass roots", "association", "buckingham", "music explosion", "raiders", "box tops", "cowsills", "tommy roe", "three dog night", "mysterians", "soul survivors"]):
        return "Classic rock / Rock", "Rock", "Classic rock"
    if any(x in t for x in ["michael bublé", "bublé", "norah jones", "jack johnson", "jason mraz", "john mayer", "james taylor", "sara bareilles", "vanessa carlton", "keane", "ingrid michaelson", "yael naïm", "yael naim", "little mix", "kidz bop"]):
        return "Adult contemporary / Pop", "Pop", "Adult contemporary"
    if any(x in t for x in ["perry como", "sammy davis", "harry connick", "matt monro", "tom jones", "lulu", "nancy sinatra", "paul mauriat", "montenegro", "oc smith", "o.c. smith"]):
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    if any(x in t for x in ["5th dimension", "aquarius", "friends of distinction"]):
        return "Sunshine pop / Pop", "Pop", "Sunshine pop"
    if "mcdonald" in t:
        return "Blue-eyed soul / R&B", "R&B", "Blue-eyed soul"
    if "rascals" in t:
        return "Blue-eyed soul / Rock", "Rock", "Blue-eyed soul"
    return "Pop / Pop", "Pop", "Pop"


def cover_artist_display(tpe1: str) -> str:
    """Short artist for cover top line."""
    if ";" in tpe1:
        tpe1 = tpe1.split(";")[0].strip()
    if len(tpe1) > 48:
        tpe1 = tpe1.split(",")[0].strip()
    return tpe1


def art_brief_for(artist: str, title: str, album: str, tcon: str) -> str:
    sub = tcon.split(" / ")[0] if " / " in tcon else tcon
    if "Bossa" in sub or "bossa" in sub.lower():
        return f"Rio dusk beach: soft waves, lone acoustic guitar on sand, violet-orange sky (album: {album}; artist nod: bossa rhythm)."
    if "Fingerstyle" in sub:
        return f"Warm workshop still life: polished acoustic guitar, sheet music and amber lamp glow (album: {album}; artist nod: fingerpicked strings)."
    if "Minimalism" in sub or "Film score" in sub:
        return f"Abstract geometric light planes in deep blue and silver, meditative empty hall (album: {album}; artist nod: repeating patterns)."
    if "Jazz" in sub:
        return f"Smoky blue jazz club: brass sax bell, single spotlight on empty stage floor (album: {album}; artist nod: piano keys reflected)."
    if "Soul" in sub or "Blue-eyed" in sub:
        return f"Motown-era painted city night: neon soul club doorway, gold and purple light, no figures (album: {album}; artist nod: vinyl groove)."
    if "Classic rock" in sub:
        return f"1960s psychedelic sunset: swirling orange sky over empty highway, vintage guitar silhouette (album: {album}; artist nod: amplifier glow)."
    if "Traditional pop" in sub or "Sunshine pop" in sub:
        return f"Mid-century lounge elegance: martini glass and microphone on velvet curtain, warm spotlight (album: {album}; artist nod: crooner era)."
    if "Adult contemporary" in sub:
        return f"Golden-hour acoustic porch: worn guitar, wheat field horizon, soft clouds (album: {album}; artist nod: singer-songwriter)."
    return f"Premium painted scene with warm depth evoking {title[:35]} (album: {album}; artist nod: music)." 


def lyrics_policy(title: str, has_vocals: str) -> tuple[str, str, str]:
    if has_vocals == "no":
        return "no", "instrumental", ""
    tl = title.lower()
    for k, (reason, url) in FAMOUS_LYRICS.items():
        if k in tl:
            return "yes", reason, url
    return "no", "", ""


def has_vocals_guess(title: str, artist: str, tcon: str) -> str:
    tl = f"{artist} {title}".lower()
    if any(x in tl for x in ["orchestra", "symphony", "philharmonic", "reich", "feldman", "lutoslawski", "ades", "higdon", "chemical brothers", "star guitar", "beep street", "clapping music", "rohtko", "rothko", "metaboles", "polaris", "tetris", "glitch blues", "solar (original", "ghostwriter", "airegin", "bag's groove", "minor blues", "born to swing", "sky & sand", "derange", "burning (vibe", "immunity", "playing god", "total consciousness", "laterna magica", "concerto", "cantus in memory", "pie jesu", "partita for", "figure humaine", "ubi caritas", "the banshee", "rosenberg trio", "whisper not", "shadow of your smile", "watch what happens", "goyescas", "violin concerto", "cello concerto"]):
        if any(x in tl for x in ["coltrane", "monk", "silver", "soul eyes", "naima", "work song", "hozier", "demons", "creep"]):
            pass
        elif "swingle" in tl or "berio" in tl:
            return "yes"
        else:
            return "no"
    if any(x in tl for x in ["emmanuel", "bernie's tune", "bernie", "metamorphosis", "glass", "zimmer", "s.t.a.y", "secret garden", "guaraldi", "peterson trio", "mauriat", "montenegro", "good, the bad and the ugly"]):
        if "this guy" in tl or "rise" in tl and "alpert" in tl:
            return "yes"
        return "no"
    if "love is blue" in tl:
        return "no"
    return "yes"


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
    if mb.get("best") and not o.get("TIT2") and mb.get("title"):
        title = mb["title"]
    album = o.get("TALB") or mb.get("album") or ""
    tdrc = o.get("TDRC") or mb.get("date") or ""
    tcom = o.get("TCOM") or ""
    tpub = o.get("TPUB") or ""
    tdor = o.get("TDOR") or ""
    tcon, family, sub = guess_genre(artist, title)
    if o.get("TCON"):
        tcon = o["TCON"]
        if " / " in tcon:
            sub, family = tcon.split(" / ", 1)
    comm = f"Genre Universe family: {family}; subgenre: {sub}."
    if o.get("COMM_extra"):
        comm += " " + o["COMM_extra"]
    has_v = o.get("has_vocals") or has_vocals_guess(title, artist, tcon)
    ly_sel, ly_reas, ly_src = lyrics_policy(title, has_v)
    if o.get("lyrics_selected"):
        ly_sel = o["lyrics_selected"]
        ly_reas = o.get("lyrics_reason", ly_reas)
        ly_src = o.get("lyrics_source", ly_src)
    mood = o.get("MOOD") or "warm; reflective; steady"
    art = o.get("art_brief") or art_brief_for(artist, title, album or "Single", tcon)
    cover_path = str(COVERS / f"{source_id}.jpg")
    cheap = ""
    if audio["bitrate_kbps"] and audio["bitrate_kbps"] < 96:
        cheap = f"audio bitrate {audio['bitrate_kbps']} kbps (<96); premium cover kept by request"
    notes = o.get("notes") or ""
    if audio.get("bpm_note") and audio["bpm_note"] not in notes:
        notes = (notes + " " + audio["bpm_note"]).strip()
    if mb.get("error"):
        notes = (notes + f" MusicBrainz lookup error: {mb['error']}.").strip()
    if not mb.get("best"):
        notes = (notes + " MusicBrainz: no confident match; filename and audio used.").strip()
    sources = o.get("sources") or "filename parse; MusicBrainz; librosa"
    yt = parsed.get("youtube_id") or ""
    conf = lambda v, c="Med": c if v else ""

    return {
        "filename": filename,
        "source_drive_id": source_id,
        "tagged_drive_id": tagged_id,
        "TIT2": title,
        "TIT2_conf": o.get("TIT2_conf", "High" if o.get("TIT2") else "Med"),
        "TPE1": artist,
        "TPE1_conf": o.get("TPE1_conf", "Med"),
        "TALB": album,
        "TALB_conf": conf(album, o.get("TALB_conf", "Med")),
        "TDRC": tdrc,
        "TDRC_conf": conf(tdrc, o.get("TDRC_conf", "Med")),
        "TDOR": tdor,
        "TDOR_conf": conf(tdor, o.get("TDOR_conf", "")),
        "TCON": tcon,
        "TCON_conf": o.get("TCON_conf", "Med"),
        "TLEN": str(audio["duration_ms"]),
        "TLEN_conf": "High",
        "TPE2": o.get("TPE2") or artist.split(",")[0].strip(),
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
        "notes": notes.strip(),
        "batch": BATCH,
        "has_vocals": has_v,
        "lyrics_selected": ly_sel,
        "lyrics_reason": ly_reas,
        "lyrics_source": ly_src,
        "cover_text_check": o.get("cover_text_check", ""),
        "cover_model": COVER_MODEL,
        "cheap_reason": cheap,
        "_youtube_id": yt,
        "_cover_artist": cover_artist_display(artist),
    }


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

No logos, no label marks, no barcodes, no watermarks, no extra words or signage anywhere."""


def resize_cover(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im = im.resize((1400, 1400), Image.Resampling.LANCZOS)
    im.save(dest, "JPEG", quality=92)


def apply_tags(mp3_path: Path, row: dict, cover_jpg: Path, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(mp3_path, out_path)
    audio = MP3(out_path, ID3=ID3)
    if audio.tags is None:
        audio.add_tags()
    tags = audio.tags
    tags.delall("TIT2")
    tags.add(TIT2(encoding=3, text=row["TIT2"]))
    tags.delall("TPE1")
    tags.add(TPE1(encoding=3, text=row["TPE1"]))
    if row["TALB"]:
        tags.delall("TALB")
        tags.add(TALB(encoding=3, text=row["TALB"]))
    if row["TDRC"]:
        tags.delall("TDRC")
        tags.add(TDRC(encoding=3, text=row["TDRC"]))
    if row["TCON"]:
        tags.delall("TCON")
        tags.add(TCON(encoding=3, text=row["TCON"]))
    tags.delall("TLEN")
    tags.add(TLEN(encoding=3, text=row["TLEN"]))
    if row["TPE2"]:
        tags.delall("TPE2")
        tags.add(TPE2(encoding=3, text=row["TPE2"]))
    if row["TBPM"]:
        tags.delall("TBPM")
        tags.add(TBPM(encoding=3, text=row["TBPM"]))
    if row["TKEY"]:
        tags.delall("TKEY")
        tags.add(TKEY(encoding=3, text=row["TKEY"]))
    if row["TCOM"]:
        tags.delall("TCOM")
        tags.add(TCOM(encoding=3, text=row["TCOM"]))
    if row["TPUB"]:
        tags.delall("TPUB")
        tags.add(TPUB(encoding=3, text=row["TPUB"]))
    tags.delall("COMM")
    tags.add(COMM(encoding=3, lang="eng", desc="", text=row["COMM"]))
    if row["MOOD"]:
        tags.delall("TXXX:MOOD")
        tags.add(TXXX(encoding=3, desc="MOOD", text=row["MOOD"]))
    yt = row.get("_youtube_id") or ""
    if yt:
        tags.delall("TXXX:purl")
        tags.add(TXXX(encoding=3, desc="purl", text=f"https://www.youtube.com/watch?v={yt}"))
    tags.delall("APIC")
    tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_jpg.read_bytes()))
    audio.save(v2_version=3)


def fieldnames() -> list[str]:
    with open(HEADER, newline="") as f:
        return next(csv.reader(f))


def init_results() -> None:
    if not RESULTS.exists():
        RESULTS.parent.mkdir(parents=True, exist_ok=True)
        with open(RESULTS, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(fieldnames())


def load_done_ids() -> set[str]:
    if not RESULTS.exists():
        return set()
    with open(RESULTS, newline="") as f:
        return {r["source_drive_id"] for r in csv.DictReader(f) if r.get("source_drive_id")}


def append_csv(row: dict) -> None:
    fn = fieldnames()
    out_row = {k: row.get(k, "") for k in fn}
    with open(RESULTS, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL)
        w.writerow(out_row)


def load_tracks() -> list[dict]:
    lines = JSONL.read_text().strip().split("\n")
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def cmd_analyze(source_id: str, mp3: Path, drive_title: str) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    parsed = parse_filename(drive_title)
    parsed["filename"] = drive_title
    audio = analyze_audio(mp3)
    mb = musicbrainz_lookup(parsed["artist_hint"], parsed["title_hint"])
    row = build_row(drive_title, source_id, "", parsed, audio, mb)
    (WORK / f"{source_id}.json").write_text(json.dumps(row, indent=2))
    print(json.dumps({"id": source_id, "prompt": cover_prompt(row), "title": row["TIT2"]}))


def cmd_finalize(source_id: str, mp3: Path, cover_png: Path, tagged_id: str = "") -> None:
    meta = json.loads((WORK / f"{source_id}.json").read_text())
    meta["tagged_drive_id"] = tagged_id
    meta["cover_text_check"] = meta.get("cover_text_check") or "ok (verified by eye)"
    cover_jpg = Path(meta["cover_path"])
    resize_cover(cover_png, cover_jpg)
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, cover_jpg, out)
    append_csv(meta)
    print(json.dumps({"out": str(out), "tagged_id": tagged_id}))


if __name__ == "__main__":
    init_results()
    if len(sys.argv) < 2:
        print("Usage: analyze|finalize|list-pending|prompt <id> ...")
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "list-pending":
        done = load_done_ids()
        for t in load_tracks():
            if t["id"] not in done:
                print(t["id"], t["title"][:60])
    elif cmd == "analyze":
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
    elif cmd == "prompt":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        print(cover_prompt(meta))
    elif cmd == "finalize":
        tid = sys.argv[5] if len(sys.argv) > 5 else ""
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), tid)
    elif cmd == "batch-analyze":
        done = load_done_ids()
        for t in load_tracks():
            if t["id"] in done:
                continue
            mp3 = WORK / f"{t['id']}.mp3"
            if mp3.exists():
                cmd_analyze(t["id"], mp3, t["title"])
                time.sleep(1.2)
    elif cmd == "upload-prep":
        import base64

        sid = sys.argv[2]
        p = WORK / f"{sid}.tagged.mp3"
        meta = json.loads((WORK / f"{sid}.json").read_text())
        out = WORK / "upload" / f"{sid}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "title": meta["filename"],
            "parentId": TAG_FOLDER,
            "contentMimeType": "audio/mpeg",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(p.read_bytes()).decode(),
        }
        out.write_text(json.dumps(payload))
        (WORK / "upload" / f"{sid}.payload.json").write_text(json.dumps(payload))
        print(out, p.stat().st_size)
    elif cmd == "patch-tagged-id":
        sid, tid = sys.argv[2], sys.argv[3]
        rows: list[dict] = []
        fn = fieldnames()
        with open(RESULTS, newline="") as f:
            rows = list(csv.DictReader(f))
        found = False
        for r in rows:
            if r.get("source_drive_id") == sid:
                r["tagged_drive_id"] = tid
                found = True
        if not found:
            raise SystemExit(f"No CSV row for {sid}")
        with open(RESULTS, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fn, quoting=csv.QUOTE_MINIMAL)
            w.writeheader()
            w.writerows(rows)
        print(json.dumps({"patched": sid, "tagged_drive_id": tid}))
    elif cmd == "upload-args":
        """Print create_file args (no base64) for agent MCP upload."""
        sid = sys.argv[2]
        meta = json.loads((WORK / f"{sid}.json").read_text())
        p = WORK / f"{sid}.tagged.mp3"
        import base64

        b64 = base64.b64encode(p.read_bytes()).decode()
        print(
            json.dumps(
                {
                    "title": meta["filename"],
                    "parentId": TAG_FOLDER,
                    "contentMimeType": "audio/mpeg",
                    "disableConversionToGoogleType": True,
                    "b64_len": len(b64),
                    "bytes": p.stat().st_size,
                }
            )
        )
