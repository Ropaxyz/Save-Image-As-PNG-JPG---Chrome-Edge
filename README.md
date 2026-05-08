# WebP to PNG / JPG Converter (Manifest V3)

A tiny Chromium extension (Chrome / Edge / Brave / Opera) that adds a
**Save Image As\u2026 \u203a PNG / JPG** entry to the right-click menu on any image.
It is built specifically to rescue images that browsers serve as `.webp` and
that you'd rather keep as `.png` or `.jpg`.

## How it works

Service workers in MV3 cannot touch the DOM, so the extension uses an
**offscreen document** as a canvas host:

```
right-click image
        \u2193
contextMenus.onClicked  (background.js)
        \u2193
chrome.offscreen.createDocument(...)
        \u2193
fetch(srcUrl)  \u2192  createImageBitmap  \u2192  <canvas>.toDataURL(mime)
        \u2193
chrome.downloads.download({ url: dataUrl, filename, saveAs: true })
```

CORS / tainted-canvas issues are mitigated by:

- Requesting `host_permissions: ["<all_urls>"]` so `fetch()` from the offscreen
  document gets the raw bytes regardless of `Access-Control-Allow-Origin`.
- Wrapping the bytes as a `Blob` and decoding via `createImageBitmap` (or a
  fallback `<img>` with `crossOrigin="anonymous"` pointed at a `blob:` URL,
  which is same-origin to the extension).
- Falling back to `data:` URL parsing when the source is itself a data URI.

JPG output paints a white background first because JPEG has no alpha channel.

## File layout

```
manifest.json        \u2014 MV3 manifest (contextMenus, downloads, offscreen)
background.js        \u2014 Service worker: menus + offscreen orchestration
offscreen.html       \u2014 Hidden host page for the canvas
offscreen.js         \u2014 fetch \u2192 decode \u2192 canvas \u2192 toDataURL
icons/
  icon16.png
  icon48.png
  icon128.png
generate-icons.ps1   \u2014 Optional: regenerate placeholder icons
```

## Install (developer / unpacked)

1. Clone or download this folder.
2. (Optional) regenerate the placeholder icons by running
   `powershell -ExecutionPolicy Bypass -File .\generate-icons.ps1` \u2014
   the icons are already committed, this is only needed if you want to swap
   the artwork.
3. Open **chrome://extensions** (or **edge://extensions**).
4. Toggle **Developer mode** on.
5. Click **Load unpacked** and pick this folder.
6. Browse to any page with a `.webp` image, right-click it, and choose
   **Save Image As\u2026 \u203a PNG** (or **JPG**).
7. The native "Save As" dialog appears with the filename pre-filled
   (`originalname.png` / `.jpg`).

## Permissions explained

| Permission     | Why it's needed                                                        |
| -------------- | ---------------------------------------------------------------------- |
| `contextMenus` | Add the "Save Image As\u2026" right-click entry on images.                  |
| `downloads`    | Trigger `chrome.downloads.download` for the converted data URL.        |
| `offscreen`    | Spin up the hidden DOM/canvas host (service workers can't use canvas).|
| `<all_urls>`   | Fetch the raw image bytes from any host without CORS / hot-link traps. |

No content scripts are injected and no analytics are sent anywhere; the
extension only acts when you click its menu item.

## Troubleshooting

- **"Conversion failed" in the service-worker console**\
  Open `chrome://extensions`, click the extension's **service worker** link,
  and check the Console tab for the underlying error (network 403, CORS, etc.).
- **The download dialog shows the wrong filename**\
  The original filename is taken from the URL path. URLs that end in
  `?id=123` with no `.webp` segment will fall back to `image.png` / `image.jpg`.
- **Image looks black where it should be transparent (JPG)**\
  Expected \u2014 JPEG has no alpha channel. Pick **PNG** instead.
- **Right-click menu missing**\
  The menu only appears in the "image" context, i.e. when you right-click
  directly on an `<img>` element or a CSS background image isn't a real `<img>`.
  Try opening the image in its own tab and right-clicking there.

## License

MIT \u2014 do whatever you like.
