// tests/parser-tests.js
// Loaded after parser.js and fit.js via tests/index.html

function runTests() {
  let passed = 0, failed = 0;

  function assert(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`✓ ${name}`); passed++; }
    else {
      console.error(`✗ ${name}`);
      console.error(`  expected: ${JSON.stringify(expected)}`);
      console.error(`  actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  function assertClose(name, actual, expected, tol) {
    const ok = typeof actual === 'number' && Math.abs(actual - expected) <= tol;
    if (ok) { console.log(`✓ ${name}`); passed++; }
    else {
      console.error(`✗ ${name}`);
      console.error(`  expected: ${expected} ±${tol}`);
      console.error(`  actual:   ${actual}`);
      failed++;
    }
  }

  // ── Pass 1: normalization ─────────────────────────────────────────────────
  console.group('Pass 1: cm → inch conversion');

  assertClose('96cm converts to ~37.8"',
    parseListingText('Chest: 96cm').chest, 37.8, 0.2);

  assertClose('76cm converts to ~29.9"',
    parseListingText('Waist: 76cm').waist, 29.9, 0.2);

  console.groupEnd();

  // ── Pass 2: label-first patterns ─────────────────────────────────────────
  console.group('Pass 2: label-first');

  assert('chest: 38"',           parseListingText('Chest: 38"'),         { chest: 38 });
  assert('chest 38 inches',      parseListingText('chest 38 inches'),    { chest: 38 });
  assert('bust maps to chest',   parseListingText('Bust: 36"'),          { chest: 36 });
  assert('waist',                parseListingText('Waist: 30"'),         { waist: 30 });
  assert('hips with s',          parseListingText('Hips: 40"'),          { hips: 40 });
  assert('hip without s',        parseListingText('Hip: 40"'),           { hips: 40 });
  assert('length',               parseListingText('Length: 27"'),        { length: 27 });
  assert('sleeve',               parseListingText('Sleeve: 24"'),        { sleeve: 24 });
  assert('inseam',               parseListingText('Inseam: 30"'),        { inseam: 30 });
  assert('shoulders',            parseListingText('Shoulders: 16"'),     { shoulders: 16 });
  assert('across chest',         parseListingText('Across chest: 19"'),  { chest: 19 });

  console.groupEnd();

  // ── Pass 2: pit-to-pit doubling ───────────────────────────────────────────
  console.group('Pass 2: pit-to-pit ×2');

  assert('pit to pit: 19" → chest 38"',
    parseListingText('Pit to pit: 19"'), { chest: 38 });
  assert('p2p: 19" → chest 38"',
    parseListingText('p2p: 19"'), { chest: 38 });
  assert('armpit to armpit: 19" → chest 38"',
    parseListingText('Armpit to armpit: 19"'), { chest: 38 });

  console.groupEnd();

  // ── Pass 2: shorthand block ───────────────────────────────────────────────
  console.group('Pass 2: shorthand block');

  assert('B38 W30 H40',
    parseListingText('B38 W30 H40'), { chest: 38, waist: 30, hips: 40 });
  assert('B 38 W 30 H 40 (with spaces)',
    parseListingText('B 38 W 30 H 40'), { chest: 38, waist: 30, hips: 40 });

  console.groupEnd();

  // ── Pass 2: number-first fallback ────────────────────────────────────────
  console.group('Pass 2: number-first fallback');

  assert('38" chest',           parseListingText('38" chest'),        { chest: 38 });
  assert('30 inch waist',       parseListingText('30 inch waist'),    { waist: 30 });

  console.groupEnd();

  // ── Pass 2: multi-measurement and real-world formats ─────────────────────
  console.group('Pass 2: multi-measurement + real-world');

  assert('multiple on one line',
    parseListingText('Chest: 38" Waist: 30" Hips: 40"'),
    { chest: 38, waist: 30, hips: 40 });

  assert('bullet list',
    parseListingText('• Chest: 38"\n• Waist: 30"\n• Length: 27"'),
    { chest: 38, waist: 30, length: 27 });

  assert('pipe-separated table',
    parseListingText('Chest | 38"\nWaist | 30"'),
    { chest: 38, waist: 30 });

  assertClose('mixed cm and inches — chest',
    parseListingText('Chest: 96cm Waist: 30"').chest, 37.8, 0.2);
  assert('mixed cm and inches — waist',
    parseListingText('Chest: 96cm Waist: 30"').waist, 30);

  console.groupEnd();

  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}
