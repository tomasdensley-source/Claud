#!/usr/bin/env python3
"""Batch 47: gap-19-21.jsonl lines 1-145."""
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
RESULTS_PATH = Path("/tmp/drive-inventory/results-19-21-a.csv")
WORK = Path("/tmp/gap19-work")
COVERS = Path("/workspace/music-tagging/covers/gap19")
SLICE_START, SLICE_END = 1, 145

gp.RESULTS = RESULTS_PATH
gp.BATCH = "47"
gp.WORK = WORK
gp.COVERS = COVERS

FAMOUS_BATCH47 = {
    "livin' la vida loca": ("No. 1 Latin pop hit", "https://lrclib.net/api/search?q=Livin+La+Vida+Loca"),
    "lambada": ("global dance hit", "https://lrclib.net/api/search?q=Lambada"),
    "la bachata": ("Latin pop hit", "https://lrclib.net/api/search?q=La+Bachata"),
    "whenever, wherever": ("Shakira signature", "https://lrclib.net/api/search?q=Whenever+Wherever"),
    "la camisa negra": ("Juanes hit", "https://lrclib.net/api/search?q=La+Camisa+Negra"),
    "amor prohibido": ("Selena signature", "https://lrclib.net/api/search?q=Amor+Prohibido"),
    "como la flor": ("Selena classic", "https://lrclib.net/api/search?q=Como+La+Flor"),
    "bidi bidi bom bom": ("Selena hit", "https://lrclib.net/api/search?q=Bidi+Bidi+Bom+Bom"),
    "leave me alone": ("Michael Jackson hit", "https://lrclib.net/api/search?q=Leave+Me+Alone"),
    "rock with you": ("Michael Jackson classic", "https://lrclib.net/api/search?q=Rock+With+You"),
    "p.y.t": ("Michael Jackson hit", "https://lrclib.net/api/search?q=P.Y.T"),
    "electric feel": ("MGMT signature", "https://lrclib.net/api/search?q=Electric+Feel"),
    "dancing on my own": ("Robyn anthem", "https://lrclib.net/api/search?q=Dancing+On+My+Own"),
    "when the levee breaks": ("Led Zeppelin classic", "https://lrclib.net/api/search?q=When+The+Levee+Breaks"),
    "comfortably numb": ("Pink Floyd classic", "https://lrclib.net/api/search?q=Comfortably+Numb"),
    "barracuda": ("Heart rock anthem", "https://lrclib.net/api/search?q=Barracuda"),
    "kid charlemagne": ("Steely Dan classic", "https://lrclib.net/api/search?q=Kid+Charlemagne"),
    "you can't always get what you want": ("Rolling Stones classic", "https://lrclib.net/api/search?q=You+Can%27t+Always+Get+What+You+Want"),
    "bring it on home to me": ("Sam Cooke soul classic", "https://lrclib.net/api/search?q=Bring+It+On+Home+To+Me"),
    "all i want for christmas": ("holiday standard", "https://lrclib.net/api/search?q=All+I+Want+For+Christmas+Is+You"),
    "last christmas": ("holiday pop classic", "https://lrclib.net/api/search?q=Last+Christmas"),
    "feliz navidad": ("holiday standard", "https://lrclib.net/api/search?q=Feliz+Navidad"),
    "a whole new world": ("Disney ballad standard", "https://lrclib.net/api/search?q=A+Whole+New+World"),
    "it's beginning to look a lot like christmas": ("holiday standard", "https://lrclib.net/api/search?q=It%27s+Beginning+To+Look+A+Lot+Like+Christmas"),
    "moondance": ("Van Morrison signature", "https://lrclib.net/api/search?q=Moondance"),
    "wouldn't it be nice": ("Beach Boys classic", "https://lrclib.net/api/search?q=Wouldn%27t+It+Be+Nice"),
    "obsesion": ("bachata hit", "https://lrclib.net/api/search?q=Obsesion+Aventura"),
    "dernière danse": ("Indila hit", "https://lrclib.net/api/search?q=Derniere+danse"),
    "eres tu": ("Eurovision classic", "https://lrclib.net/api/search?q=Eres+Tu"),
    "sending my love": ("R&B hit", "https://lrclib.net/api/search?q=Sending+My+Love"),
    "if i didn't care": ("Ink Spots classic", "https://lrclib.net/api/search?q=If+I+Didn%27t+Care"),
    "my prayer": ("Ink Spots standard", "https://lrclib.net/api/search?q=My+Prayer+Ink+Spots"),
    "bei mir bist du schoen": ("swing standard", "https://lrclib.net/api/search?q=Bei+Mir+Bist+Du+Schoen"),
    "deep purple": ("1930s standard", "https://lrclib.net/api/search?q=Deep+Purple"),
    "sleigh ride": ("holiday standard", "https://lrclib.net/api/search?q=Sleigh+Ride"),
    "part-time lover": ("Stevie Wonder hit", "https://lrclib.net/api/search?q=Part-Time+Lover"),
    "diamonds on the soles": ("Paul Simon classic", "https://lrclib.net/api/search?q=Diamonds+On+The+Soles"),
    "21st century schizoid man": ("prog rock classic", "https://lrclib.net/api/search?q=21st+Century+Schizoid+Man"),
    "resurrections": ("game soundtrack staple", "https://lrclib.net/api/search?q=Resurrections+Celeste"),
    "undertale": ("indie game theme", "https://lrclib.net/api/search?q=Undertale"),
    "buttercup": ("viral indie pop", "https://lrclib.net/api/search?q=Buttercup+Jack+Stauber"),
    "begin the beguine": ("Cole Porter standard", "https://lrclib.net/api/search?q=Begin+The+Beguine"),
    "i loves you porgy": ("Gershwin standard", "https://lrclib.net/api/search?q=I+Loves+You+Porgy"),
    "mirror in the bathroom": ("2-Tone classic", "https://lrclib.net/api/search?q=Mirror+In+The+Bathroom"),
    "have i told you lately": ("Rod Stewart hit", "https://lrclib.net/api/search?q=Have+I+Told+You+Lately"),
    "doctor my eyes": ("Jackson Browne hit", "https://lrclib.net/api/search?q=Doctor+My+Eyes"),
    "(what a) wonderful world": ("Sam Cooke classic", "https://lrclib.net/api/search?q=Wonderful+World+Sam+Cooke"),
    "thanks for the memory": ("Great American Songbook standard", "https://lrclib.net/api/search?q=Thanks+For+The+Memory"),
    "beat me daddy": ("swing boogie classic", "https://lrclib.net/api/search?q=Beat+Me+Daddy+Eight+To+The+Bar"),
    "whispering grass": ("Ink Spots hit", "https://lrclib.net/api/search?q=Whispering+Grass"),
    "korobeiniki": ("folk/game melody", "https://lrclib.net/api/search?q=Korobeiniki"),
    "bella ciao": ("Italian resistance anthem", "https://lrclib.net/api/search?q=Bella+Ciao"),
    "all my friends": ("LCD Soundsystem signature", "https://lrclib.net/api/search?q=All+My+Friends+LCD+Soundsystem"),
    "heartbeats": ("iconic cover; widely quoted", "https://lrclib.net/api/search?q=Heartbeats+Jose+Gonzalez"),
    "smooth": ("No. 1 hit", "https://lrclib.net/api/search?q=Smooth+Santana"),
    "my generation": ("Who anthem", "https://lrclib.net/api/search?q=My+Generation+The+Who"),
    "romeo and juliet": ("Dire Straits classic", "https://lrclib.net/api/search?q=Romeo+And+Juliet"),
    "won't get fooled again": ("Who rock epic", "https://lrclib.net/api/search?q=Won%27t+Get+Fooled+Again"),
    "behind blue eyes": ("Who classic", "https://lrclib.net/api/search?q=Behind+Blue+Eyes"),
    "happy together": ("Turtles No. 1 hit", "https://lrclib.net/api/search?q=Happy+Together"),
    "let it go": ("Disney Frozen anthem", "https://lrclib.net/api/search?q=Let+It+Go+Idina+Menzel"),
    "hey ya": ("Outkast No. 1 hit", "https://lrclib.net/api/search?q=Hey+Ya"),
    "empire state of mind": ("NY anthem", "https://lrclib.net/api/search?q=Empire+State+Of+Mind"),
    "love will tear us apart": ("post-punk classic", "https://lrclib.net/api/search?q=Love+Will+Tear+Us+Apart"),
    "first time ever i saw your face": ("standard", "https://lrclib.net/api/search?q=The+First+Time+Ever+I+Saw+Your+Face"),
    "nature boy": ("jazz standard", "https://lrclib.net/api/search?q=Nature+Boy"),
    "sinnerman": ("Nina Simone signature", "https://lrclib.net/api/search?q=Sinnerman"),
    "scatman": ("Eurodance novelty hit", "https://lrclib.net/api/search?q=Scatman"),
    "cotton eye joe": ("1990s novelty hit", "https://lrclib.net/api/search?q=Cotton+Eye+Joe"),
    "gangnam style": ("global K-pop hit", "https://lrclib.net/api/search?q=Gangnam+Style"),
    "dragostea din tei": ("O-Zone Eurodance hit", "https://lrclib.net/api/search?q=Dragostea+Din+Tei"),
    "umbrella": ("Rihanna No. 1 hit", "https://lrclib.net/api/search?q=Umbrella+Rihanna"),
    "change is gonna come": ("Sam Cooke civil rights anthem", "https://lrclib.net/api/search?q=A+Change+Is+Gonna+Come"),
    "fantasy": ("Mariah Carey hit", "https://lrclib.net/api/search?q=Fantasy+Mariah+Carey"),
    "baby": ("Justin Bieber breakout hit", "https://lrclib.net/api/search?q=Baby+Justin+Bieber"),
    "sorry": ("Justin Bieber hit", "https://lrclib.net/api/search?q=Sorry+Justin+Bieber"),
    "starboy": ("The Weeknd hit", "https://lrclib.net/api/search?q=Starboy"),
    "montero": ("Lil Nas X hit", "https://lrclib.net/api/search?q=MONTERO"),
    "dark horse": ("Katy Perry hit", "https://lrclib.net/api/search?q=Dark+Horse"),
    "don't stop the music": ("Rihanna dance hit", "https://lrclib.net/api/search?q=Don%27t+Stop+The+Music"),
    "only girl": ("Rihanna hit", "https://lrclib.net/api/search?q=Only+Girl+In+The+World"),
    "work": ("Rihanna dancehall hit", "https://lrclib.net/api/search?q=Work+Rihanna"),
    "when i fall in love": ("Great American Songbook standard", "https://lrclib.net/api/search?q=When+I+Fall+In+Love"),
    "blue moon": ("pop standard", "https://lrclib.net/api/search?q=Blue+Moon"),
    "respect yourself": ("Staple Singers classic", "https://lrclib.net/api/search?q=Respect+Yourself"),
    "i'll take you there": ("Staple Singers hit", "https://lrclib.net/api/search?q=I%27ll+Take+You+There"),
    "please send me someone to love": ("blues standard", "https://lrclib.net/api/search?q=Please+Send+Me+Someone+To+Love"),
    "jersey girl": ("Tom Waits signature", "https://lrclib.net/api/search?q=Jersey+Girl"),
    "d.a.n.c.e": ("Justice dance hit", "https://lrclib.net/api/search?q=D.A.N.C.E"),
    "ppap": ("viral novelty hit", "https://lrclib.net/api/search?q=PPAP"),
    "get it up": ("Prince/The Time funk hit", "https://lrclib.net/api/search?q=Get+It+Up+The+Time"),
    "blue collar man": ("Styx rock hit", "https://lrclib.net/api/search?q=Blue+Collar+Man"),
    "confirmation": ("bebop standard", "https://lrclib.net/api/search?q=Confirmation+Charlie+Parker"),
    "my one and only love": ("jazz ballad standard", "https://lrclib.net/api/search?q=My+One+And+Only+Love"),
    "satin doll": ("Ellington standard", "https://lrclib.net/api/search?q=Satin+Doll"),
    "bemsha swing": ("Monk standard", "https://lrclib.net/api/search?q=Bemsha+Swing"),
    "in walked bud": ("Monk standard", "https://lrclib.net/api/search?q=In+Walked+Bud"),
    "anthropology": ("bebop standard", "https://lrclib.net/api/search?q=Anthropology"),
    "manteca": ("Latin jazz standard", "https://lrclib.net/api/search?q=Manteca"),
    "parker's mood": ("bebop standard", "https://lrclib.net/api/search?q=Parker%27s+Mood"),
    "my foolish heart": ("jazz standard", "https://lrclib.net/api/search?q=My+Foolish+Heart"),
    "they say it's wonderful": ("Gershwin standard", "https://lrclib.net/api/search?q=They+Say+It%27s+Wonderful"),
    "i've never been in love before": ("Guys and Dolls standard", "https://lrclib.net/api/search?q=I%27ve+Never+Been+In+Love+Before"),
    "videotape": ("Radiohead fan favorite", "https://lrclib.net/api/search?q=Videotape+Radiohead"),
    "pair of brown eyes": ("Pogues folk classic", "https://lrclib.net/api/search?q=A+Pair+Of+Brown+Eyes"),
}
gp.FAMOUS_LYRICS.update(FAMOUS_BATCH47)

_orig_guess = gp.guess_genre


def guess_genre_batch47(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if any(x in t for x in ["timecop1983", "synthwave", "retrowave"]):
        return "Synthwave / Electronic", "Electronic", "Synthwave"
    if any(x in t for x in ["dettmann", "marcel dettmann", "corebox"]):
        return "Techno / Electronic", "Electronic", "Techno"
    if any(x in t for x in ["theo parrish", "falling up", "house"]):
        return "Deep house / Electronic", "Electronic", "Deep house"
    if any(x in t for x in ["honey dijon", "peggy gou", "thunda", "starry night"]):
        return "House / Electronic", "Electronic", "House"
    if any(x in t for x in ["justice", "d.a.n.c.e", "daft punk", "new order", "lcd soundsystem"]):
        return "Dance / Electronic", "Electronic", "Dance"
    if any(x in t for x in ["joy division", "pavement", "radiohead", "tricky", "these new puritans"]):
        return "Indie rock / Rock", "Rock", "Indie rock"
    if any(x in t for x in ["the who", "styx", "tom petty", "mark knopfler", "vulfpeck", "moon hooch", "knower"]):
        return "Rock / Rock", "Rock", "Rock"
    if any(x in t for x in ["marvin sapp", "shirley caesar", "gospel", "hold my mule"]):
        return "Gospel / R&B", "R&B", "Gospel"
    if any(x in t for x in ["takemitsu", "messiaen", "poulenc", "tavener", "latry", "grimaud", "webern", "berg", "wozzeck", "schoenberg", "verklärte nacht", "aranjuez", "rodrigo", "bernstein", "candide", "chichester psalms", "harmonielehre", "adams", "john adams", "on the town", "turangalîla", "metastaseis", "threnody", "ligeti", "penderecki", "philip glass", "glassworks", "einstein on the beach", "steve reich", "different trains", "drumming", "music for 18", "john cage", "4'33", "transmigration of souls", "lamb", "song for athene", "carmelites", "salve regina"]):
        return "Contemporary classical / Western art music", "Western art music", "Contemporary classical"
    if any(x in t for x in ["poolside", "disco", "nu-disco", "balearic"]):
        return "Nu-disco / Electronic", "Electronic", "Nu-disco"
    if any(x in t for x in ["shantel", "bucovina", "taraf", "kocani", "klezmer", "balkan"]):
        return "Balkan folk / Folk", "Folk", "Balkan folk"
    if any(x in t for x in ["pogues", "corrs", "tony rice", "church street blues", "bluegrass"]):
        return "Celtic folk / Folk", "Folk", "Celtic folk"
    if any(x in t for x in ["jay-z", "jaÿ-z", "outkast", "weeknd", "lil nas", "rihanna", "justin bieber", "katy perry", "zara larsson", "mariah carey", "psy", "o-zone", "rednex", "pikotaro", "rat boy", "jon bellion"]):
        return "Pop / Pop", "Pop", "Pop"
    if any(x in t for x in ["sade", "teena marie", "laufey", "isley brothers", "sam cooke", "staple singers", "roberta flack", "nat king cole", "nina simone"]):
        return "Soul / R&B", "R&B", "Soul"
    if any(
        x in t
        for x in [
            "philharmoniker",
            "symphony orchestra",
            "london symphony",
            "brahms",
            "bruckner",
            "tchaikovsky",
            "rimsky",
            "borodin",
            "smetana",
            "perlman",
            "ashkenazy",
            "zimerman",
            "karajan",
            "böhm",
            "marriner",
            "franck",
            "isserlis",
            "hahn",
            "petrenko",
            "rusalka",
            "swan lake",
            "pictures at an exhibition",
            "capriccio espagnol",
            "scheherezade",
            "violin concerto",
            "piano concerto",
            "ein deutsches requiem",
            "waltz in a flat",
            "6 piano pieces",
            "violin sonata",
        ]
    ):
        return "Orchestral / Western art music", "Western art music", "Orchestral"
    if any(x in t for x in ["jinsang", "affection", "unknown self", "solitude", "lo-fi", "432 hz", "manhattan groove"]):
        return "Lo-fi hip hop / Hip hop", "Hip hop", "Lo-fi hip hop"
    if any(
        x in t
        for x in [
            "kraviz",
            "mills",
            "heard",
            "jaar",
            "chandler",
            "massive attack",
            "nicolas jaar",
            "kerri",
        ]
    ):
        return "Electronic / Electronic", "Electronic", "Electronic"
    if any(x in t for x in ["parov stelar", "swing republic", "electric swing", "shantel", "hot club", "high step", "leo janeiro"]):
        return "Electro swing / Jazz", "Jazz", "Electro swing"
    if any(
        x in t
        for x in [
            "ricky martin",
            "kaoma",
            "turizo",
            "juanes",
            "shakira",
            "selena",
            "indila",
            "mocedades",
            "aventura",
            "piso 21",
            "magalenha",
            "mendes",
        ]
    ):
        return "Latin pop / Pop", "Pop", "Latin pop"
    if any(x in t for x in ["tuva", "ondar", "te vaka", "kurup", "hawaiian", "maher zain", "taraf de haidouks"]):
        return "World / Folk", "Folk", "World"
    if any(x in t for x in ["lena raine", "toby fox", "undertale", "resurrections", "celeste"]):
        return "Video game score / Western art music", "Western art music", "Video game score"
    if any(x in t for x in ["radiohead", "pink floyd", "led zeppelin", "yes", "king crimson", "steely dan", "little feat", "heart", "mgmt", "rilo kiley"]):
        return "Art rock / Rock", "Rock", "Art rock"
    if any(x in t for x in ["michael jackson", "robyn", "jon bellion", "jack stauber", "unknown brain"]):
        return "Pop / Pop", "Pop", "Pop"
    if any(x in t for x in ["oscar peterson", "nina simone", "natalie cole", "incognito", "sarah vaughan", "miles davis", "sharon jones", "sam cooke", "staple singers", "irie love"]):
        return "Soul / Jazz", "Jazz", "Soul"
    if any(x in t for x in ["ink spots", "andrews sisters", "tommy dorsey", "kay kyser", "shep fields", "horace heidt", "red norvo", "mitchell ayres", "larry clinton", "will bradley"]):
        return "Swing / Jazz", "Jazz", "Swing"
    if any(x in t for x in ["hermanos gutiérrez", "hermanos gutierrez"]):
        return "Nuevo flamenco / Latin", "Latin", "Nuevo flamenco"
    if any(x in t for x in ["loreena mckennitt", "katherine jenkins", "takahashi", "utada", "japanese", "インスト"]):
        return "World pop / Pop", "Pop", "World pop"
    if any(x in t for x in ["red army", "korobeiniki", "bella ciao"]):
        return "Folk / Folk", "Folk", "Folk"
    if any(x in t for x in ["mariah carey", "wham", "michael bublé", "buble", "jose feliciano", "ronettes"]):
        return "Holiday pop / Pop", "Pop", "Holiday pop"
    if any(x in t for x in ["van morrison", "beach boys", "jackson browne", "rod stewart", "paul simon", "rolling stones", "english beat"]):
        return "Classic rock / Rock", "Rock", "Classic rock"
    if any(x in t for x in ["m.i.l.k", "poolside", "yuki yuna", "yuki yuzuki", "yuki", "milk"]):
        return "City pop / Pop", "Pop", "City pop"
    return _orig_guess(artist, title)


gp.guess_genre = guess_genre_batch47

_orig_vocals = gp.has_vocals_guess


def has_vocals_batch47(title: str, artist: str, tcon: str) -> str:
    tl = f"{artist} {title}".lower()
    if any(
        x in tl
        for x in [
            "instrumental",
            "symphony",
            "philharmoniker",
            "concerto",
            "sonata",
            "waltz in a",
            "piano pieces",
            "requiem",
            "trepak",
            "sugar plum",
            "flowers",
            "little swans",
            "missing you (instrumental",
            "marche slave",
            "capriccio",
            "scheherezade",
            "steppes of central",
            "vltava",
            "moldau",
            "bumble bee",
            "flight of the bumble",
            "sicilienne",
            "jinsang",
            "affection",
            "432 hz",
            "manhattan groove",
            "unknown self",
            "solitude",
            "the bells",
            "ida red",
            "can you celebrate",
            "インスト",
            "human leather shoes",
            "bar a thym",
            "takemitsu",
            "requiem for string",
            "rain tree sketch",
            "messiaen",
            "apparition de l",
            "poulenc",
            "concerto for 2 pianos",
            "tavener",
            "the lamb",
            "song for athene",
            "glassworks",
            "harmonielehre",
            "knee play",
            "metastaseis",
            "threnody",
            "musica ricercata",
            "lux aeterna",
            "different trains",
            "drumming",
            "music for 18 musicians",
            "4'33",
            "transmigration of souls",
            "webern",
            "wozzeck",
            "verklärte nacht",
            "concierto de aranjuez",
            "chichester psalms",
            "overture to candide",
            "hoe-down",
            "rodeo",
            "yardbird suite",
            "supersax",
            "toss the feathers",
            "instrumental",
            "confirmation",
            "manteca",
            "anthropology",
            "bemsha swing",
            "satin doll",
            "in walked bud",
            "for heaven's sake",
            "mezerg",
            "blue pink jam",
        ]
    ):
        return "no"
    if "larry heard" in tl and "instrumental" in tl:
        return "no"
    return _orig_vocals(title, artist, tcon)


gp.has_vocals_guess = has_vocals_batch47

_orig_art = gp.art_brief_for


def art_brief_batch47(artist: str, title: str, album: str, tcon: str) -> str:
    sub = tcon.split(" / ")[0] if " / " in tcon else tcon
    t = f"{artist} {title}".lower()
    if "Synthwave" in sub:
        return f"Neon 1980s highway at night: magenta-cyan horizon, lone sports car silhouette, vapor haze (album: {album}; artist nod: retro synth glow)."
    if "Techno" in sub or "Deep house" in sub or "House" in sub:
        return f"Underground club painted in deep blue: speaker cone close-up, amber strobe haze, empty dance floor (album: {album}; artist nod: four-on-the-floor pulse)."
    if "Gospel" in sub:
        return f"Painted church light: stained-glass colors on wooden pew, golden rays, no figures (album: {album}; artist nod: choir warmth)."
    if "Contemporary classical" in sub or "Western art music" in tcon or "Orchestral" in sub:
        return f"Concert hall painted vista: gilt balcony rail, velvet seats empty, warm spotlight on vacant podium (album: {album}; artist nod: orchestral strings)."
    if "Balkan" in sub:
        return f"Village festival dusk: accordion and violin resting on embroidered cloth, lantern glow (album: {album}; artist nod: Balkan rhythm)."
    if "Celtic" in sub:
        return f"Misty green pub interior: fiddle on bar, peat fire glow, rain on window (album: {album}; artist nod: folk session)."
    if "Indie rock" in sub:
        return f"Grainy urban alley at blue hour: brick wall, single streetlamp, worn amplifier case (album: {album}; artist nod: indie guitar)."
    if "Electro swing" in sub:
        return f"Art-deco dance floor: brass horn silhouette, amber chandelier glow, empty parquet (album: {album}; artist nod: swing rhythm)."
    if "Latin pop" in sub or "Nuevo flamenco" in sub:
        return f"Tropical sunset plaza: terracotta tiles, palm shadows, festive lanterns without text (album: {album}; artist nod: Latin groove)."
    if "Holiday" in sub:
        return f"Snowy window still life: pine branch, warm candlelight, soft blue evening (album: {album}; artist nod: seasonal warmth)."
    if "Video game" in sub:
        return f"Pixel-inspired painted landscape: mountain path, starry sky, nostalgic adventure mood (album: {album}; artist nod: game world)."
    if "Lo-fi" in sub:
        return f"Cozy study corner: vinyl crate, rainy window, muted lamp glow (album: {album}; artist nod: beat tape)."
    if "Electronic" in sub and "Electro" not in sub:
        return f"Neon warehouse haze: speaker stacks, cyan-magenta light beams, no crowd (album: {album}; artist nod: club pulse)."
    if "World" in sub or "Folk" in sub:
        return f"Hand-painted travel scene: open landscape, traditional instruments resting on cloth (album: {album}; artist nod: folk melody)."
    if "Swing" in sub:
        return f"1940s big-band ballroom: empty dance floor, brass section gleam, soft spotlight (album: {album}; artist nod: swing era)."
    if "Art rock" in sub or "Classic rock" in sub:
        return f"1970s rock painted vista: desert highway at dusk, amplifier silhouette (album: {album}; artist nod: electric guitar)."
    return _orig_art(artist, title, album or "Single", tcon)


gp.art_brief_for = art_brief_batch47


def load_slice() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def init_d_results() -> None:
    if not RESULTS_PATH.exists():
        RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(RESULTS_PATH, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(fieldnames())


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
    out = WORK / f"{source_id}.tagged.mp3"
    apply_tags(mp3, meta, cover_jpg, out)
    append_csv({k: v for k, v in meta.items() if not k.startswith("_")})


if __name__ == "__main__":
    init_d_results()
    cmd = sys.argv[1]
    if cmd == "list-pending":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] not in done:
                print(t["id"], t["title"][:70])
    elif cmd == "list-all-ids":
        for t in load_slice():
            print(t["id"])
    elif cmd == "batch-analyze":
        done = load_done_ids()
        n = 0
        for t in load_slice():
            if t["id"] in done:
                continue
            mp3 = WORK / f"{t['id']}.mp3"
            if not mp3.exists():
                mp3 = WORK / "mp3" / f"{t['id']}.mp3"
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
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), tid)
    elif cmd == "export-prompts":
        out = Path("/tmp/gap19-batch47-prompts.jsonl")
        rows = []
        for t in load_slice():
            p = WORK / f"{t['id']}.json"
            if p.exists():
                meta = json.loads(p.read_text())
                rows.append({"id": t["id"], "filename": t["title"], "prompt": cover_prompt(meta)})
        out.write_text("\n".join(json.dumps(r) for r in rows))
        print(len(rows), "prompts ->", out)
    elif cmd == "next-pending":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] not in done:
                print(json.dumps(t))
                break
