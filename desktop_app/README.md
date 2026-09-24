# HajjNoor Desktop (Windows)

Electron wrapper around `https://www.hajjnoor.com/dashboard/`. Ships as an NSIS installer (`HajjNoorSetup-x.y.z.exe`) and a portable `.exe`.

## Prereqs (one-time)

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- A 256x256 multi-resolution `icon.ico` placed at `build/icon.ico`
  - Quick option: convert your logo SVG/PNG with [icoconvert.com](https://icoconvert.com) or `electron-icon-builder`.

## Develop

```powershell
cd desktop_app
npm install
npm start          # opens app window pointing at www.hajjnoor.com
```

## Build installers

```powershell
npm run build               # both NSIS + portable
# or:
npm run build:installer     # only HajjNoorSetup-x.y.z.exe
npm run build:portable      # only HajjNoorPortable-x.y.z.exe
```

Output is written to `../media/download_app/`:

```
media/download_app/
├── HajjNoorSetup-1.0.0.exe        ← linked from /download/ page
└── HajjNoorPortable-1.0.0.exe
```

The Django download page at `/download/` references these filenames. If you bump the version in `package.json`, also update `installer_filename` / `portable_filename` in `core/views/public.py::DownloadAppView.get_context_data` and the `app_version` value.

## Distribution

### Local dev / single Render instance
Files in `media/download_app/` are served by Django's media handler when `DEBUG=True`. Works for local testing only.

### Production on Render (free / starter)
Render's filesystem is **ephemeral** — anything written to `media/` is lost on redeploy. The project also has Cloudinary as default media storage when `CLOUDINARY_*` env vars are set, so `{{ MEDIA_URL }}download_app/...` will resolve through Cloudinary's CDN if you upload there.

**Recommended:** host the `.exe` artefacts on **GitHub Releases** (free, versioned, CDN-backed):

1. Push a tag (e.g. `desktop-v1.0.0`) and create a release.
2. Attach `HajjNoorSetup-1.0.0.exe` + `HajjNoorPortable-1.0.0.exe` as release assets.
3. Replace the `{{ MEDIA_URL }}download_app/...` URLs in `templates/core/public/download.html` with the release asset URLs, or move them to a `DESKTOP_APP_*` setting in `hajjnoor/settings.py` and inject via a context processor.

**Alternative:** upload as Cloudinary `resource_type=raw` and use the returned URL.

## Code signing (defer until launch)

Unsigned builds trigger Windows SmartScreen "Unknown publisher" on every install. Options when you are ready to ship publicly:

- OV code-signing cert: ~$200/yr (Sectigo, DigiCert) — slow SmartScreen reputation build-up.
- EV code-signing cert: ~$300–500/yr — instant SmartScreen reputation, requires hardware token.

Wire into `electron-builder` by adding to `package.json > build > win`:

```jsonc
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": null   // set via CSC_KEY_PASSWORD env var
}
```

Then build with:

```powershell
$env:CSC_LINK = "path\to\cert.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
npm run build
```

Until signing is set up, the `/download/` page already warns users about the SmartScreen prompt.

## What the app does

- Loads `https://www.hajjnoor.com/dashboard/` in a single window (1280x800, min 960x600).
- Native menu: Home / Back (Alt+Left) / Forward (Alt+Right) / Refresh (F5) / Quit.
- Zoom controls + fullscreen (F11).
- External links (anything not on `www.hajjnoor.com`) open in the user's default browser via `shell.openExternal`.
- Sandbox + `contextIsolation` enabled, no Node integration in the renderer.
- Single-instance lock: launching twice focuses the existing window.

## Updating to a new Django site URL

Edit `main.js`:

```js
const APP_URL = 'https://your-new-domain.com/';
```

Then rebuild and redistribute.
