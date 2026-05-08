// offscreen.js
// Runs inside the hidden offscreen document. Receives a "convert-image"
// message from background.js, fetches the image, draws it onto a <canvas>,
// then exports a data URL in the requested format.

const JPEG_QUALITY = 0.95;

// One conversion at a time: all callers share the same <canvas>; parallel jobs
// would interleave resize/draw/export and corrupt output.
let convertTail = Promise.resolve();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== 'offscreen') return false;
  if (message.type !== 'convert-image') return false;

  convertTail = convertTail
    .then(async () => {
      try {
        const dataUrl = await convertImage(
          message.srcUrl,
          message.format,
          message.pageUrl || null
        );
        sendResponse({ ok: true, dataUrl });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err && err.message ? err.message : String(err)
        });
      }
    })
    .catch(() => {
      /* keep queue alive after unexpected rejects */
    });

  return true;
});

async function convertImage(srcUrl, format, pageUrl) {
  if (!srcUrl) throw new Error('Missing srcUrl');
  if (format !== 'png' && format !== 'jpg') {
    throw new Error('Unsupported format: ' + format);
  }

  const blob = await fetchImageBlob(srcUrl, pageUrl);
  const source = await blobToDrawable(blob);
  return drawAndExport(source, format);
}

// ---------- Fetch ----------

async function fetchImageBlob(srcUrl, pageUrl) {
  const refer = pageUrl && /^https?:/i.test(pageUrl) ? { referrer: pageUrl } : {};

  // Step 1: same-origin / CORS-friendly fetch. Host permission for <all_urls>
  // means the extension origin can request the bytes directly, avoiding the
  // tainted-canvas problem that breaks <img crossorigin> on hot-link-protected
  // servers.
  let lastErr;
  try {
    const res = await fetch(srcUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      ...refer
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
    lastErr = new Error('HTTP ' + res.status);
  } catch (e) {
    lastErr = e;
  }

  // Step 2: retry without forcing CORS (extension origin still has access via
  // host_permissions, but some CDNs reject explicit Origin headers).
  try {
    const res = await fetch(srcUrl, {
      method: 'GET',
      credentials: 'omit',
      ...refer
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) return blob;
    }
    lastErr = new Error('HTTP ' + res.status);
  } catch (e) {
    lastErr = e;
  }

  // Step 3: data: URL? Just turn it into a blob directly.
  if (srcUrl.startsWith('data:')) {
    return dataUrlToBlob(srcUrl);
  }

  throw new Error(
    'Could not download image: ' +
      (lastErr && lastErr.message ? lastErr.message : 'unknown error')
  );
}

function dataUrlToBlob(dataUrl) {
  const [meta, payload] = dataUrl.split(',', 2);
  const isBase64 = /;base64$/i.test(meta.split(';').slice(1).join(';'));
  const mime = (meta.match(/^data:([^;,]+)/i) || [])[1] || 'application/octet-stream';
  const bytes = isBase64
    ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return new Blob([bytes], { type: mime });
}

// ---------- Decode ----------

async function blobToDrawable(blob) {
  // createImageBitmap supports webp natively in modern Chromium and is the
  // cheapest path. Fall back to <img> if the codec rejects it for any reason.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch (_) {
      /* fall through */
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Even though we already have the bytes locally as a blob: URL (which is
    // same-origin to the extension), set crossOrigin to be safe for any
    // future code path that hands us an http(s) URL directly.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = src;
  });
}

// ---------- Encode ----------

function drawAndExport(source, format) {
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) {
    throw new Error('Decoded image has zero dimensions');
  }

  const canvas = document.getElementById('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (format === 'jpg') {
    // JPEG has no alpha channel - paint a white background so transparent
    // pixels don't end up rendered as black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.drawImage(source, 0, 0, width, height);

  // Release ImageBitmap GPU memory ASAP.
  if (typeof source.close === 'function') {
    try { source.close(); } catch (_) { /* ignore */ }
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  try {
    return format === 'jpg'
      ? canvas.toDataURL(mime, JPEG_QUALITY)
      : canvas.toDataURL(mime);
  } catch (e) {
    throw new Error(
      'Canvas export failed (likely a tainted canvas / CORS issue): ' +
        (e && e.message ? e.message : String(e))
    );
  }
}
