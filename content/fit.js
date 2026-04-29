// content/fit.js

const KEY_MEASUREMENTS = ['chest', 'waist', 'hips'];

function compareMeasurement(profileVal, listingVal) {
  const delta = listingVal - profileVal;
  if (Math.abs(delta) <= 1)        return { verdict: 'fit',   label: 'FIT'   };
  if (delta > 1  && delta <= 2)    return { verdict: 'roomy', label: 'ROOMY' };
  if (delta < -1 && delta >= -2)   return { verdict: 'snug',  label: 'SNUG'  };
  if (delta > 2)                   return { verdict: 'big',   label: 'BIG'   };
  return                             { verdict: 'tight', label: 'TIGHT' };
}

function overallVerdict(comparisons) {
  if (comparisons.length < 2) {
    return { verdict: 'check', label: 'Check measurements', note: 'Not enough data to be certain.' };
  }

  const results = comparisons.map(c => ({
    ...c,
    result: compareMeasurement(c.profileVal, c.listingVal)
  }));

  const keyResults = results.filter(r => KEY_MEASUREMENTS.includes(r.key));
  const hasHardFail = keyResults.some(r => r.result.verdict === 'tight' || r.result.verdict === 'big');
  if (hasHardFail) return { verdict: 'wont-fit', label: "Likely won't fit" };

  const greenCount = results.filter(r => r.result.verdict === 'fit').length;
  const keyAmber   = keyResults.some(r => r.result.verdict === 'snug' || r.result.verdict === 'roomy');
  if (greenCount / results.length >= 0.75 && !keyAmber) return { verdict: 'fits', label: 'Likely fits' };

  return { verdict: 'check', label: 'Check measurements' };
}
