// content/sites.js
// Selectors are tried in array order; first non-empty match wins.
// NOTE: verify selectors against live pages before shipping — sites redesign frequently.

const FITCHECK_SITES = {
  'www.depop.com': {
    descriptionSelectors: [
      '[data-testid="product-description"]',
      '.sc-item-description',
      '[class*="Description"]',
    ],
    titleSelector: '[data-testid="product-name"], h1',
  },
  'www.ebay.com': {
    descriptionSelectors: [
      '#viTabs_0_is',
      '.ux-layout-section--features',
      '#desc_wrapper',
      '.d-item-description',
    ],
    titleSelector: '.x-item-title__mainTitle span',
  },
  'www.poshmark.com': {
    descriptionSelectors: [
      '[data-test="listing-description"]',
      '.listing__description',
      '[class*="description"]',
    ],
    titleSelector: 'h1',
  },
  'www.etsy.com': {
    descriptionSelectors: [
      '[data-product-details-section="description"] p',
      '#product-details-content-toggle p',
      '[class*="description"]',
    ],
    titleSelector: 'h1[data-product-details-title], h1',
  },
  'www.vinted.com': {
    descriptionSelectors: [
      '[itemprop="description"]',
      '[class*="description"]',
      '.web_ui__Text--body',
    ],
    titleSelector: 'h1',
  },
};
