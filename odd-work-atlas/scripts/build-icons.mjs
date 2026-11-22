// Renders the app icon into every Android launcher and splash size.
// Source art: resources/icon-source.png (1024px, full bleed).
// resources/icon-adaptive.png is the same art with the teal background
// extended outward, so the artwork sits inside Android's adaptive-icon safe zone.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'android/app/src/main/res');
const adaptive = join(root, 'resources/icon-adaptive.png');

// The part of the adaptive layer a launcher actually shows (72 of 108 dp).
const VISIBLE = Math.round(1024 * (72 / 108));
const OFF = Math.round((1024 - VISIBLE) / 2);
const visible = await sharp(adaptive).extract({ left: OFF, top: OFF, width: VISIBLE, height: VISIBLE }).png().toBuffer();

const mask = (s, round) =>
  Buffer.from(
    round
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.22}"/></svg>`,
  );
const shaped = async (s, round) =>
  sharp(await sharp(visible).resize(s, s).png().toBuffer())
    .composite([{ input: mask(s, round), blend: 'dest-in' }])
    .png()
    .toBuffer();

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  const dir = join(res, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  const legacy = Math.round(48 * k);
  const layer = Math.round(108 * k);
  await sharp(await shaped(legacy, false)).toFile(join(dir, 'ic_launcher.png'));
  await sharp(await shaped(legacy, true)).toFile(join(dir, 'ic_launcher_round.png'));
  await sharp(adaptive).resize(layer, layer).png().toFile(join(dir, 'ic_launcher_background.png'));
  await sharp({ create: { width: layer, height: layer, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toFile(join(dir, 'ic_launcher_foreground.png'));
}

// The artwork is the background layer; the foreground stays empty.
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
writeFileSync(join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptiveXml);
writeFileSync(join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptiveXml);

// Splash: the rounded icon centered on the app's light background.
const splashSizes = {
  'port-mdpi': [320, 480], 'port-hdpi': [480, 800], 'port-xhdpi': [720, 1280], 'port-xxhdpi': [960, 1600], 'port-xxxhdpi': [1280, 1920],
  'land-mdpi': [480, 320], 'land-hdpi': [800, 480], 'land-xhdpi': [1280, 720], 'land-xxhdpi': [1600, 960], 'land-xxxhdpi': [1920, 1280],
};
const splash = async (w, h, file) => {
  const s = Math.round(Math.min(w, h) * 0.34);
  await sharp({ create: { width: w, height: h, channels: 4, background: '#F6F5F1' } })
    .composite([{ input: await shaped(s, false), left: Math.round((w - s) / 2), top: Math.round((h - s) / 2) }])
    .png()
    .toFile(file);
};
for (const [k, [w, h]] of Object.entries(splashSizes)) await splash(w, h, join(res, `drawable-${k}`, 'splash.png'));
await splash(480, 800, join(res, 'drawable', 'splash.png'));

// Android 12+ splash icon: the artwork in a circle.
await sharp(await shaped(432, true)).toFile(join(res, 'drawable', 'splash_icon.png'));

// Web favicon and a 512px copy for docs.
await sharp(await shaped(512, false)).toFile(join(root, 'public/icon.png'));
await sharp(await shaped(512, false)).toFile(join(root, 'resources/icon-512.png'));
console.log('icons and splash written');
