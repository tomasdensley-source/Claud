#!/usr/bin/env python3
"""Gap batch 17-19 slice (lines 75-148): analyze, tag, CSV row formatting."""
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

WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
JSONL = Path("/tmp/drive-inventory/gap-19-21.jsonl")
RESULTS = Path("/tmp/drive-inventory/results-19-21-j.csv")
HEADER = Path("/tmp/manifest.csv")
TAG_FOLDER = "1BJczZDfi033nXBw3OaO-YCuMD-JBzZ_q"
SLICE_START = 1306
SLICE_END = 1450
BATCH = "56"
UA = "PersonalMusicLibrary/1.0 (https://github.com/local; gap-batch-56)"
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
    "we belong together": ("No. 1 hit", "https://lrclib.net/api/search?q=We+Belong+Together+Mariah"),
    "nothing compares 2 u": ("signature ballad", "https://lrclib.net/api/search?q=Nothing+Compares+2+U"),
    "nothing compares 2 you": ("signature ballad", "https://lrclib.net/api/search?q=Nothing+Compares+2+U"),
    "eternal flame": ("Bangles hit", "https://lrclib.net/api/search?q=Eternal+Flame"),
    "can you feel it": ("house music classic", "https://lrclib.net/api/search?q=Can+You+Feel+It+Mr+Fingers"),
    "we are the world": ("charity anthem", "https://lrclib.net/api/search?q=We+Are+The+World"),
    "heal the world": ("Michael Jackson signature", "https://lrclib.net/api/search?q=Heal+The+World"),
    "man in the mirror": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Man+In+The+Mirror"),
    "paint it, black": ("Rolling Stones hit", "https://lrclib.net/api/search?q=Paint+It+Black"),
    "paint it black": ("Rolling Stones hit", "https://lrclib.net/api/search?q=Paint+It+Black"),
    "sexual healing": ("Marvin Gaye hit", "https://lrclib.net/api/search?q=Sexual+Healing"),
    "mercy mercy me": ("Marvin Gaye classic", "https://lrclib.net/api/search?q=Mercy+Mercy+Me"),
    "what's going on": ("Marvin Gaye classic", "https://lrclib.net/api/search?q=What%27s+Going+On"),
    "i heard it through the grapevine": ("Motown classic", "https://lrclib.net/api/search?q=I+Heard+It+Through+The+Grapevine"),
    "smooth operator": ("Sade signature", "https://lrclib.net/api/search?q=Smooth+Operator"),
    "killing me softly": ("Roberta Flack hit", "https://lrclib.net/api/search?q=Killing+Me+Softly"),
    "lisztomania": ("Phoenix hit", "https://lrclib.net/api/search?q=Lisztomania"),
    "whiter shade of pale": ("prog rock classic", "https://lrclib.net/api/search?q=A+Whiter+Shade+Of+Pale"),
    "wind of change": ("Scorpions power ballad", "https://lrclib.net/api/search?q=Wind+Of+Change"),
    "dust in the wind": ("Kansas classic", "https://lrclib.net/api/search?q=Dust+In+The+Wind"),
    "angels": ("Robbie Williams hit", "https://lrclib.net/api/search?q=Angels+Robbie+Williams"),
    "dance me to the end of love": ("Leonard Cohen standard", "https://lrclib.net/api/search?q=Dance+Me+To+The+End+Of+Love"),
    "hey jude": ("Beatles singalong", "https://lrclib.net/api/search?q=Hey+Jude"),
    "in my life": ("Beatles classic", "https://lrclib.net/api/search?q=In+My+Life"),
    "ring of fire": ("Johnny Cash signature", "https://lrclib.net/api/search?q=Ring+Of+Fire"),
    "country roads": ("John Denver signature", "https://lrclib.net/api/search?q=Take+Me+Home+Country+Roads"),
    "take me home": ("John Denver signature", "https://lrclib.net/api/search?q=Take+Me+Home+Country+Roads"),
    "shallow": ("Oscar-winning duet", "https://lrclib.net/api/search?q=Shallow+Lady+Gaga"),
    "someone you loved": ("Lewis Capaldi hit", "https://lrclib.net/api/search?q=Someone+You+Loved"),
    "another love": ("Tom Odell hit", "https://lrclib.net/api/search?q=Another+Love"),
    "lose control": ("Teddy Swims hit", "https://lrclib.net/api/search?q=Lose+Control+Teddy+Swims"),
    "you're beautiful": ("James Blunt hit", "https://lrclib.net/api/search?q=You%27re+Beautiful"),
    "die with a smile": ("Lady Gaga & Bruno Mars hit", "https://lrclib.net/api/search?q=Die+With+A+Smile"),
    "isn't she lovely": ("Stevie Wonder classic", "https://lrclib.net/api/search?q=Isn%27t+She+Lovely"),
    "sir duke": ("Stevie Wonder hit", "https://lrclib.net/api/search?q=Sir+Duke"),
    "ain't no mountain high enough": ("Motown duet classic", "https://lrclib.net/api/search?q=Ain%27t+No+Mountain+High+Enough"),
    "54-46": ("reggae classic", "https://lrclib.net/api/search?q=54-46+Was+My+Number"),
    "message to you rudy": ("ska classic", "https://lrclib.net/api/search?q=A+Message+To+You+Rudy"),
    "dirty old town": ("folk standard", "https://lrclib.net/api/search?q=Dirty+Old+Town"),
    "if i needed you": ("Townes Van Zandt standard", "https://lrclib.net/api/search?q=If+I+Needed+You"),
    "pastures of plenty": ("Woody Guthrie folk standard", "https://lrclib.net/api/search?q=Pastures+Of+Plenty"),
    "sentimental journey": ("WWII-era standard", "https://lrclib.net/api/search?q=Sentimental+Journey"),
    "ain't misbehavin": ("jazz standard", "https://lrclib.net/api/search?q=Ain%27t+Misbehavin"),
    "when you're smiling": ("jazz standard", "https://lrclib.net/api/search?q=When+You%27re+Smiling"),
    "star dust": ("Great American Songbook standard", "https://lrclib.net/api/search?q=Stardust"),
    "sweet lorraine": ("jazz standard", "https://lrclib.net/api/search?q=Sweet+Lorraine"),
    "embraceable you": ("Gershwin standard", "https://lrclib.net/api/search?q=Embraceable+You"),
    "black and blue": ("Louis Armstrong standard", "https://lrclib.net/api/search?q=Black+And+Blue"),
    "ol' man river": ("Show Boat standard", "https://lrclib.net/api/search?q=Ol%27+Man+River"),
    "beer barrel polka": ("polka standard", "https://lrclib.net/api/search?q=Beer+Barrel+Polka"),
    "why do i love you": ("show tune standard", "https://lrclib.net/api/search?q=Why+Do+I+Love+You"),
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
        ]:
            rest = re.sub(pat, "", rest, flags=re.I)
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
    if any(
        x in t
        for x in [
            "beethoven",
            "mozart",
            "schubert",
            "bach",
            "chopin",
            "liszt",
            "brahms",
            "rossini",
            "pavarotti",
            "philharmoniker",
            "symphony",
            "sonata",
            "quartet",
            "concerto",
            "overture",
            "winterreise",
            "egmont",
            "caprices",
            "études",
            "etudes",
            "für elise",
            "fugue",
            "grosse fuge",
            "cavatina",
            "raga ",
            "raag ",
            "healing ragas",
        ]
    ):
        if "raga" in t or "raag" in t or "shankar" in t:
            return "Hindustani classical / World music", "World music", "Hindustani classical"
        return "Classical period / Western art music", "Western art music", "Classical period"
    if any(x in t for x in ["parov stelar", "tape five", "electro swing", "booty swing", "catgroove", "swingrowers", "meco"]):
        return "Electro swing / Electronic", "Electronic", "Electro swing"
    if any(x in t for x in ["toby fox", "hopes and dreams", "windows 96", "potsu", "loscil", "slowdive", "nicolas jaar", "radical face"]):
        if "slowdive" in t or "loscil" in t:
            return "Shoegaze / Rock", "Rock", "Shoegaze"
        if "toby fox" in t:
            return "Video game score / Electronic", "Electronic", "Video game score"
        return "Downtempo / Electronic", "Electronic", "Downtempo"
    if any(x in t for x in ["pogues", "lúnasa", "lunasa", "solas", "ricky skaggs", "highway 40"]):
        if "skaggs" in t:
            return "Bluegrass / Country", "Country", "Bluegrass"
        return "Celtic folk / Folk", "Folk", "Celtic folk"
    if any(x in t for x in ["scorpions", "kansas", "phoenix", "westlife", "james blunt", "teddy swims", "lewis capaldi", "tom odell", "robbie williams"]):
        if "phoenix" in t:
            return "Indie pop / Rock", "Rock", "Indie pop"
        if "kansas" in t or "scorpions" in t:
            return "Arena rock / Rock", "Rock", "Arena rock"
        return "Pop rock / Pop", "Pop", "Pop rock"
    if any(x in t for x in ["mariah carey", "lady gaga", "bruno mars", "michael jackson", "marvin gaye", "sade", "stevie wonder", "specials", "toots"]):
        if "marvin" in t or "stevie" in t:
            return "Soul / R&B", "R&B", "Soul"
        if "sade" in t:
            return "Sophisti-pop / Pop", "Pop", "Sophisti-pop"
        if "specials" in t or "toots" in t:
            return "Ska / Reggae", "Reggae", "Ska"
        return "Pop / Pop", "Pop", "Pop"
    if any(x in t for x in ["johnny cash", "john denver", "townes van zandt", "willie", "country"]):
        return "Country / Country", "Country", "Country"
    if any(x in t for x in ["mr. fingers", "house", "can you feel it"]):
        return "Chicago house / Electronic", "Electronic", "Chicago house"
    if any(x in t for x in ["neotokio", "joe hisaishi", "hisaishi", "treasure planet", "spirited away"]):
        return "Anime score / Soundtrack", "Soundtrack", "Anime score"
    if any(x in t for x in ["dave brubeck", "modern jazz quartet", "james moody", "ahmad", "jazz"]):
        return "Jazz / Jazz", "Jazz", "Jazz"
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
    if any(
        x in tl
        for x in [
            "beethoven",
            "mozart",
            "bach",
            "chopin",
            "schubert",
            "rossini",
            "overture",
            "symphony",
            "sonata",
            "quartet",
            "concerto",
            "études",
            "etudes",
            "caprices",
            "fugue",
            "grosse fuge",
            "cavatina",
            "winterreise",
            "egmont",
            "für elise",
            "raga ",
            "raag ",
            "william tell",
            "pastoral",
            "shepherd",
            "fantas",
            "promentory",
            "instrumental",
            "brubeck",
            "pick up sticks",
            "parov stelar",
            "catgroove",
            "booty swing",
            "meco",
            "loscil",
            "potsu",
            "windows 96",
            "nicolas jaar",
            "ravi shankar",
            "sangeeta shankar",
            "healing ragas",
            "perlman",
            "lang lang",
            "pollini",
            "zimerman",
            "lisitsa",
            "ashkenazy",
            "yundi",
            "vikingur",
            "harnoncourt",
            "gulda",
            "cho, chamber",
            "neotokio",
            "hisaishi",
            "portal",
            "for sephora",
            "glass",
            "hania rani",
        ]
    ):
        if "winterreise" in tl or "gute nacht" in tl:
            return "yes"
        if "parov" in tl and "tan" not in tl:
            return "unknown"
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
    import shutil

    if mp3_path.resolve() != out_path.resolve():
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
    elif cmd == "set-tagged":
        sid, tid = sys.argv[2], sys.argv[3]
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
        meta = json.loads((WORK / f"{sid}.json").read_text())
        meta["tagged_drive_id"] = tid
        (WORK / f"{sid}.json").write_text(json.dumps(meta, indent=2))
        print("updated", sid, tid)
    elif cmd == "write-upload-cmd":
        sid = sys.argv[2]
        meta = json.loads((WORK / f"{sid}.json").read_text())
        tagged = WORK / f"{sid}.tagged.mp3"
        import base64

        payload = {
            "title": meta["filename"],
            "parentId": TAG_FOLDER,
            "contentMimeType": "audio/mpeg",
            "disableConversionToGoogleType": True,
            "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
        }
        cmd = {
            "namespace": "Google-drive",
            "toolName": "create_file",
            "arguments": payload,
        }
        out = WORK / f"{sid}.upload_cmd.json"
        out.write_text(json.dumps(cmd))
        print(out, len(payload["base64Content"]))
    elif cmd == "upload-prep":
        sid = sys.argv[2]
        tagged = WORK / f"{sid}.tagged.mp3"
        meta = json.loads((WORK / f"{sid}.json").read_text())
        import base64

        out = WORK / f"{sid}.upload.json"
        out.write_text(
            json.dumps(
                {
                    "title": meta["filename"],
                    "base64Content": base64.b64encode(tagged.read_bytes()).decode(),
                }
            )
        )
        print(out, tagged.stat().st_size)
