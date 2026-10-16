"""Artist-style phone wallpapers at exactly 1440x3120 (19.5:9, Galaxy S24 Ultra) via OpenRouter.
Two candidates per artist (GPT Image 2 high quality + Seedream 5.0 Pro); the better one is picked by eye.
Spend is tracked from each response's reported cost and capped. Reads the Open_router_API_key env var.
Usage: python3 generate.py OUT_DIR BUDGET_USD ALREADY_SPENT_USD [ids...]   (ids like 01g 01s)"""
import os, sys, json, base64, re, io, time, threading, urllib.request, urllib.error, concurrent.futures as cf
from PIL import Image

KEY = os.environ["Open_router_API_key"]
API = "https://openrouter.ai/api/v1/images"
HDR = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
W, H = 1440, 3120
MODELS = {"g": ("openai/gpt-image-2", {"quality": "high"}, 0.21), "s": ("bytedance-seed/seedream-5-0-pro", {}, 0.09)}

HEAD = ("Portrait phone wallpaper for a Samsung Galaxy S24 Ultra: exactly 1440x3120 pixels, 19.5:9 aspect ratio, vertical, "
        "full-bleed artwork filling the entire canvas. ")
TAIL = (" Keep the top 15% of the image calm, simple and slightly darker for the lock-screen clock, and the bottom 10% calm for the "
        "app dock. An original composition in this artist's manner, not a copy of any existing work. Absolutely no text, no letters, "
        "no calligraphy, no signatures, no seals or stamps, no watermarks, no UI elements.")

ARTISTS = [
 ("Gu_Kaizhi", "In the style of Gu Kaizhi (Eastern Jin dynasty handscroll painting): continuous, even, gossamer 'silkworm-thread' ink lines of unwavering width, delicate mineral color washes of cinnabar, malachite and ochre on aged, darkened pale-brown silk with fine craquelure. A single elegant court lady in layered flowing robes turns to look back over her shoulder, long silk ribbons and sleeves streaming in a gentle wind, her face serene and full of inner spirit. She stands alone in the middle third of a vast, empty silk ground, a few sparse stylized rocks at her feet. Calm, refined, timeless."),
 ("Fan_Kuan", "In the style of Fan Kuan (Northern Song monumental landscape, ink on silk): a colossal central mountain massif rising straight up and filling the upper-middle of the picture, its face built from dense 'raindrop' texture strokes in dark ink, crowned with scrubby trees; a hair-thin waterfall drops down a cleft; a band of white mist separates the peak from the foreground. At the very bottom, among huge boulders and gnarled trees by a stream, a tiny mule train of travelers emphasizes human smallness. Early-morning stillness, deep browns and greys of aged silk, Daoist awe."),
 ("Huang_Gongwang", "In the style of Huang Gongwang (Yuan literati painter, 'Dwelling in the Fuchun Mountains'): dry, scratchy hemp-fiber brushstrokes and light ochre-and-ink washes (qianjiang color) on warm paper. Rounded, layered rolling hills recede upward along a broad winding river, clusters of pines and autumn trees, a small thatched pavilion and a lone fisherman's boat. Sparse, unhurried, personal and quietly expressive; late-autumn afternoon light rendered through restrained tone."),
 ("Ni_Zan", "In the style of Ni Zan (Yuan dynasty austere ink landscape): the classic 'one river, two banks' arrangement — in the lower third a near shore of flat rocks with three or four thin, nearly leafless trees and a small empty thatched pavilion; a huge expanse of blank, untouched paper as still water occupying the middle; low, flat, distant hills on the far bank in the upper middle. Pale, dry, sparing ink on paper, almost no wash, no people. Solitude, moral purity, silence; suggestion over description."),
 ("Kamal_ud_Din_Behzad", "In the style of Kamal ud-Din Behzad (Timurid Herat-school Persian manuscript miniature): jewel-like opaque watercolor and gold, lapis-lazuli blue, vermilion, emerald and turquoise; flat, stacked bird's-eye perspective. A bustling multi-figure scene of craftsmen building a palace: workers on scaffolds carrying bricks, a carpenter, a mason mixing mortar, a supervisor, each figure individually observed and naturalistic in pose. Intricate geometric tilework and arabesque patterns on the walls. A deep lapis and gold sky with swirling Chinese-style cloud bands across the top. Daylight, industrious and lively. No text panels or inscriptions."),
 ("Sesshu_Toyo", "In the style of Sesshū Tōyō (Muromachi Japanese ink painting, 'Winter Landscape'): sharp, angular, broken contour strokes in strong black ink on paper; a jagged vertical fissure line slicing down a frozen cliff; snow-laden rocks and bare trees; the roof of a mountain temple tucked into the rocks; a tiny lone traveler with a staff climbing a path. Pale grey wash sky and white snow left as bare paper. Cold, austere, powerful winter mood."),
 ("Ma_Yuan_and_Xia_Gui", "In the style of Ma Yuan and Xia Gui (Southern Song academy 'one-corner' composition, ink and light color on silk): everything weighted into the lower corner — an angular cliff edge with a dramatically twisted, sharply angled pine reaching diagonally out over the void, and a small scholar in robes standing beneath it gazing out. The rest of the picture is a vast, soft void of mist and atmosphere graded in pale ink washes, with a small pale full moon high in the empty sky. Moonlit spring night, lyrical, incomplete, poetic."),
 ("Katsushika_Hokusai", "In the style of Katsushika Hokusai (Edo-period ukiyo-e color woodblock print, waterfall series): a tall, dramatic waterfall plunging down a cliff, its water rendered as Hokusai's stylized parallel flowing lines and patterned curls, in Prussian blue and indigo with flat greens and ochres on rocks. At the base, small travelers and pilgrims pause on a path, pointing up in awe; pines cling to the cliffs. Crisp black keyblock outlines, visible woodgrain texture, flat color areas and bokashi gradation in the sky. Bright morning, vigorous and full of movement."),
 ("Utagawa_Hiroshige", "In the style of Utagawa Hiroshige (ukiyo-e color woodblock print, vertical 'Famous Views' format): a snowy night at a mountain post-station village; heavy snow falling in soft white dots; travelers in straw raincoats and wide hats trudging with umbrellas along a path; thatched roofs piled with snow; warm lantern light glowing from a teahouse window. Deep indigo-to-black bokashi gradient sky at the top, soft greys, Prussian blue and muted whites; flat color planes and fine keyblock lines. Hushed, atmospheric, poetic weather."),
 ("Raja_Ravi_Varma", "In the style of Raja Ravi Varma (Indian academic realist oil painting): rich European oil technique with smooth glazing, soft chiaroscuro and lifelike flesh tones applied to a Hindu mythological subject. The goddess Saraswati sits gracefully on a stone ledge beside a lotus pond at twilight, wearing a luminous white silk sari with gold borders and jewelry, playing a veena; a white swan glides on the water; a peacock rests in the background foliage; warm sunset sky fading to dusky violet above. Devotional, graceful, theatrical lighting."),
 ("Basawan_and_Abul_Hasan", "In the style of the Mughal court painters Basawan and Abu'l Hasan (high Mughal miniature, opaque watercolor and gold on paper): a great chinar (oriental plane) tree in autumn, its leaves in gold, rust and ochre, rendered leaf by leaf with Persian precision and naturalistic observation; red squirrels scamper along the branches, birds perch and feed, a hunter quietly climbs the trunk, and a resting cheetah lies beneath on a flowered meadow. Fine hair-thin brushwork, rich mineral colors, delicate gold highlights, soft atmospheric distance at the top. No borders, no inscriptions."),
 ("Amrita_Sher_Gil", "In the style of Amrita Sher-Gil (early Indian modernism, oil on canvas, Post-Impressionist influence): three village women in simple saris of deep red, ochre and off-white sit close together in quiet, melancholic contemplation in a shaded courtyard, their large dark eyes downcast; simplified, monumental rounded forms, flat areas of earthy, muted color, soft outlines; a pale earthen wall behind and a hint of a tree. Hot, still afternoon; introspective and emotionally direct."),
 ("MF_Husain", "In the style of M.F. Husain (post-independence Indian modernism, oil on canvas): a village festival scene with drummers and a dancer, painted with bold, sweeping black contour lines, fragmented cubist planes, and saturated blocks of vermilion, chrome yellow, cobalt blue and green; faces simplified and partly abstracted; a stylized lantern and folk motifs; a dynamic, rhythmic composition full of music and energy. Night festival glow with a dark upper sky."),
 ("Qi_Baishi", "In the style of Qi Baishi (modern Chinese ink painting): several translucent freshwater shrimp swimming playfully in a loose diagonal line down the paper, each body made with a few wet, graded ink strokes showing transparency, crisp dark strokes for eyes, long fine whisker-like antennae and delicate legs; vast empty off-white xuan paper around them; maybe one small sprig of water weed. Spontaneous, joyful, minimal, alive."),
 ("Zhang_Daqian", "In the style of Zhang Daqian (splashed ink and splashed color, pomo pocai): dramatic misty mountains formed by spontaneous pools and splashes of black ink merging with brilliant splashes of azurite blue and malachite green that bleed and flow; a few precise fine-line details — a tiny pavilion, a few pines, a cascading stream — anchor the abstraction; clouds of pale wash drift across. Summer after rain, luminous, grand, bridging traditional and modern."),
 ("Xu_Beihong", "In the style of Xu Beihong (modern Chinese ink painting with Western anatomical realism): a single powerful horse galloping almost head-on toward the viewer, its musculature and bone structure accurately described with confident broad strokes of black ink and grey wash, the mane and tail flying in wild, wet, dry-brush strokes; legs foreshortened in dynamic motion; a vast blank paper background with a hint of ground. Freedom, vigor, determination."),
 ("Gerard_Sekoto", "In the style of Gerard Sekoto (South African modernism, oil on board, 1940s): an evening street in a Sophiatown-style township — people walking home, a woman carrying a child on her back, children playing, a man with a bicycle, small corrugated-iron houses with glowing windows; expressive, thick brushstrokes and warm, saturated color (ochre, orange, deep blue, green, rust); simplified figures full of character and dignity; a deep blue dusk sky above. Social observation with warmth and community."),
 ("Ben_Enwonwu", "In the style of Ben Enwonwu (Nigerian modernism, oil on canvas): an elegant masquerade dancer inspired by the Igbo Agbogho Mmuo maiden-spirit masquerade, elongated graceful body twisting in mid-dance, mask and headdress rendered with sculptural rhythm; fluid calligraphic brushwork, flowing curved lines suggesting movement; warm earth tones of ochre, umber and terracotta set against deep indigo; drummers as faint silhouettes. Ritual, spiritual grace, modern African confidence."),
 ("Ibrahim_El_Salahi", "In the style of Ibrahim El-Salahi (Sudanese modernism, ink and oil): a tall, tree-like vertical composition made of intricate interlocking linear forms derived from Arabic calligraphic strokes (illegible, purely abstract), crescent shapes, mask-like faces and eyes emerging from dense networks of fine pen lines, African geometric motifs; earth palette of burnt sienna, black, ochre and cream with a few touches of muted green. Meditative, spiritual, intricate. The marks must not form any legible letters or words."),
 ("Frederic_Bruly_Bouabre", "In the style of Frédéric Bruly Bouabré (Ivorian artist, 'Knowledge of the World' drawings): a naive, flat drawing in colored pencil and ballpoint pen on cream card stock — a cut-open orange fruit revealing a mysterious sacred sign or tiny figure inside its segments, set against a plain background, with simple bold outlines, flat bright fills of yellow, orange, red, blue and green, and gentle hatching; a thin hand-drawn colored border line around the edge. Earnest, cosmological, symbolic, quietly wondrous. The area where his caption text would be is left empty."),
 ("Diego_Rivera", "In the style of Diego Rivera (Mexican muralism, true fresco): indigenous women with long black braids in white huipiles carrying enormous bundles of white calla lilies across a sunny market plaza; simplified, rounded, monumental volumes; warm earthy palette of terracotta, ochre, cream and green with chalky fresco matte texture; strong clear contours; a dignified celebration of labor and Mexican identity. Bright midday light, a clear pale sky at the top."),
 ("Frida_Kahlo", "In the style of Frida Kahlo (Mexican folk-art retablo style, small oil on masonite): a symbolic still life of split watermelons, pomegranates, papayas and passionflowers on a carved wooden table, a green parrot and a hummingbird perched among them, plant roots and veins spreading like life-lines, a lush wall of tropical leaves behind, a dove in the sky. Flat, meticulous, naive-precise painting, saturated reds, greens and pinks, folk-art sincerity with a touch of Surreal symbolism. No human figures, no self-portrait."),
 ("Jose_Clemente_Orozco", "In the style of José Clemente Orozco (Mexican muralism, expressionist fresco): a towering human figure engulfed in swirling flames rising upward, as if transforming into fire, seen from below as on a dome; slashing, angular, expressionistic brushwork; fiery vermilion, orange and ochre against deep blacks and smoky greys; dramatic foreshortening and tension. Revolutionary, tragic, transcendent. Dark, smoky top area."),
 ("Tarsila_do_Amaral", "In the style of Tarsila do Amaral (Brazilian modernism, Antropofagia period, oil on canvas): a dreamlike tropical landscape with smooth, rounded, stylized cacti and banana leaves, soft swelling green hills, a pink adobe village, and a huge sun like a sliced orange setting low; simplified tubular forms, clean flat modeling, luminous palette of pinks, greens, blues and orange; serene and slightly surreal. Sunset."),
 ("Rufino_Tamayo", "In the style of Rufino Tamayo (Mexican modernism): a lone stylized figure with uplifted arms gazing at a cosmic night sky full of stars and a comet; textured, matte surface with gritty sand-like paint; rich watermelon reds, deep purples, earthy pinks and ochres; pre-Columbian simplified forms and geometric fragmentation; mysterious, poetic, cosmic wonder."),
 ("Yayoi_Kusama", "In the style of Yayoi Kusama (contemporary Japanese art, acrylic on canvas): a large yellow pumpkin covered in black polka dots of varying sizes, its ribbed surface rendered in her rhythmic dotted style, sitting on a surface patterned with dots, against an obsessive infinity-net background of tiny repeated white loops on deep red-black; flat, hypnotic, repetitive, joyful and intense."),
 ("Banksy", "In the style of Banksy (stencil street art, spray paint on a wall): a black-and-white stencil of a small child on tiptoe launching a paper airplane folded from a newspaper toward a wall-mounted CCTV camera; the airplane is the only element in bright red; sharp stencil edges, slight overspray and drips, on a weathered, stained brick wall with a strip of grey pavement at the bottom. Wry, poignant social satire. No graffiti tags, no writing."),
 ("Jean_Michel_Basquiat", "In the style of Jean-Michel Basquiat (neo-expressionism, acrylic and oilstick on canvas): a raw, energetic painting of a skull-like head in profile with a three-pointed crown above it, X-ray anatomical diagrams, arrows, scribbled grids and crossed-out shapes, dripping paint, layered over-painting; vivid cadmium yellow, red, cobalt blue and black with patches of raw canvas. Urgent, powerful, about identity and history. Only abstract scribbles and symbols — no legible words, letters or numbers."),
 ("Keith_Haring", "In the style of Keith Haring (Pop and street art): a stack of joyful dancing figures drawn with bold, thick, continuous black outlines, lifting up a giant red heart together, surrounded by radiating motion lines; a radiant baby and a barking dog among them; flat, vibrant fills of red, yellow, green and blue on a bright magenta ground. Energetic, celebratory, about love and unity."),
]

lock = threading.Lock()
state = {"spent": 0.0, "pending": 0.0}

def gen_one(job, out, budget):
    idx, key = job
    name, desc = ARTISTS[idx]
    model, extra, est = MODELS[key]
    tag = f"{idx+1:02d}{key}"
    with lock:
        if state["spent"] + state["pending"] + est > budget:
            return f"{tag} {name}: SKIPPED (budget ${state['spent']:.2f} spent + ${state['pending']:.2f} in flight)"
        state["pending"] += est
    try:
        body = dict({"model": model, "prompt": HEAD + desc + TAIL, "size": f"{W}x{H}"}, **extra)
        for attempt in range(3):
            try:
                r = json.load(urllib.request.urlopen(urllib.request.Request(API, json.dumps(body).encode(), HDR), timeout=600))
                break
            except urllib.error.HTTPError as e:
                msg = f"HTTP {e.code} {e.read()[:250]}"
                if e.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    return f"{tag} {name}: FAILED {msg}"
                time.sleep(20 * (attempt + 1))
        cost = float((r.get("usage") or {}).get("cost") or est)
        with lock:
            state["spent"] += cost
        d = r["data"][0]
        data = base64.b64decode(d["b64_json"]) if d.get("b64_json") else urllib.request.urlopen(d["url"]).read()
        im = Image.open(io.BytesIO(data))
        fn = os.path.join(out, f"{tag}_{name}.png")
        im.save(fn)  # saved as PNG at native size; no resizing or cropping
        exact = "EXACT" if im.size == (W, H) else f"WRONG SIZE {im.size}"
        return f"{tag} {name}: OK {im.size[0]}x{im.size[1]} {exact} cost ${cost:.4f}"
    except Exception as e:
        return f"{tag} {name}: ERR {e}"
    finally:
        with lock:
            state["pending"] -= est

if __name__ == "__main__":
    out, budget, already = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    os.makedirs(out, exist_ok=True)
    state["spent"] = already
    pick = set(sys.argv[4:])
    jobs = [(i, k) for i in range(len(ARTISTS)) for k in ("g", "s") if not pick or f"{i+1:02d}{k}" in pick]
    print(f"{len(jobs)} jobs, budget ${budget:.2f}, already spent ${already:.2f}", flush=True)
    with cf.ThreadPoolExecutor(6) as ex:
        for res in ex.map(lambda j: gen_one(j, out, budget), jobs):
            print(res, flush=True)
    print(f"TOTAL SPENT ${state['spent']:.4f}", flush=True)
