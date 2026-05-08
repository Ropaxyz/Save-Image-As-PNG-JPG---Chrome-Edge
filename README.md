# Save Image As PNG/JPG (Manifest V3)

Chromium extension (Chrome / Edge) that adds a right‑click menu on images:
**Save Image As… → PNG / JPG**. Handy for converting WebP (and other formats)
into PNG or JPG without using online converters.

## Usage

Right‑click an image and pick:

- **Save Image As… → PNG** (keeps transparency)
- **Save Image As… → JPG** (transparency is flattened onto white)

## How it works

Manifest V3 service workers can’t access the DOM/canvas, so conversion runs in
an **offscreen document** (`offscreen.html` + `offscreen.js`) which decodes the
image and re-encodes it via a hidden `<canvas>`.

To avoid tainted canvases, the offscreen document downloads the image bytes
directly (requires `host_permissions`) and decodes from a `blob:` URL.

## Install (developer / unpacked)

1. Open the Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Permissions

| Permission     | Why it’s needed                                                          |
| -------------- | ------------------------------------------------------------------------- |
| `contextMenus` | Adds the right‑click menu on images.                                      |
| `downloads`    | Saves the converted file.                                                 |
| `offscreen`    | Runs conversion in an offscreen page (service workers can’t use canvas).  |
| `<all_urls>`   | Fetches image bytes so the canvas isn’t tainted by cross‑origin images.   |

No content scripts are injected. The extension only runs when you click its
menu item.

## Troubleshooting

- **Conversion fails**: open `chrome://extensions`, click the extension’s
  **service worker** link, and check the Console for the error (403/404, etc.).
- **Filename looks wrong**: the name is derived from the image URL path. If the
  URL has no filename, it falls back to `image.png` / `image.jpg`.
- **Right‑click menu missing**: it only shows when you right‑click an actual
  image element. For CSS background images, try opening the image in a new tab.

## License

MIT
