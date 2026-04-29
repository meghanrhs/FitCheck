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

  // ── (Pass 2 tests added in Task 3) ───────────────────────────────────────

  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}
