// background.js - MV3 service worker
// Responsibilities:
//   1. Register the "Save Image As..." context menu (PNG / JPG sub-items).
//   2. On click, ensure an offscreen document exists.
//   3. Ask the offscreen document to fetch + convert the image via <canvas>.
//   4. Trigger chrome.downloads.download with the resulting data URL.

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const PARENT_ID = 'wp2png-save-image-as';
const PNG_ID = 'wp2png-save-as-png';
const JPG_ID = 'wp2png-save-as-jpg';

// ---------- Context menu registration ----------

function createMenus() {
  // Remove any existing entries to avoid duplicate-id errors on reload.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: PARENT_ID,
      title: 'Save Image As\u2026',
      contexts: ['image']
    });
    chrome.contextMenus.create({
      id: PNG_ID,
      parentId: PARENT_ID,
      title: 'PNG',
      contexts: ['image']
    });
    chrome.contextMenus.create({
      id: JPG_ID,
      parentId: PARENT_ID,
      title: 'JPG',
      contexts: ['image']
    });
  });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

// ---------- Click handler ----------

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.srcUrl) return;

  let format;
  if (info.menuItemId === PNG_ID) format = 'png';
  else if (info.menuItemId === JPG_ID) format = 'jpg';
  else return;

  try {
    const dataUrl = await convertImage(info.srcUrl, format, tab);
    const filename = buildFilename(info.srcUrl, format);

    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: true
    });
  } catch (err) {
    // Service-worker logs are visible at chrome://extensions -> "service worker"
    // (or edge://extensions). The downloads shelf will simply not appear.
    console.error('[WebP\u2192PNG/JPG] Conversion failed:', err);
  }
});

// ---------- Conversion plumbing ----------

async function convertImage(srcUrl, format, tab) {
  await ensureOffscreenDocument();

  // Pass along the page URL as a Referer hint so the offscreen fetch can
  // attempt to bypass hot-link protection where possible.
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'convert-image',
    srcUrl,
    format,
    pageUrl: tab && tab.url ? tab.url : null
  });

  if (!response || !response.ok) {
    throw new Error((response && response.error) || 'Unknown conversion error');
  }
  return response.dataUrl;
}

// ---------- Offscreen document management ----------

let creatingOffscreen = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  // Chrome 116+: getContexts is the canonical way to check for a live
  // offscreen document.
  if (chrome.runtime.getContexts) {
    const existing = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    if (existing.length > 0) return;
  } else if (chrome.offscreen.hasDocument) {
    // Defensive fallback for older builds.
    if (await chrome.offscreen.hasDocument()) return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['BLOBS'],
    justification:
      'Use a hidden HTML5 canvas to decode WebP source images and re-encode as PNG or JPEG.'
  });
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

// ---------- Helpers ----------

function buildFilename(srcUrl, format) {
  let name = 'image';
  try {
    const url = new URL(srcUrl);
    const last = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
    if (last) name = decodeURIComponent(last);
  } catch (_) {
    // Leave name = 'image'
  }

  // Strip any existing extension.
  const dot = name.lastIndexOf('.');
  let base = dot > 0 ? name.substring(0, dot) : name;

  // chrome.downloads.download disallows certain characters in filenames.
  base = base.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
  if (!base) base = 'image';

  return `${base}.${format}`;
}
