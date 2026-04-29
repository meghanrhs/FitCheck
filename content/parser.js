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

const _SYNONYM_GROUPS = [
  { labels: ['chest', 'across\\s+chest'],                      key: 'chest',     mult: 1 },
  { labels: ['bust'],                                          key: 'chest',     mult: 1 },
  { labels: ['pit\\s*to\\s*pit', 'p2p',
              'armpit\\s*to\\s*armpit'],                        key: 'chest',     mult: 2 },
  { labels: ['waist'],                                         key: 'waist',     mult: 1 },
  { labels: ['hips?'],                                         key: 'hips',      mult: 1 },
  { labels: ['length'],                                        key: 'length',    mult: 1 },
  { labels: ['sleeve'],                                        key: 'sleeve',    mult: 1 },
  { labels: ['inseam'],                                        key: 'inseam',    mult: 1 },
  { labels: ['shoulders?'],                                    key: 'shoulders', mult: 1 },
];

const _UNITS_PATTERN = '(?:"|\'\'|in(?:ch(?:es)?)?)';

function _extractMeasurements(text) {
  const result = {};

  // 1. Shorthand block: B38 W30 H40 (highest priority — unambiguous)
  const block = text.match(/b\s*(\d+(?:\.\d+)?)\s*w\s*(\d+(?:\.\d+)?)\s*h\s*(\d+(?:\.\d+)?)/i);
  if (block) {
    result.chest = parseFloat(block[1]);
    result.waist  = parseFloat(block[2]);
    result.hips   = parseFloat(block[3]);
  }

  // 2 & 3. Label-based patterns per synonym group
  for (const group of _SYNONYM_GROUPS) {
    if (result[group.key] !== undefined) continue;

    const alts = group.labels.join('|');

    // Label-first: "chest: 38"" / "chest 38 inches" / "chest | 38""
    const m1 = text.match(
      new RegExp(`(?:${alts})[:\\s|\\-]+?(\\d+(?:\\.\\d+)?)\\s*${_UNITS_PATTERN}?`, 'i')
    );
    if (m1) {
      const val = Math.round(parseFloat(m1[1]) * group.mult * 10) / 10;
      if (val > 0) { result[group.key] = val; continue; }
    }

    // Number-first fallback: "38" chest" / "30 inch waist"
    const m2 = text.match(
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${_UNITS_PATTERN}?\\s*(?:${alts})`, 'i')
    );
    if (m2) {
      const val = Math.round(parseFloat(m2[1]) * group.mult * 10) / 10;
      if (val > 0) result[group.key] = val;
    }
  }

  return result;
}
