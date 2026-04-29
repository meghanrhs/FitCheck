chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'scan') return;

  const hostname = window.location.hostname;
  const site     = FITCHECK_SITES[hostname];

  if (!site) {
    sendResponse({ measurements: {}, itemTitle: null, site: null });
    return;
  }

  // Extract description text — try selectors in order, use first non-empty result
  let descriptionText = '';
  for (const selector of site.descriptionSelectors) {
    const els = document.querySelectorAll(selector);
    if (els.length > 0) {
      const text = Array.from(els).map(el => el.innerText || el.textContent || '').join('\n');
      if (text.trim()) { descriptionText = text; break; }
    }
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

  return true;
});
