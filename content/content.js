// content/content.js
// Depends on FITCHECK_SITES (sites.js) and parseListingText (parser.js)
// injected first via manifest content_scripts ordering.

// ── Sub-frame relay ───────────────────────────────────────────────────────────
// When running inside an iframe (e.g. eBay's "item description by seller"),
// post this frame's text content to the parent and exit — no message listener
// is needed in sub-frames.
if (window !== window.top) {
  const text = document.body?.innerText || document.body?.textContent || '';
  if (text.trim()) {
    window.parent.postMessage({ type: 'fitcheck-frame-text', text }, '*');
  }
} else {
  // ── Top-frame logic ─────────────────────────────────────────────────────────

  // Collect text relayed from child frames (arrives before or shortly after
  // the user opens the popup, since content scripts run at document_idle).
  const _frameTexts = [];
  window.addEventListener('message', e => {
    if (e.data?.type === 'fitcheck-frame-text' && typeof e.data.text === 'string') {
      _frameTexts.push(e.data.text);
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'scan') return;

    const hostname = window.location.hostname;
    const site     = FITCHECK_SITES[hostname];

    if (!site) {
      sendResponse({ measurements: {}, itemTitle: null, site: null });
      return;
    }

    // 1. Try registered selectors in the top frame
    let descriptionText = '';
    for (const selector of site.descriptionSelectors) {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        const text = Array.from(els).map(el => el.innerText || el.textContent || '').join('\n');
        if (text.trim()) { descriptionText = text; break; }
      }
    }

    // 2. Try same-origin iframes directly (silent failure on cross-origin)
    if (!descriptionText) {
      for (const iframe of document.querySelectorAll('iframe')) {
        try {
          const body = iframe.contentDocument?.body;
          if (body) {
            const text = body.innerText || body.textContent || '';
            if (text.trim()) { descriptionText = text; break; }
          }
        } catch (_) { /* cross-origin — skip */ }
      }
    }

    // 3. Fall back to text relayed via postMessage from child frames
    if (!descriptionText && _frameTexts.length > 0) {
      descriptionText = _frameTexts.join('\n');
    }

    // Extract item title
    let itemTitle = null;
    for (const sel of site.titleSelector.split(',').map(s => s.trim())) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) { itemTitle = el.textContent.trim(); break; }
    }

    sendResponse({
      measurements: parseListingText(descriptionText),
      itemTitle,
      site: hostname.replace('www.', ''),
    });
  });
}
