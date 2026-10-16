"""Batch 2: 30 more Glitzy wallpapers, 3 each from the 10 models whose batch-1 images were favorites.
Reads the OpenRouter key from the Open_router_API_key env var."""
import os, sys, json, base64, re, time, urllib.request, urllib.error, concurrent.futures as cf

KEY = os.environ["Open_router_API_key"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "batch2")
STYLE = ("Vertical 9:16 phone wallpaper, ultra-cute girly glam aesthetic, pastel pink and rose-gold palette, "
         "sparkles, glitter bokeh, soft dreamy lighting, high detail. Adult woman, fully clothed, sweet and playful. No text, no watermark.")
IMG_EP = {"openai/gpt-image-2", "qwen/qwen-image-3-pro"}  # models served only by /api/v1/images

JOBS = [
 ("recraft/recraft-v4.1-pro", "Woman in a ruffled pink dress waving from the basket of a pink hot-air balloon floating over pink clouds at sunrise, pink scarf streaming."),
 ("recraft/recraft-v4.1-pro", "Woman in a flowing pink princess gown sitting on a fluffy pink cloud among twinkling stars, holding a glowing crescent moon."),
 ("recraft/recraft-v4.1-pro", "Woman in a lace pink dress swinging on a garden swing wrapped in pink roses, golden hour, petals drifting."),
 ("microsoft/mai-image-2.5-pro", "Woman in heart-shaped sunglasses and a pink cardigan sitting on the hood of a pink vintage convertible at a drive-in movie, holding popcorn."),
 ("microsoft/mai-image-2.5-pro", "Woman in a layered pastel pink kawaii outfit on a Harajuku street holding a strawberry crepe, peace sign, pink storefronts."),
 ("microsoft/mai-image-2.5-pro", "Woman in a pink plaid skirt and cardigan with a bow, on a ladder in a library with pink bookshelves, holding an open book, smiling."),
 ("sourceful/riverflow-v2.5-pro", "Woman in a blush trench coat under a clear pink umbrella beside a red London phone booth in the rain at night, glowing reflections."),
 ("sourceful/riverflow-v2.5-pro", "Woman in a pink faux-fur coat and pink earmuffs on a snowy street with pink fairy lights, catching snowflakes, cozy night."),
 ("sourceful/riverflow-v2.5-pro", "Woman in a pink sweater dress in a Ferris wheel cabin at night holding a pink heart balloon, glittering city lights below."),
 ("x-ai/grok-imagine-image-quality", "Woman at a pink glitter nail salon showing off sparkly pink heart nails to the camera with a kissy face."),
 ("x-ai/grok-imagine-image-quality", "Woman in a pink velour tracksuit, heart sunglasses and pink roller skates at a pink neon roller rink, mid-glide, laughing."),
 ("x-ai/grok-imagine-image-quality", "Woman in a pink tweed jacket and skirt set spritzing perfume at a luxurious pink perfume counter with crystal bottles."),
 ("qwen/qwen-image-3-pro", "Woman in a pink apron with flour on her nose, holding a pink frosted cupcake in a pastel kitchen full of cupcakes and sprinkles."),
 ("qwen/qwen-image-3-pro", "Woman in a pink 50s swing dress with cat-eye sunglasses on her head in a pink retro diner booth, sharing a strawberry milkshake with two straws."),
 ("qwen/qwen-image-3-pro", "Woman in a pink tea dress at a tea party with a tall macaron tower, holding a rose-gold teacup with her pinky up, giggling."),
 ("openai/gpt-image-2", "Woman in fuzzy pink pajamas and a Santa hat beside a pink Christmas tree, holding a present with a big satin bow."),
 ("openai/gpt-image-2", "Woman in a pink pajama set at a fairy-light sleepover, laughing in a pillow fight with feathers floating, pink pillows everywhere."),
 ("openai/gpt-image-2", "Woman in a pink knit sweater curled up on a window seat with pink curtains, rain on the glass, holding a mug of cocoa, cozy smile."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink tulle dress sitting side-saddle on a pink carousel horse at dusk, waving, carousel lights glowing."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink tutu and pointe shoes in a pink ballet studio, graceful arabesque, mirrors and soft window light."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink satin midi dress with pearl hair clips on a rooftop at sunset strung with pink fairy lights, holding pink lemonade."),
 ("openai/gpt-5-image-mini", "Tall portrait illustration. Woman as a magical girl in a frilly pink dress with ribbons and a heart brooch, swirling sparkles and stars."),
 ("openai/gpt-5-image-mini", "Tall portrait illustration. Woman in a pink floral dress with a flower crown in a butterfly garden, pink butterflies landing on her hand."),
 ("openai/gpt-5-image-mini", "Tall portrait illustration. Woman in a pink skating dress with white fluffy earmuffs twirling on a pink-lit ice rink, snow falling."),
 ("google/gemini-2.5-flash-image", "Woman in a pink cardigan in a flower shop holding a bouquet of pink peonies to her cheek, buckets of roses all around."),
 ("google/gemini-2.5-flash-image", "Woman in a pink and white striped sundress and wide sun hat on a yacht deck on the Riviera, holding heart sunglasses, pink sunset."),
 ("google/gemini-2.5-flash-image", "Woman in a pink beret at a Valentine's cafe window with heart garlands, holding a latte with heart foam art."),
 ("microsoft/mai-image-2.6", "Woman in a ruffled pink sundress on a beach at sunset, hair blowing, holding a pink seashell, pink sky and gentle waves."),
 ("microsoft/mai-image-2.6", "Woman in a pink gingham sundress and straw hat with a ribbon, strawberry picking, holding a basket of strawberries, sweet smile."),
 ("microsoft/mai-image-2.6", "Woman on a pink picnic blanket under cherry blossoms, holding a heart-shaped sandwich, peace sign, petals falling."),
]

def call(model, scene):
    prompt = scene + " " + STYLE
    if model in IMG_EP:
        ep, body = "images", {"model": model, "prompt": prompt, "aspect_ratio": "2:3" if model.startswith("openai/") else "9:16"}
    else:
        ep = "chat/completions"
        body = {"model": model, "messages": [{"role": "user", "content": prompt}],
                "modalities": ["image", "text"] if ("gemini" in model or "gpt-5" in model) else ["image"],
                "image_config": {"aspect_ratio": "9:16"}}
    req = urllib.request.Request("https://openrouter.ai/api/v1/" + ep, json.dumps(body).encode(),
                                 {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    if ep == "images":
        d = r["data"][0]
        return d.get("url") or "data:image/png;base64," + d["b64_json"]
    imgs = r["choices"][0]["message"].get("images") or []
    if not imgs:
        raise RuntimeError("no image: " + json.dumps(r)[:200])
    return imgs[0]["image_url"]["url"]

def run(i):
    model, scene = JOBS[i]
    n = i + 1
    for attempt in range(3):
        try:
            url = call(model, scene)
            m = re.match(r"data:image/(\w+);base64,(.*)", url, re.S)
            data, ext = (base64.b64decode(m.group(2)), m.group(1)) if m else (urllib.request.urlopen(url).read(), "png")
            ext = "jpg" if ext == "jpeg" else ext
            fn = f"{OUT}/{n:02d}_{model.replace('/', '_')}.{ext}"
            open(fn, "wb").write(data)
            return f"{n:02d} {model}: OK"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code} {e.read()[:200]}"
            if e.code not in (429, 500, 502, 503, 504):
                break
        except Exception as e:
            err = f"ERR {e}"
        time.sleep(10 * (attempt + 1))
    return f"{n:02d} {model}: FAILED {err}"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    sel = [int(x) - 1 for x in sys.argv[1:]] or range(len(JOBS))
    with cf.ThreadPoolExecutor(8) as ex:
        for res in ex.map(run, sel):
            print(res, flush=True)
