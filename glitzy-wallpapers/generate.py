import os, sys, json, base64, re, urllib.request, concurrent.futures as cf
KEY = os.environ["Open_router_API_key"]
OUT = "/home/user/Claud/glitzy-wallpapers"
STYLE = ("Vertical 9:16 phone wallpaper, ultra-cute girly glam aesthetic, pastel pink and rose-gold palette, "
         "sparkles, glitter bokeh, soft dreamy lighting, high detail. Adult woman, fully clothed, sweet and playful. No text, no watermark.")
JOBS = [
 ("google/gemini-3-pro-image", "Pixie-cut woman in a fuzzy pink sweater taking a peace-sign selfie in a car with a glittery pink fuzzy steering wheel and quilted pink seats, cute pout."),
 ("google/gemini-3.1-flash-image", "Woman with pink butterfly hair clips and a heart choker, close-up, sweet knowing smile, pink bokeh hearts background."),
 ("google/gemini-2.5-flash-image", "Woman in a rose-gold boutique twirling in a pink corset mini dress with lace, holding a heart-shaped handbag, clothing racks of pink dresses behind."),
 ("microsoft/mai-image-2.6", "Woman in a dusty-rose lace boho dress with a lace headband blowing a kiss in a sunny flower courtyard, petals floating."),
 ("openai/gpt-image-2", "Woman in a satin pink bow, pearl necklace, fuzzy pink cardigan and floral midi skirt posing with hands under chin on a pastel studio set full of balloons."),
 ("openai/gpt-image-1-mini", "Woman in a grey newsboy cap and pink sweater sipping a pink iced latte at a cafe with a pink neon heart sign, peace sign pose."),
 ("openai/gpt-5-image-mini", "Woman in a ruffled pastel pink ballgown and tiara under cherry blossom trees, curtsy pose, sparkles everywhere."),
 ("black-forest-labs/flux.2-pro", "Woman with a messy bun in a floral off-shoulder top, duck-face selfie in a cozy pink bedroom with fairy lights and plushies."),
 ("black-forest-labs/flux-3-image", "Woman lying on her stomach on a pink heart-shaped bed, kicking feet up, holding a pink phone, giggling, soft pink canopy."),
 ("bytedance-seed/seedream-5-0-pro", "Woman in a pink tulle mini dress and glitter heels posing in front of a giant pink balloon heart wall, winking."),
 ("bytedance-seed/seedream-4.5", "Pixie-cut woman in a pale pink lace-trim top with heart embroidery, cute smirk, sitting in a car with pink fuzzy accessories, golden-hour light."),
 ("qwen/qwen-image-3-pro", "Woman with pink pigtails in a pastel kawaii outfit making a heart with her hands in a candy shop full of macarons and lollipops."),
 ("x-ai/grok-imagine-image-quality", "Woman in a pink sparkly sequin dress on a rose-gold vanity, applying lip gloss in a heart mirror ringed with bulbs, playful glance."),
 ("microsoft/mai-image-2.5-pro", "Woman in a pink plaid skirt, white blouse and pink cardigan, bow in hair, peace sign by a pink convertible car under pink skies."),
 ("krea/krea-2-large", "Woman in a fluffy pink robe and bunny-ear headband holding a strawberry milkshake, cozy pastel pink kitchen, sweet smile."),
 ("recraft/recraft-v4.1-pro", "Woman in a pink puffy-sleeve dress spinning in a field of pink tulips with a pink umbrella, dreamy pastel clouds."),
 ("sourceful/riverflow-v2.5-pro", "Woman in a pink beret and pink faux-fur jacket posing with shopping bags on a glittery pink Paris street at night."),
 ("tencent/hy-image-v3.5-preview", "Anime-style pink-haired princess in a frilly pink dress with heart wand, cherry blossom castle background, sparkles."),
]
IMG_EP = {"openai/gpt-image-2","openai/gpt-image-1-mini","black-forest-labs/flux-3-image","qwen/qwen-image-3-pro","krea/krea-2-large","tencent/hy-image-v3.5-preview"}
def run(i, model, scene):
  for ar in (["9:16","2:3"] if model in IMG_EP else ["9:16"]):
    res = run1(i, model, scene, ar)
    if "OK" in res or "aspect_ratio" not in res: return res
  return res
def run1(i, model, scene, ar):
    body = {"model": model, "messages": [{"role": "user", "content": scene + " " + STYLE}],
            "modalities": ["image", "text"] if "gemini" in model or "gpt-5" in model else ["image"],
            "image_config": {"aspect_ratio": "9:16"}}
    ep = "chat/completions"
    if model in IMG_EP:
        ep = "images"; body = {"model": model, "prompt": scene + " " + STYLE, "aspect_ratio": ar}
    req = urllib.request.Request("https://openrouter.ai/api/v1/"+ep, json.dumps(body).encode(),
        {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=300))
        if ep == "images":
            d = r["data"][0]; url = d.get("url") or "data:image/png;base64," + d["b64_json"]
        else:
            imgs = r["choices"][0]["message"].get("images") or []
            if not imgs: return f"{model}: NO IMAGE {json.dumps(r)[:300]}"
            url = imgs[0]["image_url"]["url"]
        m = re.match(r"data:image/(\w+);base64,(.*)", url, re.S)
        if m: data, ext = base64.b64decode(m.group(2)), m.group(1)
        else: data, ext = urllib.request.urlopen(url).read(), "png"
        ext = "jpg" if ext == "jpeg" else ext
        fn = f"{OUT}/{i:02d}_{model.replace('/','_')}.{ext}"
        open(fn, "wb").write(data)
        return f"{model}: OK {fn}"
    except urllib.error.HTTPError as e:
        return f"{model}: HTTP {e.code} {e.read()[:300]}"
    except Exception as e:
        return f"{model}: ERR {e}"
sel = [int(x) for x in sys.argv[1:]] or range(len(JOBS))
with cf.ThreadPoolExecutor(6) as ex:
    for res in ex.map(lambda i: run(i+1, *JOBS[i]), sel): print(res, flush=True)
