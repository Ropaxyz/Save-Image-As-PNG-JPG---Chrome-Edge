# Privacy Policy

**Extension:** Save Image As PNG/JPG  
**Last updated:** 2026-05-08

## Overview

Save Image As PNG/JPG lets you right‑click an image and save it as a PNG or JPG.
The extension only runs when you choose its context‑menu action.

## Data collection

- No personal data is collected.
- No analytics, tracking, ads, or telemetry are included.
- No accounts are used and no identifying information is requested.

## Data usage

When you click the extension’s menu item, it downloads the selected image,
converts it locally in your browser using an offscreen canvas, and saves the
converted file to your device using the browser’s downloads API.

The extension does not sell, share, or transfer user data to third parties.

## Network access

The extension may make a network request to the image URL only to download the
image you selected for conversion. No other network requests are made for
analytics or advertising.

## Data storage

The extension does not store browsing history or converted images on external
servers. Converted files are saved only to the download location you choose.

## Permissions rationale

- **contextMenus**: shows “Save Image As… → PNG/JPG” when you right‑click an image
- **downloads**: saves the converted image file to your device
- **offscreen**: runs conversion in an offscreen page (Manifest V3 requirement)
- **Host access (`<all_urls>`)**: downloads the selected image bytes reliably

## Contact

For privacy questions, use the support/contact link in the store listing.
