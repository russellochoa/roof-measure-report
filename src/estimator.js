const PITCH_MULTIPLIERS = {
  '3:12': 1.031,
  '4:12': 1.054,
  '5:12': 1.083,
  '6:12': 1.118,
  '7:12': 1.158,
  '8:12': 1.202,
  '9:12': 1.25,
  '10:12': 1.302,
  '11:12': 1.357,
  '12:12': 1.414,
};

const REGION_BASE = [
  { match: /houston|humble|spring|tx|texas/i, footprint: 2250, pitch: '6:12', complexity: 1.15, region: 'Texas Gulf / Houston area' },
  { match: /springfield|nixa|mo|missouri/i, footprint: 2050, pitch: '7:12', complexity: 1.12, region: 'Missouri / Ozarks' },
  { match: /cape coral|fl|florida/i, footprint: 2100, pitch: '6:12', complexity: 1.08, region: 'Florida' },
  { match: /orland park|il|illinois/i, footprint: 2200, pitch: '5:12', complexity: 1.1, region: 'Illinois / Midwest' },
  { match: /newport news|va|virginia/i, footprint: 1650, pitch: '6:12', complexity: 1.08, region: 'Virginia' },
];

function deterministicVariance(address) {
  let hash = 0;
  for (const ch of address.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    ratio: 0.88 + (hash % 3600) / 10000, // 0.88–1.2399
    confidenceWiggle: hash % 9,
  };
}

function finiteNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferInputs(address, overrides = {}) {
  const preset = REGION_BASE.find((r) => r.match.test(address)) || {
    footprint: 1900,
    pitch: '6:12',
    complexity: 1.1,
    region: 'Default residential profile',
  };
  const variance = deterministicVariance(address);
  const inferredFootprint = Math.round(preset.footprint * variance.ratio);
  const footprintSqft = finiteNumber(overrides.footprintSqft, inferredFootprint);
  const pitch = PITCH_MULTIPLIERS[overrides.pitch] ? overrides.pitch : preset.pitch;
  const wastePct = finiteNumber(overrides.wastePct, 12);
  const pricePerSquare = finiteNumber(overrides.pricePerSquare, 525);
  const complexity = finiteNumber(overrides.complexity, preset.complexity);
  const method = overrides.footprintSqft ? 'manual-footprint-assumed-pitch' : 'address-prior-only';
  return { address, region: preset.region, footprintSqft, pitch, wastePct, pricePerSquare, complexity, confidenceWiggle: variance.confidenceWiggle, method };
}

function confidenceFor(inputs) {
  if (inputs.method === 'manual-footprint-assumed-pitch') {
    return { level: 'Medium', score: 62, explanation: 'Manual/building footprint entered; pitch and roof complexity are still assumed.' };
  }
  return { level: 'Low', score: 38, explanation: 'Address-informed prior only. No aerial trace, parcel polygon, or roof-plane measurement has been used yet.' };
}

function estimateRoof(address, overrides = {}) {
  const inputs = inferInputs(address, overrides);
  const multiplier = PITCH_MULTIPLIERS[inputs.pitch] || PITCH_MULTIPLIERS['6:12'];
  const measuredRoofSqft = Math.round(inputs.footprintSqft * multiplier * inputs.complexity);
  const wasteSqft = Math.round(measuredRoofSqft * (inputs.wastePct / 100));
  const orderSqft = measuredRoofSqft + wasteSqft;
  const squares = Math.ceil(orderSqft / 100);
  const materials = Math.round(squares * inputs.pricePerSquare);
  const laborRate = 2.15;
  const tearOffRate = 0.65;
  const labor = Math.round(measuredRoofSqft * laborRate);
  const tearOff = Math.round(measuredRoofSqft * tearOffRate);
  const permitAndOverhead = Math.round((materials + labor + tearOff) * 0.14);
  const total = materials + labor + tearOff + permitAndOverhead;
  const confidence = confidenceFor(inputs);

  return {
    id: null,
    createdAt: new Date().toISOString(),
    address,
    measurementMethod: {
      level: inputs.method,
      source: inputs.method === 'manual-footprint-assumed-pitch' ? 'User-supplied footprint + assumptions' : 'Regional residential prior + deterministic address variance',
      nextBestUpgrade: 'Trace roof planes from imagery or import a real building-footprint polygon.',
    },
    inputs,
    measurements: {
      footprintSqft: inputs.footprintSqft,
      pitch: inputs.pitch,
      pitchMultiplier: multiplier,
      complexityFactor: inputs.complexity,
      roofAreaSqft: measuredRoofSqft,
      wastePct: inputs.wastePct,
      wasteSqft,
      orderSqft,
      squares,
      uncertaintyBand: inputs.method === 'manual-footprint-assumed-pitch' ? '±15–25%' : '±25–40%',
    },
    estimate: {
      lineItems: [
        { label: 'Shingles + accessories', quantity: `${squares} squares`, unitCost: inputs.pricePerSquare, unitLabel: '$/square', total: materials },
        { label: 'Installation labor', quantity: `${measuredRoofSqft.toLocaleString()} sqft`, unitCost: laborRate, unitLabel: '$/sqft', total: labor },
        { label: 'Tear-off / disposal allowance', quantity: `${measuredRoofSqft.toLocaleString()} sqft`, unitCost: tearOffRate, unitLabel: '$/sqft', total: tearOff },
        { label: 'Permit, overhead, and contingency', quantity: '14%', unitCost: null, unitLabel: 'allowance', total: permitAndOverhead },
      ],
      total,
    },
    confidence,
    assumptions: [
      'This is a preliminary budgetary estimate, not a commercial roof measurement report.',
      'Current MVP uses address-informed residential priors unless a building footprint is supplied.',
      'Roof area is footprint × pitch multiplier × complexity factor.',
      'Waste is added after estimated roof area; material order is rounded to full roofing squares.',
      'For competition-grade accuracy, replace inferred footprint with traced roof polygons, parcel/building footprint data, or roof-plane measurements.',
    ],
  };
}

module.exports = { estimateRoof, PITCH_MULTIPLIERS };
