# HajjNoor Mobile (Android)

Capacitor WebView wrapper around `https://www.hajjnoor.com/dashboard/`. Ships as a signed `.apk` to `../media/download_app/HajjNoor-1.0.0.apk`.

The app is a thin native shell — it loads the live HajjNoor dashboard SPA in a fullscreen WebView, so feature updates ship instantly (deploy the SPA to Cloudflare; no Play Store re-release needed).

---

## Prereqs (one-time, Windows)

### 1. Node.js 18+
Already installed if you built the desktop app.

### 2. Java JDK 17
Capacitor / Gradle for Android Studio Giraffe+ requires JDK 17.

- Download: [adoptium.net](https://adoptium.net/) → Temurin 17 (LTS) → Windows MSI.
- Install with **"Set JAVA_HOME"** and **"Add to PATH"** checked.
- Verify in a new shell:
  ```cmd
  java -version
  echo %JAVA_HOME%
  ```
  Should print `openjdk version "17.x.x"` and a path like `C:\Program Files\Eclipse Adoptium\jdk-17.x`.

### 3. Android SDK

**Option A — Android Studio (easiest, ~3 GB):**
1. Install from [developer.android.com/studio](https://developer.android.com/studio).
2. First-launch wizard → install SDK Platform 34, Build-Tools 34.0.0, Platform-Tools.
3. Set env var (auto-set by Studio):
   ```cmd
   setx ANDROID_HOME "C:\Users\aassh\AppData\Local\Android\Sdk"
   ```

**Option B — Command-line tools only (~500 MB, no IDE):**
1. Download "Command line tools only" from [developer.android.com/studio](https://developer.android.com/studio#command-tools).
2. Unzip to `C:\Android\cmdline-tools\latest\`.
3. Set env vars:
   ```cmd
   setx ANDROID_HOME "C:\Android"
   setx PATH "%PATH%;C:\Android\cmdline-tools\latest\bin;C:\Android\platform-tools"
   ```
4. Accept licenses + install SDK pieces:
   ```cmd
   sdkmanager --licenses
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```

Verify:
```cmd
adb --version
```

---

## Build (debug APK, fast, unsigned)

Debug APK is signed with Android's auto-generated debug key — installs on any device but **not** accepted by Play Store.

```cmd
cd C:\Users\aassh\OneDrive\Desktop\hajjnoor_26\hajjnoor\mobile_app
npm install
npm run init:android          # one-time — adds android/ folder
npm run apk:debug             # builds + copies to ../media/download_app/HajjNoor-1.0.0.apk
```

First gradle build downloads ~500 MB (Gradle wrapper + Android Gradle Plugin + AndroidX libs). Slow (~5–15 min). Subsequent builds are 30–60 s.

Output:
```
media/download_app/HajjNoor-1.0.0.apk
```

Side-load on phone: USB-debug a device + run `adb install`, or just open the `.apk` link from `/download/` page on the phone's browser and tap **Install**.

---

## Build (release APK, signed, distributable)

### 1. Generate a release keystore (one-time)

```cmd
keytool -genkey -v -keystore hajjnoor-release.keystore -alias hajjnoor -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts. **Save** the keystore file + password — losing it means you can never update the app.

### 2. Wire keystore into Gradle

Create `mobile_app/android/keystore.properties` (gitignored):
```properties
storeFile=../../hajjnoor-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=hajjnoor
keyPassword=YOUR_KEY_PASSWORD
```

Edit `mobile_app/android/app/build.gradle` — add inside `android { ... }`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### 3. Build release APK

```cmd
npm run apk:release
```

Output:
```
media/download_app/HajjNoor-1.0.0.apk
```
This is the signed, distributable APK.

---

## Update the Django download link

The Django page at `/download/` already points at `../media/download_app/HajjNoor-1.0.0.apk` (configured in `core/views/public.py::DownloadAppView.get_context_data`). Bump the version there + in `mobile_app/package.json` + the `copy:apk:*` scripts together when releasing.

Or refactor to a single source of truth in `hajjnoor/settings.py`:
```python
DESKTOP_APP_VERSION = '1.0.0'
DESKTOP_APP_INSTALLER = f'HajjNoorSetup-{DESKTOP_APP_VERSION}.exe'
MOBILE_APP_APK = f'HajjNoor-{DESKTOP_APP_VERSION}.apk'
```
Then read these in the view.

---

## Production hosting on Render

Same caveat as the Windows installer: Render free tier has ephemeral disk, and the project uses Cloudinary for media in production. Host both `.exe` and `.apk` on **GitHub Releases** (recommended) or Cloudinary raw upload, and replace the `{{ media_url }}download_app/...` URLs with the public asset URLs.

---

## Updating the wrapped URL

Edit `mobile_app/capacitor.config.json`:
```json
"server": { "url": "https://your-new-domain.com/" }
```
Then:
```cmd
npm run sync
npm run apk:release
```

---

## What the app does

- Loads `https://www.hajjnoor.com/dashboard/` in a fullscreen Android WebView.
- HTTPS-only (`cleartext: false`).
- Navigation locked to `www.hajjnoor.com` and subdomains; other links open in the user's default browser via Capacitor's intent filter.
- Status bar tinted to HajjNoor green (`#0f4d3a`).
- No Play Store dependency — distributed as a side-load APK.

---

## Play Store (later)

When ready:
1. Build a signed **AAB** (Android App Bundle), not APK: `gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
2. Register a Play Console developer account ($25 one-time).
3. Upload AAB, fill listing, submit for review (~1–3 days).

For Play Store you also want a proper PWA + TWA (Trusted Web Activity) via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) instead of Capacitor — smaller, native look, but requires the Django site to be a full PWA (manifest + service worker). Defer until needed.
