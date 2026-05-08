const fs = require('fs');
const PDFDocument = require('pdfkit');

function money(n) { return `$${Math.round(n).toLocaleString()}`; }
function rate(item) {
  if (item.unitCost === null || item.unitCost === undefined) return item.unitLabel || '—';
  const value = item.unitCost >= 10 ? `$${Number(item.unitCost).toLocaleString()}` : `$${Number(item.unitCost).toFixed(2)}`;
  return `${value} ${item.unitLabel || ''}`;
}

function writeReportPdf(report, filePath, publicUrl) {
  fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
  const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
  doc.pipe(fs.createWriteStream(filePath));

  doc.rect(0, 0, 612, 86).fill('#152033');
  doc.fillColor('#ffffff').fontSize(11).text('JOBNIMBUS HACKATHON PROTOTYPE', 48, 28);
  doc.fontSize(22).text('Preliminary Roof Estimate Report', 48, 44);

  doc.y = 110;
  doc.fillColor('#111').fontSize(13).font('Helvetica-Bold').text(report.address).font('Helvetica');
  doc.fontSize(10).fillColor('#555').text(`Report ID: ${report.id}`);
  doc.text(`Generated: ${new Date(report.createdAt).toLocaleString()}`);
  if (publicUrl) doc.text(`Share link: ${publicUrl}`);
  doc.moveDown();

  doc.roundedRect(48, doc.y, 516, 54, 8).fill('#fff4db').stroke('#f0c36d');
  doc.fillColor('#4a3410').fontSize(10).text(`${report.confidence.level} confidence: ${report.confidence.explanation}`, 62, doc.y + 14, { width: 488 });
  doc.y += 72;

  doc.fillColor('#111').fontSize(15).font('Helvetica-Bold').text('Measurement Summary').font('Helvetica');
  doc.moveDown(0.3);
  const m = report.measurements;
  const rows = [
    ['Measurement source', report.measurementMethod.source],
    ['Building footprint', `${m.footprintSqft.toLocaleString()} sqft`],
    ['Pitch', m.pitch],
    ['Pitch multiplier', m.pitchMultiplier.toFixed(3)],
    ['Complexity factor', m.complexityFactor.toFixed(2)],
    ['Estimated roof area', `${m.roofAreaSqft.toLocaleString()} sqft`],
    ['Waste', `${m.wastePct}% (${m.wasteSqft.toLocaleString()} sqft)`],
    ['Material order', `${m.orderSqft.toLocaleString()} sqft / ${m.squares} squares`],
    ['Uncertainty band', m.uncertaintyBand],
  ];
  rows.forEach(([k, v]) => doc.fontSize(10.5).fillColor('#333').text(`${k}: `, { continued: true }).font('Helvetica-Bold').text(v).font('Helvetica'));
  doc.moveDown();

  doc.fontSize(15).fillColor('#111').font('Helvetica-Bold').text('Quote-ready Budget Estimate').font('Helvetica');
  doc.moveDown(0.3);
  report.estimate.lineItems.forEach((item) => {
    doc.fontSize(10.5).fillColor('#222').text(item.label, { continued: true, width: 240 });
    doc.text(`${item.quantity} · ${rate(item)} · ${money(item.total)}`, { align: 'right' });
  });
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text(`Estimated Total: ${money(report.estimate.total)}`, { align: 'right' }).font('Helvetica');
  doc.moveDown();

  doc.fontSize(15).text('Assumptions / Audit Notes');
  doc.moveDown(0.3);
  report.assumptions.forEach((a) => doc.fontSize(9.5).fillColor('#333').text(`• ${a}`, { width: 510 }));

  doc.moveDown();
  doc.fontSize(9).fillColor('#777').text('Prototype report. Validate measurements before customer-facing use.', { align: 'center' });
  doc.end();
}

module.exports = { writeReportPdf };
