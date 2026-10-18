# Fieldnote — Infinite Canvas (Expo)

A faithful Expo / React Native recreation of
[Fieldnote](https://infinite-canvas-board.glitzypixie.chatgpt.site): a private,
device-local infinite workspace for text, images, files, folders, tasks, mind
maps, regions, and freehand drawings.

Built for **Android** (Expo Go + installable APK).

## Features

- Infinite pan / pinch-zoom canvas with warm cream dot grid
- Seed demo board matching Fieldnote (“A place for unfinished ideas…”)
- Floating walnut toolbar: Add, Boards, Files, Multi, Draw, Find, More
- Add panel: device files / photos, text, task, mind map, region
- Multiple boards with local autosave (AsyncStorage)
- Working files panel, search, undo/redo, gestures guide, storage controls
- Import/export boards as JSON Canvas 1.0 (lossless round-trip), plus a
  one-tap Repair Map for AI-generated boards with broken coordinates
- Vertical color palette (default closed): frame vs. body toggle, 8 presets,
  5 persistent custom slots (hold a slot to save the last color used)
- Compact, top-anchored, auto-dismissing notifications with Undo — replaces
  centered alerts for deletes, imports, and board repairs
- Purposeful haptics on key actions (edit, toggle task, delete, color, drop);
  ~500ms deliberate hold-to-edit; gentle alignment snapping when you drop a
  dragged card near another one's edge or center
- Resizable cards: drag any of the 4 corner handles on a selected card
- Text cards render Markdown (headings, lists, bold/italic, inline code,
  links); task labels render inline Markdown too
- Tasks complete with a deliberate 3s hold (progressive glow + haptic pop),
  not an accidental tap; a quick tap only un-completes a done task
- Colored regions layer as distinct nested background sections — computed
  purely from geometry (which region contains which), no extra setup
- Minimap + zoom controls + Fit board
- Long-press cards to edit; hold empty canvas to open Add

## Project layout

```
App.tsx
src/
  theme.ts                 Fieldnote color tokens
  types.ts
  store/BoardContext.tsx   Boards, selection, history, persistence
  lib/seed.ts              Demo board content
  lib/storage.ts           AsyncStorage
  lib/camera.ts            Zoom/pan clamp + coordinate math
  lib/jsoncanvas.ts        JSON Canvas 1.0 import/export
  lib/normalize.ts         Coordinate repair for broken/AI-generated boards
  lib/snapping.ts          Alignment-snap math for item dragging
  lib/haptics.ts           Thin, always-safe expo-haptics wrapper
  lib/resize.ts            Corner-handle resize geometry
  lib/markdown.ts          Dependency-free Markdown subset (parse only)
  lib/taskBlocking.ts      isTaskBlocked — task dependency primitive
  components/Markdown.tsx Renders parsed Markdown to RN Text/View
  lib/regionLayers.ts      Region nesting depth + background render order
  components/Palette.tsx  Vertical color palette (frame/body, custom slots)
  components/Toast.tsx    Compact top notification with Undo
  components/              Canvas, toolbar, minimap, panels
eas.json                   EAS Build profiles (preview → APK)
```

## Run with Expo Go (Android)

```bash
cd fieldnote
npm install
npx expo start
```

Install **Expo Go** on your Android phone, then scan the QR code.

## Download an installable APK (CI)

Every push/PR runs `.github/workflows/fieldnote-build.yml`, which type-checks,
runs smoke tests, and builds a **standalone release** Android APK via
`expo prebuild` + Gradle (`:app:assembleRelease`). The release variant embeds
the JS bundle and is signed with the debug keystore Expo generates, so the APK
runs on any device without a Metro dev server — the same kind of artifact
`eas build --profile preview` makes, but with no Expo account required.

1. Open the repo **Actions** tab → latest **Fieldnote Build** run
2. Download the **`fieldnote-android-apk`** artifact (`fieldnote-1.5.0.apk`)
3. Install on Android (allow unknown sources / "install unknown apps" if prompted)

## EAS Build (optional)

```bash
cd fieldnote
npx eas-cli build -p android --profile preview
```

`preview` produces an installable APK. `production` targets an AAB.

## Scripts

```bash
npm start          # Expo dev server
npm run typecheck  # tsc --noEmit
npm test           # seed smoke tests
```
