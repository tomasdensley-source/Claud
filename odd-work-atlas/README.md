# Odd-Work Atlas (source)

A personal gig-work command center for Android. See [DESCRIPTION.md](DESCRIPTION.md) for what it is and how it works.

**Install:** download `release/odd-work-atlas.apk` on the phone and open it (allow "Install unknown apps" for your browser or Files app when asked).

## Stack

- React 19 + TypeScript + Vite (the UI)
- Capacitor 7 (the Android shell: back button, files, share sheet, status bar)
- Data in on-device storage, plus an automatic private copy in app files

## Layout

| Path | What |
|---|---|
| `data/odd-work-atlas-claude-code-brief-2026-11-22.md` | The brief. Appendix A is the seed source |
| `scripts/build-seed.mjs` | Parses Appendix A into `src/data/seed.json` (fails unless exactly 340 records) |
| `src/data/liveState.ts` | The Nov 22, 2026 live state, rules, Top 10/25, and the added CDS record |
| `src/store.ts` | State, persistence, backup/restore |
| `src/metrics.ts` | Door-to-door $/hr and $/mile, floors |
| `src/selectors.ts` | Today, queue, calendar and search logic |
| `src/nav.tsx` | Screen stack and Android Back button rules |
| `src/screens/` | The screens |
| `resources/` | Icon artwork; `scripts/build-icons.mjs` renders launcher and splash sizes |
| `android/` | The Capacitor Android project |

## Build

```bash
npm install
npm run build            # seed + typecheck + web bundle
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Needs JDK 21 and the Android SDK (platform 35, build-tools 35). `android/app/debug.keystore` is a committed debug key with the standard public password, so every build has the same signature and installs over the last one without losing data.
