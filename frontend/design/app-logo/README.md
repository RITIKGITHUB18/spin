# SPIN — PWA icon + splash assets

Marks 2a (full front loader), 2b (machine + S door), 2c (drum + dial).
Pick one set and drop the files into your PWA's /public or /icons folder.

Files per mark:
- spin-2c-512.png  — icon, any purpose
- spin-2c-192.png  — icon, any purpose
- spin-2c-180.png  — apple-touch-icon
- spin-2c-maskable-512.png — maskable (mark inset to the 80% safe zone, black bleed)

Splash:
- spin-splash-light-1080x1920.png
- spin-splash-dark-1080x1920.png

## manifest.json

{
  "name": "SPIN",
  "short_name": "SPIN",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/spin-2c-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/spin-2c-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/spin-2c-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}

## index.html head

<link rel="apple-touch-icon" sizes="180x180" href="/icons/spin-2c-180.png">
<link rel="apple-startup-image" href="/icons/spin-splash-light-1080x1920.png">
<meta name="theme-color" content="#000000">

Android/Chrome generates its own splash from the 512 icon + name + background_color, so
the 1080x1920 files are mainly for iOS startup images and for any custom in-app splash.
