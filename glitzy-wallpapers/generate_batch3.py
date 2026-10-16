"""Batch 3: 25% Glitzy-style pink wallpapers, 75% unique styles, with a hard OpenRouter spend cap.
Reads the key from the Open_router_API_key env var. Usage: python3 generate_batch3.py [budget_usd] [job numbers...]"""
import os, sys, json, base64, re, time, threading, urllib.request, urllib.error, concurrent.futures as cf

KEY = os.environ["Open_router_API_key"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "batch3")
API = "https://openrouter.ai/api/v1/"
HDR = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

GLITZY = ("Vertical 9:16 phone wallpaper, ultra-cute girly glam aesthetic, pastel pink and rose-gold palette, sparkles, "
          "glitter bokeh, soft dreamy lighting, masterpiece quality, ultra detailed. Adult woman, fully clothed, sweet and playful. "
          "No text, no watermark.")
UNIQUE = ("Vertical 9:16 phone wallpaper, masterpiece quality, ultra detailed, striking composition with calm space near the top. "
          "Adult woman, fully clothed. No text, no watermark, no logos.")
IMG_EP = {"openai/gpt-image-2", "qwen/qwen-image-3-pro", "krea/krea-2-large", "black-forest-labs/flux-3-image",
          "tencent/hy-image-v3.5-preview", "openai/gpt-image-2.5-flare", "openai/gpt-image-2.5-sunburst", "meta/muse-image"}

G = [  # Glitzy, on the models behind the favorites
 ("recraft/recraft-v4.1-pro", "Woman in a flowing pink tulle gown climbing a staircase of pink clouds toward a glowing rose-gold castle."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink sequin mini dress blowing bubble gum in a pink arcade lined with claw machines full of plushies."),
 ("openai/gpt-image-2", "Woman in a satin bow headband and fluffy pink cardigan hugging a giant pink teddy bear in a dreamy pink bedroom."),
 ("qwen/qwen-image-3-pro", "Woman in a pink striped apron in a pink ice-cream parlor holding up a giant sprinkle-covered cone, winking."),
 ("x-ai/grok-imagine-image-quality", "Woman in a sparkly pink dress and feather boa taking a mirror selfie in a pink glitter dressing room."),
 ("sourceful/riverflow-v2.5-pro", "Woman in a pink wool coat holding a pink bubble tea on a Tokyo street at night under glowing cherry blossoms."),
 ("microsoft/mai-image-2.5-pro", "Woman in a pink pleated tennis skirt and cable-knit sweater on a pink tennis court, racket on shoulder, peace sign."),
 ("microsoft/mai-image-2.6", "Woman in a pink floral dress under a rose-covered garden archway holding a lace parasol, golden hour."),
 ("google/gemini-2.5-flash-image", "Woman in pink heart-print pajamas eating strawberry cereal at a pastel pink kitchen counter, morning sun."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink ballgown with a sparkly pink masquerade mask at a candlelit pink masquerade ball."),
 ("recraft/recraft-v4.1-pro", "Woman in a pink ruffled dress riding a white carousel unicorn through a sky of pink stars, dreamy painterly style."),
 ("openai/gpt-image-2", "Woman in a pink satin jacket and heart sunglasses at a pink drive-through car wash full of bubbles, laughing."),
]
U = [  # Unique: every one a different style, vibe and atmosphere
 ("openai/gpt-image-2", "1970s Kodachrome film still: woman in a mustard sundress leaning on a turquoise car outside a sun-bleached Route 66 diner, warm nostalgic haze, film grain."),
 ("recraft/recraft-v4.1-pro", "Hand-painted Japanese animation watercolor: woman in a straw hat on a grassy hill in summer wind, towering cumulus clouds, dappled light."),
 ("black-forest-labs/flux.2-max", "Cyberpunk: woman in a translucent holographic raincoat in a rain-soaked Tokyo alley, teal and magenta neon signs reflected in puddles."),
 ("google/gemini-3-pro-image", "Dark academia: woman in a tweed blazer and turtleneck reading by candlelight in a gothic library, moody amber light, dust in the air."),
 ("recraft/recraft-v4-styles-pro", "Art Nouveau poster illustration in the style of Alphonse Mucha: woman with flowing hair framed by an ornate floral halo, gold, sage and cream."),
 ("bytedance-seed/seedream-5-0-pro", "Cottagecore golden hour: woman in a linen dress carrying an armful of wildflowers through a meadow, soft 35mm film look."),
 ("x-ai/grok-imagine-image-quality", "Y2K futurism: woman in a metallic silver outfit and tiny butterfly sunglasses among iridescent floating bubbles, chrome and icy blue."),
 ("google/gemini-3-pro-image", "Ethereal underwater dreamscape: woman in a flowing white dress floating underwater, sun rays from above, glowing jellyfish, deep blues."),
 ("krea/krea-2-large", "Film noir black-and-white photograph: woman in a belted trench coat under a lone streetlamp on a foggy cobblestone street, high contrast."),
 ("tencent/hy-image-v3.5-preview", "Japanese ukiyo-e woodblock print: woman in a patterned kimono holding a paper umbrella on an arched bridge in falling snow."),
 ("qwen/qwen-image-3-pro", "Vaporwave: woman in a pastel 80s windbreaker sitting on a marble bust plinth, sunset over a neon grid horizon with palm silhouettes, purple and cyan."),
 ("microsoft/mai-image-2.5-pro", "Cozy autumn: woman in a chunky cream knit sweater holding a latte on a maple-lined street, falling orange leaves, warm afternoon light."),
 ("black-forest-labs/flux.2-max", "Saharan dusk: woman in a flowing terracotta dress on a sand dune, fabric billowing in the wind, deep orange and violet sky."),
 ("openai/gpt-image-2", "Stylized 3D animated movie render: cheerful woman with oversized round glasses in a cozy bookshop cafe, warm whimsical lighting, soft subsurface skin."),
 ("google/gemini-3-pro-image", "Pre-Raphaelite oil painting: woman in an emerald velvet gown in a walled rose garden, rich chiaroscuro, visible brushwork."),
 ("bytedance-seed/seedream-5-0-pro", "Arctic night: woman in a white fur-trimmed parka in snowy Lapland under swirling green and violet northern lights."),
 ("recraft/recraft-v4-styles-pro", "1960s mod pop-art illustration: woman with a beehive hairdo in a color-block shift dress, bold primary colors, Ben-Day dots."),
 ("riverflow", "Bioluminescent fairy forest: woman in a gossamer gown among glowing teal mushrooms and fireflies at night, magical mist."),
 ("krea/krea-2-large", "Scandinavian minimalism: woman in oatmeal knitwear sitting in a sunlit white room with dried pampas grass, soft beige tones, calm."),
 ("microsoft/mai-image-2.6", "Lush rainforest: woman in a vivid tropical floral dress beside a misty waterfall among giant monstera leaves, saturated greens."),
 ("qwen/qwen-image-3-pro", "Steampunk: woman in a brass-buttoned Victorian coat and goggles on the deck of an airship above copper sunset clouds, sepia tones."),
 ("openai/gpt-image-2", "Claymation stop-motion style: woman knitting in a tiny handmade clay cottage with a sleepy orange cat, fingerprint textures, warm lamp light."),
 ("x-ai/grok-imagine-image-quality", "Gothic romance: woman in a black lace gown in a moonlit garden of deep crimson roses with tall candelabras, mysterious mood."),
 ("google/gemini-3-pro-image", "Cosmic sci-fi: woman in a sleek white spacesuit standing on a moon's surface gazing at a giant ringed planet in a violet nebula sky."),
 ("bytedance-seed/seedream-5-0-pro", "1990s Hong Kong cinema: woman in an emerald qipao in a narrow corridor lit by green fluorescent light, motion-blurred passersby, moody."),
 ("microsoft/mai-image-2.5-pro", "Amalfi Coast summer: woman in a lemon-print sundress on a terrace with lemon trees above a sparkling blue sea, bright Mediterranean sun."),
 ("recraft/recraft-v4.1-pro", "Lo-fi anime illustration: woman with headphones studying at a desk by a rainy window at night, city lights, cozy purple-blue glow, plants."),
 ("black-forest-labs/flux.2-max", "High fantasy: elven queen with a silver circlet and flowing silver gown in a crystalline ice palace, shafts of pale blue light."),
 ("sourceful/riverflow-v2.5-pro", "1990s grunge flash photography: woman in a plaid flannel and combat boots flipping vinyl in a rainy Seattle record store, muted greens."),
 ("recraft/recraft-v4-styles-pro", "Layered papercraft art: woman in a flowing dress on a hill in a layered paper-cut landscape with a crescent moon and paper birds, soft shadows."),
 ("google/gemini-3-pro-image", "Wes Anderson style: woman in a burgundy bellhop-inspired suit standing centered in a symmetrical pastel hotel lobby, flat frontal composition."),
 ("bytedance-seed/seedream-5-0-pro", "Spring Provence: woman in a white eyelet dress walking through endless lavender fields at sunrise, soft purple haze."),
 ("openai/gpt-image-2", "Chinese ink wash painting: woman in flowing hanfu standing on a misty mountain cliff with pine trees and cranes, black ink and soft vermilion."),
 ("x-ai/grok-imagine-image-quality", "Disco 1970s: woman in a gold lame jumpsuit dancing under a giant mirror ball on a lit-up dance floor, warm glitter beams."),
 ("microsoft/mai-image-2.6", "Rainy London afternoon: woman in a camel trench with a black umbrella crossing a wet street with a red double-decker bus blurred behind, cinematic."),
 ("google/gemini-3-pro-image", "Stained-glass art: woman as a serene saint-like figure in a luminous stained glass window of cobalt, ruby and gold, light streaming through."),
]
U[17] = ("sourceful/riverflow-v2.5-pro", U[17][1])

# Interleave so the 25/75 split holds at any stopping point: G U U U G U U U ...
JOBS, gi, ui = [], 0, 0
while gi < len(G) or ui < len(U):
    if gi < len(G): JOBS.append(("G", gi + 1) + G[gi]); gi += 1
    for _ in range(3):
        if ui < len(U): JOBS.append(("U", ui + 1) + U[ui]); ui += 1

def key_usage():
    return json.load(urllib.request.urlopen(urllib.request.Request(API + "key", headers=HDR), timeout=60))["data"]["usage"]

def post(ep, body):
    return json.load(urllib.request.urlopen(urllib.request.Request(API + ep, json.dumps(body).encode(), HDR), timeout=400))

def generate(model, prompt):
    if model in IMG_EP:
        bodies = [{"model": model, "prompt": prompt, "aspect_ratio": "9:16", "quality": "high"},
                  {"model": model, "prompt": prompt, "aspect_ratio": "2:3", "quality": "high"},
                  {"model": model, "prompt": prompt, "aspect_ratio": "2:3"}]
        ep = "images"
    else:
        base = {"model": model, "messages": [{"role": "user", "content": prompt}],
                "modalities": ["image", "text"] if ("gemini" in model or "gpt-5" in model) else ["image"]}
        bodies = [dict(base, image_config={"aspect_ratio": "9:16", "image_size": "2K"}),
                  dict(base, image_config={"aspect_ratio": "9:16"})]
        ep = "chat/completions"
    last = None
    for b in bodies:
        try:
            r = post(ep, b)
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 400: continue  # unsupported parameter: try the simpler body
            raise
        if ep == "images":
            d = r["data"][0]
            return d.get("url") or "data:image/png;base64," + d["b64_json"]
        imgs = r["choices"][0]["message"].get("images") or []
        if not imgs: raise RuntimeError("no image returned")
        return imgs[0]["image_url"]["url"]
    raise last

lock = threading.Lock()
def run(job, start, budget, reserve):
    kind, n, model, scene = job
    with lock:
        spent = key_usage() - start
    if spent + reserve > budget:
        return f"{kind}{n:02d} SKIPPED (budget: ${spent:.2f} spent)"
    prompt = scene + " " + (GLITZY if kind == "G" else UNIQUE)
    for attempt in range(3):
        try:
            url = generate(model, prompt)
            m = re.match(r"data:image/(\w+);base64,(.*)", url, re.S)
            data, ext = (base64.b64decode(m.group(2)), m.group(1)) if m else (urllib.request.urlopen(url).read(), "png")
            ext = "jpg" if ext == "jpeg" else ext
            fn = f"{OUT}/{kind}{n:02d}_{model.split('/')[-1]}.{ext}"
            open(fn, "wb").write(data)
            return f"{kind}{n:02d} {model}: OK"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code} {e.read()[:200]}"
            if e.code not in (429, 500, 502, 503, 504): break
        except Exception as e:
            err = f"ERR {e}"
        time.sleep(15 * (attempt + 1))
    return f"{kind}{n:02d} {model}: FAILED {err}"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    budget = float(sys.argv[1]) if len(sys.argv) > 1 else 5.0
    pick = set(sys.argv[2:])
    jobs = [j for j in JOBS if not pick or f"{j[0]}{j[1]:02d}" in pick]
    start = key_usage()
    workers = 4
    reserve = 0.35 * workers  # headroom for images already in flight
    print(f"start usage ${start:.4f}, budget ${budget:.2f}, {len(jobs)} jobs", flush=True)
    with cf.ThreadPoolExecutor(workers) as ex:
        for res in ex.map(lambda j: run(j, start, budget, reserve), jobs):
            print(res, flush=True)
    time.sleep(5)
    print(f"spent ${key_usage() - start:.4f}", flush=True)
