const { chromium } = require('playwright');
const fs = require('fs');
const T = {
 "taggr":"https://www.jointaggr.com","123notary":"https://www.123notary.com","bite-squad-waitr":"https://waitrapp.com","drizly":"https://drizly.com",
 "jitjatjo":"https://www.jitjatjo.com","onlineverdict":"https://www.onlineverdict.com","stickr":"https://stickr.co","takelessons":"https://takelessons.com",
 "tapestri":"https://tapestri.io","uspack":"https://www.uspack.com","sfs":"https://sfsmerchandising.com","cds-club-demonstration-services":"https://www.cdsusa.com",
 "shopkick":"https://www.shopkick.com","rubirides":"https://rubirides.com","focusgroup-com":"https://www.focusgroup.com","free-car-media":"https://freecarmedia.com",
 "healthrun":"https://healthrun.com","humanatic":"https://www.humanatic.com","we-pay-you-junk-estate-removal":"https://wepayyoujunk.com","confero":"https://conferoinc.com",
 "fancy-hands":"https://www.fancyhands.com","society6":"https://society6.com","icon-clinical-research":"https://www.iconplc.com","syex":"https://syex.com",
 "prolific":"https://www.prolific.com","bunny-studio":"https://bunnystudio.com","signingorder":"https://signingorder.com","we-geek-together-crew":"https://www.wegeektogether.com",
 "jd-roofing":"https://jdroofing.com","three-brothers-llc":"https://www.threebrothersllc.com","merch-by-amazon":"https://merch.amazon.com","amazon-mechanical-turk":"https://www.mturk.com"
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', viewport:{width:1280,height:900} });
  const out = {};
  for (const [gid, url] of Object.entries(T)) {
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(2500);
      const info = await p.evaluate(() => {
        const icons = [...document.querySelectorAll('link[rel*="icon"]')].map(l => ({ href: l.href, sizes: l.sizes ? l.sizes.value : '' }));
        const logos = [...document.querySelectorAll('header img, nav img, a[href="/"] img, img[class*="logo" i], img[alt*="logo" i], img[src*="logo" i], svg[class*="logo" i]')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 10 && r.top < 300; })
          .slice(0, 3).map(e => ({ tag: e.tagName, src: e.currentSrc || e.src || '', w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
        return { title: document.title, icons, logos };
      });
      out[gid] = { url: p.url(), ...info, files: [] };
      let i = 0;
      for (const ic of info.icons) {
        try { const r = await ctx.request.get(ic.href); if (r.ok()) { const buf = await r.body(); const ext = ic.href.split('?')[0].endsWith('.svg') ? 'svg' : 'img'; const fn = `raw/${gid}.pw_i${i++}.${ext}`; fs.writeFileSync(fn, buf); out[gid].files.push(fn); } } catch {}
      }
      // Screenshot the header logo element as a fallback (exact pixels the site shows).
      const el = await p.$('header img, nav img, a[href="/"] img, img[class*="logo" i], img[alt*="logo" i], img[src*="logo" i], svg[class*="logo" i]');
      if (el) { const bb = await el.boundingBox(); if (bb && bb.width > 20 && bb.y < 300) { const fn = `raw/${gid}.pw_logo.png`; await el.screenshot({ path: fn, omitBackground: true }); out[gid].logoShot = fn; } }
    } catch (e) { out[gid] = { error: String(e).slice(0, 100) }; }
    await p.close();
    console.log(gid, JSON.stringify({ t: out[gid].title, n: (out[gid].files||[]).length, shot: !!out[gid].logoShot, err: out[gid].error }));
  }
  fs.writeFileSync('pw.json', JSON.stringify(out, null, 1));
  await b.close();
})();
