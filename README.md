# Hajjnoor Apps

Desktop (Windows) and Mobile (Android) wrappers around [hajjnoor.onrender.com](https://hajjnoor.onrender.com/).

This repo is intentionally separate from the main Hajjnoor Django repo:

- Public + safe to share (no Django code, no secrets, no data).
- Unlimited free GitHub Actions minutes (public repos).
- Builds artifacts are attached to GitHub Releases — Hajjnoor's `/download/` page links straight to those URLs.

## Layout

```
hajjnoor-apps/
├── desktop_app/                Electron (Windows .exe via NSIS installer)
├── mobile_app/                 Capacitor (Android .apk via Gradle)
└── .github/workflows/
    ├── windows-exe.yml         Builds .exe on tag push
    └── android-apk.yml         Builds .apk on tag push
```

## How releases work

1. Bump the version in `desktop_app/package.json` and `mobile_app/package.json`.
2. Commit + push.
3. Create + push a tag, e.g.:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. Both workflows trigger — Ubuntu runner builds Android APK, Windows runner builds NSIS installer.
5. Both artifacts auto-uploaded to a new **GitHub Release** named after the tag.
6. Public download URLs (used by Hajjnoor's `/download/` page):
   ```
   https://github.com/asharislam/hajjnoor-apps/releases/latest/download/HajjnoorSetup-x.y.z.exe
   https://github.com/asharislam/hajjnoor-apps/releases/latest/download/Hajjnoor-x.y.z.apk
   ```
   The `/latest/download/` redirect resolves to whatever the newest release is — Hajjnoor's HTML never has to bump URLs.

## Manual build (Windows .exe locally)

Needs Node 18+, Windows + admin terminal or Developer Mode ON.

```cmd
cd desktop_app
npm install
npm run build:installer
```

Output → `desktop_app/dist/HajjnoorSetup-x.y.z.exe`.

## Manual build (Android .apk locally)

Needs Node 18+, JDK 17, Android SDK (cmdline-tools or Studio). Heavy. Prefer CI.

```cmd
cd mobile_app
npm install
npm run init:android
npm run build:debug:win
```

Output → `mobile_app/android/app/build/outputs/apk/debug/app-debug.apk`.

## CI builds

Trigger:
- **Push a tag** matching `v*` → release build + GitHub Release auto-created.
- Or **manual** via GitHub UI → Actions tab → workflow → "Run workflow" button.

Path filters mean CI only fires for changes inside `desktop_app/`, `mobile_app/`, or `.github/workflows/`. Documentation edits don't waste minutes.

## What the apps do

**Desktop (Electron):**
- Loads `https://hajjnoor.onrender.com/` in a 1280x800 BrowserWindow.
- Native menu: Home / Back / Forward / Refresh / Quit / Zoom / Fullscreen.
- External links (anything outside the Hajjnoor domain) open in the user's default browser.
- Sandbox + contextIsolation enabled.

**Mobile (Capacitor):**
- Loads `https://hajjnoor.onrender.com/` in a fullscreen Android WebView.
- HTTPS-only.
- Status bar tinted Hajjnoor green.
- External links open in default browser via Android intent.

## Updating the wrapped URL

Both wrappers hardcode `https://hajjnoor.onrender.com/`. To point at a new domain:

- `desktop_app/main.js` — change `APP_URL`
- `mobile_app/capacitor.config.json` — change `server.url` + `allowNavigation`

Then bump version + push a new tag.

## Code signing

Both unsigned currently:

- **Windows**: triggers SmartScreen "Unknown publisher". OV cert ~$200/yr or EV cert ~$300/yr removes it. Wire via electron-builder `win.certificateFile` + GitHub secret `WIN_CSC_LINK`.
- **Android**: debug-signed APKs install fine outside Play Store. For Play Store: generate a release keystore, store it as a GitHub secret, sign via Gradle `signingConfigs.release`.
