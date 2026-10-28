# MOM Recorder (Android APK)

1. Push this folder to a GitHub repo (branch `main`).
2. Open the repo's **Actions** tab -> **Build Android APK** (runs automatically on push, or click *Run workflow*).
3. When it finishes (~5-8 min), open the run and download **MOM-Recorder-apk** under *Artifacts*. Unzip -> `app-debug.apk`.
4. Copy to the phone and install (allow "Install unknown apps" when asked).

Edit the app in `www/index.html`; every push rebuilds the APK.
