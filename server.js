const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const slugify = require('slugify');
const { estimateRoof, PITCH_MULTIPLIERS } = require('./src/estimator');
const { writeReportPdf } = require('./src/reportPdf');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_FILE = path.join(__dirname, 'data', 'reports.json');
const REPORT_DIR = path.join(__dirname, 'reports');

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

function loadReports() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Could not parse reports data file:', error.message);
    return {};
  }
}
function saveReports(reports) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}
function publicBase(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));
app.use('/reports', express.static(REPORT_DIR));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html><head><title>Preliminary Roof Estimate MVP</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/public/style.css"></head>
<body><main class="card">
  <div class="eyebrow">JobNimbus Hackathon Prototype</div>
  <h1>Preliminary Roof Estimate Report</h1>
  <p>Enter an address, tune any known assumptions, then generate a PDF and shareable report link.</p>
  <div class="banner">Inferred estimate — no aerial trace yet. Best used as a transparent MVP, not a final measurement report.</div>
  <form method="post" action="/reports">
    <label>Property address <input name="address" required maxlength="180" placeholder="6310 Laguna Bay Court, Houston, TX 77041"></label>
    <div class="grid">
      <label>Pitch <small>Use Auto if unknown.</small><select name="pitch"><option value="">Auto</option>${Object.keys(PITCH_MULTIPLIERS).map(p => `<option>${p}</option>`).join('')}</select></label>
      <label>Building footprint sqft <small>Optional; improves credibility if measured/traced.</small><input name="footprintSqft" type="number" min="500" max="12000" step="1" placeholder="Auto"></label>
      <label>Waste % <small>Typical asphalt waste is 10–15%.</small><input name="wastePct" type="number" min="0" max="30" step="0.1" value="12"></label>
      <label>Material $/square <small>1 square = 100 sqft.</small><input name="pricePerSquare" type="number" min="100" max="1200" step="1" value="525"></label>
    </div>
    <button>Generate report</button>
  </form>
  <p class="note">Fast upgrade path: add manual roof-plane tracing or import building footprint polygons, then calculate each plane by pitch.</p>
</main></body></html>`);
});

app.post('/reports', (req, res, next) => {
  try {
    const validation = validateReportRequest(req.body);
    if (!validation.ok) return res.status(400).send(renderError(validation.message));

    const { address, overrides } = validation;
    const report = estimateRoof(address, overrides);
    const id = `${slugify(address, { lower: true, strict: true }).slice(0, 44) || 'report'}-${nanoid(7)}`;
    report.id = id;
    const shareUrl = `${publicBase(req)}/r/${id}`;
    const pdfPath = path.join(REPORT_DIR, `${id}.pdf`);
    writeReportPdf(report, pdfPath, shareUrl);

    const reports = loadReports();
    reports[id] = report;
    saveReports(reports);
    res.redirect(`/r/${id}`);
  } catch (error) {
    next(error);
  }
});

app.get('/r/:id', (req, res) => {
  const report = loadReports()[req.params.id];
  if (!report) return res.status(404).send(renderError('Report not found'));
  const m = report.measurements;
  const total = report.estimate.total.toLocaleString();
  res.send(`<!doctype html>
<html><head><title>Roof Report - ${escapeHtml(report.address)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/public/style.css"></head>
<body><main class="card wide">
  <div class="eyebrow">Shareable Preliminary Roof Estimate</div>
  <h1>${escapeHtml(report.address)}</h1>
  <p class="subtitle">Report ID: ${escapeHtml(report.id)} · Generated ${new Date(report.createdAt).toLocaleString()}</p>
  <div class="actions"><a class="button" href="/reports/${report.id}.pdf">Download PDF</a><a class="button secondary" href="/">New report</a></div>
  <div class="banner">${escapeHtml(report.confidence.level)} confidence: ${escapeHtml(report.confidence.explanation)}</div>
  <section class="visual-grid">
    <div class="roof-placeholder"><div class="roof-shape"></div><span>Imagery / roof-plane trace placeholder</span></div>
    <div class="formula"><strong>Formula</strong><p>footprint × pitch multiplier × complexity + waste</p><p class="muted">Source: ${escapeHtml(report.measurementMethod.source)}</p></div>
  </section>
  <section class="metrics">
    <div><strong>${m.roofAreaSqft.toLocaleString()}</strong><span>estimated roof sqft</span></div>
    <div><strong>${m.squares}</strong><span>material squares</span></div>
    <div><strong>$${total}</strong><span>budget estimate</span></div>
    <div><strong>${escapeHtml(m.uncertaintyBand)}</strong><span>uncertainty band</span></div>
  </section>
  <h2>Measurement logic</h2>
  <ul>
    <li>Building footprint: ${m.footprintSqft.toLocaleString()} sqft</li>
    <li>Pitch: ${m.pitch} (${m.pitchMultiplier.toFixed(3)} multiplier)</li>
    <li>Complexity: ${m.complexityFactor.toFixed(2)}</li>
    <li>Waste: ${m.wastePct}% → material order ${m.orderSqft.toLocaleString()} sqft</li>
  </ul>
  <h2>Estimate</h2>
  <table><thead><tr><th>Line item</th><th>Quantity</th><th>Rate</th><th>Total</th></tr></thead><tbody>${report.estimate.lineItems.map(i => `<tr><td>${escapeHtml(i.label)}</td><td>${escapeHtml(i.quantity)}</td><td>${formatRate(i)}</td><td>$${i.total.toLocaleString()}</td></tr>`).join('')}<tr class="total"><td colspan="3">Total</td><td>$${total}</td></tr></tbody></table>
  <h2>Assumptions</h2><ul>${report.assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
</main></body></html>`);
});

app.get('/api/reports/:id', (req, res) => {
  const report = loadReports()[req.params.id];
  if (!report) return res.status(404).json({ error: 'not_found' });
  res.json(report);
});

function validateReportRequest(body) {
  const address = String(body.address || '').trim();
  if (!address) return { ok: false, message: 'Address is required.' };
  if (address.length > 180) return { ok: false, message: 'Address is too long.' };

  const fields = {
    footprintSqft: { min: 500, max: 12000, label: 'Building footprint sqft' },
    wastePct: { min: 0, max: 30, label: 'Waste %' },
    pricePerSquare: { min: 100, max: 1200, label: 'Material $/square' },
    complexity: { min: 1, max: 1.6, label: 'Complexity factor' },
  };
  const overrides = { pitch: body.pitch };
  for (const [key, rule] of Object.entries(fields)) {
    if (body[key] === undefined || body[key] === null || body[key] === '') continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      return { ok: false, message: `${rule.label} must be between ${rule.min} and ${rule.max}.` };
    }
    overrides[key] = value;
  }
  if (body.pitch && !PITCH_MULTIPLIERS[body.pitch]) return { ok: false, message: 'Invalid pitch selected.' };
  return { ok: true, address, overrides };
}

function renderError(message) {
  return `<!doctype html><html><head><title>Error</title><link rel="stylesheet" href="/public/style.css"></head><body><main class="card"><h1>Couldn’t generate report</h1><p>${escapeHtml(message)}</p><a class="button" href="/">Back</a></main></body></html>`;
}

function formatRate(item) {
  if (item.unitCost === null || item.unitCost === undefined) return escapeHtml(item.unitLabel || '—');
  const value = item.unitCost >= 10 ? `$${Number(item.unitCost).toLocaleString()}` : `$${Number(item.unitCost).toFixed(2)}`;
  return `${value} ${escapeHtml(item.unitLabel || '')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).send(renderError(err.status === 413 ? 'Request is too large.' : 'Something went wrong. Please try again.'));
});

app.listen(PORT, () => {
  console.log(`Roof report MVP running: http://localhost:${PORT}`);
});
