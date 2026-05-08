const fs = require('fs');
const path = require('path');
const { estimateRoof } = require('../src/estimator');
const { writeReportPdf } = require('../src/reportPdf');

const ADDRESSES = [
  '3561 E 102nd Ct',
  '1612 S Canton Ave, Springfield, MO 65802',
  '6310 Laguna Bay Court, Houston, TX 77041',
  '3820 E Rosebrier St, Springfield, MO 65809',
  '1261 20th Street, Newport News, VA 23607',
];

const outDir = path.join(__dirname, '..', 'sample-output');
fs.mkdirSync(outDir, { recursive: true });

const summary = ADDRESSES.map((address, index) => {
  const report = estimateRoof(address);
  report.id = `sample-${index + 1}`;
  const pdfPath = path.join(outDir, `${report.id}.pdf`);
  writeReportPdf(report, pdfPath, null);
  return {
    address,
    estimatedRoofSqft: report.measurements.roofAreaSqft,
    materialSquares: report.measurements.squares,
    estimatedTotal: report.estimate.total,
    confidence: report.confidence.level,
    uncertaintyBand: report.measurements.uncertaintyBand,
    pdf: `sample-output/${report.id}.pdf`,
  };
});

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, 'SUMMARY.md'), `# Sample Outputs\n\n${summary.map((r, i) => `## ${i + 1}. ${r.address}\n\n- Estimated roof sqft: ${r.estimatedRoofSqft.toLocaleString()}\n- Material squares: ${r.materialSquares}\n- Estimated total: $${r.estimatedTotal.toLocaleString()}\n- Confidence: ${r.confidence}\n- Uncertainty band: ${r.uncertaintyBand}\n- PDF: ${r.pdf}\n`).join('\n')}`);

console.log(`Generated ${summary.length} sample reports in ${outDir}`);
