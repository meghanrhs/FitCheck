// content/parser.js

function parseListingText(str) {
  if (!str || typeof str !== 'string') return {};

  // Pass 1: normalize
  let text = str;
  // Strip HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#?\w+;/g, ' ');
  // Convert cm to inches before lowercasing (units are already latin chars)
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm/gi, (_, n) => {
    const inches = Math.round(parseFloat(n) * 0.3937 * 10) / 10;
    return `${inches}"`;
  });
  // Collapse whitespace, lowercase
  text = text.replace(/\s+/g, ' ').toLowerCase().trim();

  return _extractMeasurements(text);
}

function _extractMeasurements(text) {
  // Implemented in Task 3
  return {};
}
