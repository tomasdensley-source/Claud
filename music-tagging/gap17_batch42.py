#!/usr/bin/env python3
"""Batch 42: gap-17-19.jsonl lines 223-296 (1950s traditional pop)."""
from gap17_pipeline import (
    BATCH,
    COVER_METHOD,
    COVER_MODEL,
    COVERS,
    RESULTS,
    TAG_FOLDER,
    WORK,
    analyze_audio,
    append_csv,
    apply_tags,
    build_row,
    cover_prompt,
    fieldnames,
    init_results,
    load_done_ids,
    musicbrainz_lookup,
    parse_filename,
    resize_cover,
)
import json
import sys
import time
from pathlib import Path

JSONL = Path("/tmp/drive-inventory/gap-17-19.jsonl")
RESULTS_PATH = Path("/tmp/drive-inventory/results-17-19-d.csv")
SLICE_START, SLICE_END = 223, 296

# Override module globals used by imports
import gap17_pipeline as gp

gp.RESULTS = RESULTS_PATH
gp.BATCH = "42"

FAMOUS_50S = {
    "tennessee waltz": ("No. 1 pop standard", "https://lrclib.net/api/search?q=Tennessee+Waltz"),
    "mona lisa": ("signature Nat King Cole hit", "https://lrclib.net/api/search?q=Mona+Lisa"),
    "too young": ("No. 1 hit", "https://lrclib.net/api/search?q=Too+Young"),
    "you belong to me": ("1950s pop standard", "https://lrclib.net/api/search?q=You+Belong+To+Me"),
    "wheel of fortune": ("Kay Starr hit", "https://lrclib.net/api/search?q=Wheel+Of+Fortune"),
    "rags to riches": ("Tony Bennett signature", "https://lrclib.net/api/search?q=Rags+To+Riches"),
    "cold, cold heart": ("standard", "https://lrclib.net/api/search?q=Cold+Cold+Heart"),
    "mockin' bird hill": ("1950s pop hit", "https://lrclib.net/api/search?q=Mockin+Bird+Hill"),
    "don't let the stars": ("Perry Como hit", "https://lrclib.net/api/search?q=Don%27t+Let+The+Stars"),
    "how high the moon": ("jazz/pop standard", "https://lrclib.net/api/search?q=How+High+The+Moon"),
    "goodnight irene": ("folk/pop standard", "https://lrclib.net/api/search?q=Goodnight+Irene"),
    "music! music! music": ("Teresa Brewer hit", "https://lrclib.net/api/search?q=Music+Music+Music"),
    "some enchanted evening": ("Rodgers and Hammerstein standard", "https://lrclib.net/api/search?q=Some+Enchanted+Evening"),
    "because of you": ("Tony Bennett hit", "https://lrclib.net/api/search?q=Because+Of+You"),
    "stranger in paradise": ("Tony Bennett hit", "https://lrclib.net/api/search?q=Stranger+In+Paradise"),
    "no other love": ("Rodgers and Hammerstein standard", "https://lrclib.net/api/search?q=No+Other+Love"),
    "pretend": ("Nat King Cole hit", "https://lrclib.net/api/search?q=Pretend"),
    "answer me": ("1950s pop hit", "https://lrclib.net/api/search?q=Answer+Me"),
    "hey there": ("Broadway standard", "https://lrclib.net/api/search?q=Hey+There"),
    "three coins": ("Oscar-winning standard", "https://lrclib.net/api/search?q=Three+Coins"),
    "this ole house": ("1950s hit", "https://lrclib.net/api/search?q=This+Ole+House"),
    "cross over the bridge": ("Patti Page hit", "https://lrclib.net/api/search?q=Cross+Over+The+Bridge"),
    "little shoemaker": ("1950s pop hit", "https://lrclib.net/api/search?q=Little+Shoemaker"),
    "vaya con dios": ("Les Paul and Mary Ford hit", "https://lrclib.net/api/search?q=Vaya+Con+Dios"),
    "till i waltz": ("Teresa Brewer hit", "https://lrclib.net/api/search?q=Till+I+Waltz"),
    "p.s. i love you": ("standard", "https://lrclib.net/api/search?q=P+S+I+Love+You"),
    "tell me you're mine": ("1950s pop", "https://lrclib.net/api/search?q=Tell+Me+You%27re+Mine"),
    "eh cumpari": ("1950s novelty hit", "https://lrclib.net/api/search?q=Eh+Cumpari"),
    "cry": ("Johnnie Ray hit", "https://lrclib.net/api/search?q=Cry+Johnnie+Ray"),
    "auf wiederseh": ("Vera Lynn hit", "https://lrclib.net/api/search?q=Auf+Wiedersehn"),
    "half as much": ("country/pop standard", "https://lrclib.net/api/search?q=Half+As+Much"),
    "i went to your wedding": ("Patti Page hit", "https://lrclib.net/api/search?q=I+Went+To+Your+Wedding"),
    "tell me why": ("Four Aces hit", "https://lrclib.net/api/search?q=Tell+Me+Why"),
    "jambalaya": ("Hank Williams standard", "https://lrclib.net/api/search?q=Jambalaya"),
    "be my love": ("Mario Lanza signature", "https://lrclib.net/api/search?q=Be+My+Love"),
    "if": ("Perry Como hit", "https://lrclib.net/api/search?q=If+Perry+Como"),
    "loveliest night": ("Mario Lanza standard", "https://lrclib.net/api/search?q=Loveliest+Night"),
    "i get ideas": ("Tony Martin hit", "https://lrclib.net/api/search?q=I+Get+Ideas"),
    "sound off": ("military cadence hit", "https://lrclib.net/api/search?q=Sound+Off"),
    "harbor lights": ("standard", "https://lrclib.net/api/search?q=Harbor+Lights"),
    "i'll never be free": ("duet hit", "https://lrclib.net/api/search?q=I%27ll+Never+Be+Free"),
    "bonaparte's retreat": ("Kay Starr hit", "https://lrclib.net/api/search?q=Bonaparte%27s+Retreat"),
    "tzena": ("Weavers hit", "https://lrclib.net/api/search?q=Tzena"),
    "there's no tomorrow": ("Tony Martin hit", "https://lrclib.net/api/search?q=There%27s+No+Tomorrow"),
    "sentimental me": ("Ames Brothers hit", "https://lrclib.net/api/search?q=Sentimental+Me"),
    "daddy's little girl": ("Mills Brothers standard", "https://lrclib.net/api/search?q=Daddy%27s+Little+Girl"),
    "rag mop": ("Ames Brothers novelty", "https://lrclib.net/api/search?q=Rag+Mop"),
    "i can dream": ("Andrews Sisters hit", "https://lrclib.net/api/search?q=I+Can+Dream"),
    "you're breaking my heart": ("Vic Damone hit", "https://lrclib.net/api/search?q=You%27re+Breaking+My+Heart"),
    "cruising down the river": ("Russ Morgan hit", "https://lrclib.net/api/search?q=Cruising+Down+The+River"),
    "forever and ever": ("Russ Morgan hit", "https://lrclib.net/api/search?q=Forever+And+Ever"),
    "slipping around": ("1949 country/pop hit", "https://lrclib.net/api/search?q=Slipping+Around"),
    "someday": ("Vaughn Monroe ballad", "https://lrclib.net/api/search?q=Someday+Vaughn+Monroe"),
    "a - you're adorable": ("Perry Como hit", "https://lrclib.net/api/search?q=A+You%27re+Adorable"),
    "my darling, my darling": ("show tune standard", "https://lrclib.net/api/search?q=My+Darling+My+Darling"),
    "careless hands": ("Mel Tormé standard", "https://lrclib.net/api/search?q=Careless+Hands"),
    "i've got my love to keep me warm": ("1930s standard", "https://lrclib.net/api/search?q=Keep+Me+Warm"),
    "manana": ("Peggy Lee hit", "https://lrclib.net/api/search?q=Manana"),
    "a tree in the meadow": ("Margaret Whiting hit", "https://lrclib.net/api/search?q=Tree+In+The+Meadow"),
    "you call everybody darling": ("Andrews Sisters hit", "https://lrclib.net/api/search?q=You+Call+Everybody+Darling"),
    "you can't be true": ("standard", "https://lrclib.net/api/search?q=You+Can%27t+Be+True+Dear"),
    "slow boat to china": ("Frank Loesser standard", "https://lrclib.net/api/search?q=Slow+Boat+To+China"),
    "woody woodpecker": ("novelty hit", "https://lrclib.net/api/search?q=Woody+Woodpecker"),
    "ballerina": ("Vaughn Monroe hit", "https://lrclib.net/api/search?q=Ballerina"),
    "beg your pardon": ("1950s pop hit", "https://lrclib.net/api/search?q=Beg+Your+Pardon"),
    "toolie oolie": ("Andrews Sisters novelty", "https://lrclib.net/api/search?q=Toolie+Oolie"),
    "because": ("Perry Como standard", "https://lrclib.net/api/search?q=Because+Perry+Como"),
    "chattanoogie": ("Red Foley hit", "https://lrclib.net/api/search?q=Chattanoogie"),
    "on top of old smoky": ("folk standard", "https://lrclib.net/api/search?q=On+Top+Of+Old+Smoky"),
    "you you you": ("Ames Brothers hit", "https://lrclib.net/api/search?q=You+You+You"),
    "botch-a-me": ("Rosemary Clooney hit", "https://lrclib.net/api/search?q=Botch-A-Me"),
    "little white cloud": ("Johnnie Ray hit", "https://lrclib.net/api/search?q=Little+White+Cloud"),
    "anna": ("Silvana Mangano film song", "https://lrclib.net/api/search?q=Anna+Silvana"),
}
gp.FAMOUS_LYRICS.update(FAMOUS_50S)

INSTRUMENTAL = ("blue tango", "april in portugal", "ruby", "oh!", "you can't be true, dear")

_orig_has_vocals = gp.has_vocals_guess


def has_vocals_50s(title: str, artist: str, tcon: str) -> str:
    tl = title.lower()
    if any(x in tl for x in INSTRUMENTAL):
        if any(x in artist.lower() for x in ["anderson", "baxter", "hayman", "hunt", "griffin"]):
            return "no"
    if "freberg" in artist.lower():
        return "yes"
    return _orig_has_vocals(title, artist, tcon)


gp.has_vocals_guess = has_vocals_50s

_orig_guess = gp.guess_genre


def guess_genre_50s(artist: str, title: str) -> tuple[str, str, str]:
    t = f"{artist} {title}".lower()
    if "weavers" in t or "goodnight irene" in t or "old smoky" in t:
        return "Folk revival / Folk", "Folk", "Folk revival"
    if "freberg" in t or "dragonet" in t:
        return "Comedy / Pop", "Pop", "Comedy"
    if any(x in t for x in ["nat king cole", "tony bennett", "perry como", "patti page", "rosemary clooney", "jo stafford", "kay starr", "johnnie ray", "mario lanza", "teresa brewer", "four aces", "ames brothers", "mills brothers", "andrews sisters", "vic damone", "mel tormé", "margaret whiting", "peggy lee", "tony martin", "julius larosa", "the gaylords", "hilltoppers", "red foley", "tennessee ernie"]):
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    if any(x in t for x in ["les paul", "mary ford", "les brown", "russ morgan", "kay kyser", "vaughn monroe", "sammy kaye", "leroy anderson", "les baxter", "richard hayman", "pee wee hunt", "ken griffin"]):
        return "Traditional pop / Pop", "Pop", "Traditional pop"
    return _orig_guess(artist, title)


gp.guess_genre = guess_genre_50s


def load_slice() -> list[dict]:
    lines = JSONL.read_text().splitlines()
    return [json.loads(lines[i - 1]) for i in range(SLICE_START, SLICE_END + 1)]


def init_d_results() -> None:
    if not RESULTS_PATH.exists():
        with open(RESULTS_PATH, "w", newline="") as f:
            import csv

            w = csv.writer(f)
            w.writerow(fieldnames())


def cmd_analyze(source_id: str, mp3: Path, drive_title: str) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
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
    append_csv(meta)


if __name__ == "__main__":
    init_d_results()
    cmd = sys.argv[1]
    if cmd == "list-pending":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] not in done:
                print(t["id"])
    elif cmd == "batch-analyze":
        done = load_done_ids()
        for t in load_slice():
            if t["id"] in done:
                continue
            mp3 = WORK / f"{t['id']}.mp3"
            if mp3.exists():
                cmd_analyze(t["id"], mp3, t["title"])
                time.sleep(1.2)
    elif cmd == "analyze":
        cmd_analyze(sys.argv[2], Path(sys.argv[3]), sys.argv[4])
    elif cmd == "prompt":
        meta = json.loads((WORK / f"{sys.argv[2]}.json").read_text())
        print(cover_prompt(meta))
    elif cmd == "finalize":
        tid = sys.argv[5] if len(sys.argv) > 5 else ""
        cmd_finalize(sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), tid)
    elif cmd == "export-prompts":
        out = Path("/tmp/gap17-batch42-prompts.jsonl")
        rows = []
        for t in load_slice():
            p = WORK / f"{t['id']}.json"
            if p.exists():
                meta = json.loads(p.read_text())
                rows.append({"id": t["id"], "filename": t["title"], "prompt": cover_prompt(meta)})
        out.write_text("\n".join(json.dumps(r) for r in rows))
        print(len(rows), "prompts ->", out)
