# FitCheck — Design Spec
_2026-04-28_

## Overview

FitCheck is a Chrome extension (Manifest V3) that scans secondhand listing pages for garment measurements, compares them against the user's saved body measurements, and surfaces a fit verdict in the popup. No backend, no auth — all data lives in `chrome.storage.local`.

---

## Architecture & File Structure

```
/manifest.json               MV3 manifest — permissions, content script declarations
/popup/popup.html            Single file: HTML + embedded CSS + JS (360px wide)
/content/sites.js            Site registry — hostname → { selectors, titleSelector }
/content/parser.js           Measurement extraction, normalization, synonym mapping
/content/content.js          Injected on supported pages; listens for "scan" message → responds with parsed measurements
/icons/icon16.svg
/icons/icon48.svg
/icons/icon128.svg
/tests/parser-tests.js       runTests() — plain JS, logs pass/fail to console, no framework
```

`manifest.json` declares `content/content.js` (with `parser.js` as a module sibling) as content scripts on all URL patterns in the site registry, and requests the `storage` permission. The popup sends `chrome.tabs.sendMessage({ type: "scan" })` when it opens; the content script responds with `{ measurements: {...}, itemTitle: "..." }`.

---

## Site Registry

`content/sites.js` exports a registry object keyed by hostname. Each entry declares:

```js
{
  "www.depop.com": {
    descriptionSelectors: [".sc-item-description", "[data-testid='product-description']"],
    titleSelector: "[data-testid='product-name']",
  },
  "www.ebay.com": {
    descriptionSelectors: ["#viTabs_0_is", ".ux-layout-section--features"],
    titleSelector: ".x-item-title__mainTitle",
  },
  "www.poshmark.com": {
    descriptionSelectors: [".listing__description"],
    titleSelector: "h1.title",
  },
  "www.etsy.com": {
    descriptionSelectors: ["#product-details-content-toggle p"],
    titleSelector: "h1[data-product-details-title]",
  },
  "www.vinted.com": {
    descriptionSelectors: [".web_ui__Text--body"],
    titleSelector: "h1",
  }
}
```

Adding a new site = one new entry. No other code changes needed.

> **Note for implementation:** The CSS selectors listed above are approximate starting points. Each site's actual selectors must be verified against real listing pages before shipping — sites redesign frequently. Multiple fallback selectors per site are intentional; the content script should try each in order and use the first one that returns non-empty text.

---

## Data Model

All data stored in `chrome.storage.local` under two keys:

```js
// key: "profiles"
{
  profiles: [
    {
      id: "meg",            // URL-safe slug, stable identifier
      name: "Meg",
      measurements: {
        chest: 38,          // decimal inches; only keys the user has entered are present
        waist: 30,
        hips: 40,
        length: 27,
        sleeve: 24,
        inseam: 30,
        shoulders: 16
      }
    }
  ]
}

// key: "activeProfileId"
{ activeProfileId: "meg" }
```

**Canonical measurement keys:** `chest | waist | hips | length | sleeve | inseam | shoulders`

All values are stored as decimal inches. CM input is converted on entry and never stored as cm. Profiles only store measurements the user has explicitly entered.

---

## Parser

`parser.js` exports one function:

```js
parseListingText(str) → { chest: 38, waist: 30, ... }
```

Only keys with confident matches are present in the output.

### Pass 1 — Normalize

1. Strip HTML entities, collapse whitespace
2. Lowercase the entire string
3. Convert cm inline: replace `(\d+(\.\d+)?)\s*cm` with the inch equivalent (`× 0.3937`, rounded to 1 decimal)

### Pass 2 — Pattern matching

Patterns are applied to the full normalized string. First match wins per canonical key. Units accepted: `"`, `in`, `inch`, `inches` (all treated as inches after Pass 1 cm conversion).

**Synonym / label map:**

| Input label | Canonical key | Modifier |
|---|---|---|
| chest, across chest | chest | — |
| bust | chest | — |
| pit to pit, p2p, armpit to armpit | chest | × 2 |
| waist | waist | — |
| hips, hip | hips | — |
| length | length | — |
| sleeve | sleeve | — |
| inseam | inseam | — |
| shoulders, shoulder | shoulders | — |

**Pattern types (applied in priority order):**

1. **Label-first:** `<label>[:\s]+(\d+\.?\d*)\s*("|in|inches?)` — e.g. `chest: 38"`, `waist 30 inches`
2. **Shorthand block:** `B(\d+)\s*W(\d+)\s*H(\d+)` → chest/waist/hips
3. **Number-first (fallback):** `(\d+\.?\d*)\s*("|in|inches?)?\s*<label>` — e.g. `38" chest`, `30 inch waist`

Pit-to-pit and p2p matches apply a ×2 multiplier before storing.

**Test coverage (in `parser-tests.js`):**
- Prose sentences with label-first
- Bullet list format
- Table format (tab/pipe separated)
- Shorthand block (B38 W30 H40)
- CM values (converted to inches)
- Reversed order (number before label)
- Multi-measurement lines
- Pit-to-pit doubling
- Mixed units on same listing

---

## Fit Logic

### Per-measurement verdict

Comparison is `listingValue - profileValue` (positive = listing is larger):

| Delta | Verdict | Badge | Color |
|---|---|---|---|
| ≤ ±1" | fits | `fit` | green |
| +1" to +2" | listing is roomier | `roomy` | amber |
| −1" to −2" | listing is snugger | `snug` | amber |
| > +2" | listing much larger | `big` | blue |
| < −2" | listing much smaller | `tight` | red |

### Overall verdict

Computed from measurements present in *both* the listing and the active profile:

- **Likely fits** — all key measurements present are green AND ≥ 75% of all matched measurements are green
- **Likely won't fit** — any key measurement is red or blue (> 2" off)
- **Check measurements** — everything else (amber on key measurements, < 75% green overall, or fewer than 2 matched measurements)

**Key measurements** (hard gates): `chest`, `waist`, `hips`

A single red/blue on chest, waist, or hips triggers "Likely won't fit" regardless of other results. Length, sleeve, inseam, shoulders are informational and influence the verdict only when no key measurements are present.

If fewer than 2 measurements match between listing and profile, verdict is "Check measurements" with a sub-note: "Not enough data to be certain."

---

## Popup UI

**Visual style:** Clean & clinical — white background, neutral grays, data-forward. System UI font. 360px fixed width.

### Views

**View 1 — Main (measurements found)**
- Header: logo mark + "FITCHECK" wordmark | profile selector dropdown (changing selection immediately re-runs comparison against new profile) | ⚙ icon
- Verdict banner: colored background, verdict text, sub-line ("3 of 4 measurements pass")
- Measurement grid: one row per matched measurement — name | "you X" vs "listed Y" | pill badge
- Footer: site name + item title (if detected)

**View 2 — Empty state**
- Header (same)
- "No measurements found on this page" message
- Two manual entry options:
  - **Paste listing text** — textarea + "Try parsing" button → runs `parseListingText` → if results found, transitions to Main; if not, shows inline "Couldn't find measurements in that text" error
  - **Enter manually** — one input row per canonical measurement (label + number field + `"` suffix) → "Compare" button → transitions to Main

**View 3 — Settings (full page replace)**
- Header: ← back arrow + "Settings" title + "+ New profile" button
- Profile list: each profile as a card; active profile has bold border; tapping a profile selects it for editing (shows its measurements below) — it does NOT change the active comparison profile
- Active profile for comparison is set only via the header dropdown on the main/empty views
- Measurement rows for selected profile: label + editable value; "+ Add measurement" at bottom
- Deleting a profile: trash icon on each non-active profile card

**View 4 — Loading**
- Header + spinner
- Times out after 2 seconds → falls through to Empty state

### State transitions

```
Loading  →  Main       (content script returned measurements)
Loading  →  Empty      (no measurements found, or 2s timeout)
Empty    →  Main       (paste parse succeeded, or manual form submitted)
Main     →  Settings   (⚙ clicked)
Settings →  Main       (← clicked)
Any      →  Settings   (⚙ clicked)
```

---

## Content Script Communication

Popup → content script:
```js
chrome.tabs.sendMessage(tabId, { type: "scan" })
```

Content script response:
```js
{ measurements: { chest: 38, waist: 30 }, itemTitle: "Levi's 501 Jeans", site: "depop" }
```

Content script uses the active tab's hostname to look up the site registry entry, queries the declared selectors, concatenates their text content, and passes it to `parseListingText`. If no registry entry matches the current hostname, it responds with `{ measurements: {}, itemTitle: null, site: null }`.

---

## Icons

Three placeholder SVG icons at 16, 48, and 128px. Simple geometric mark — a small checkmark inside a circle, black on white. No external assets.

---

## Constraints

- Vanilla JS only — no frameworks, no build step
- Chrome Manifest V3
- No backend, no network requests, no auth
- All state in `chrome.storage.local`
- Single `popup.html` with embedded CSS and JS
