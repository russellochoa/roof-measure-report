const http = require('http');
const { estimateRoof } = require('../src/estimator');

const report = estimateRoof('6310 Laguna Bay Court, Houston, TX 77041');
if (!report.measurements.roofAreaSqft || !report.estimate.total) throw new Error('Estimator failed');
console.log('Estimator OK:', report.measurements.roofAreaSqft, 'sqft', `$${report.estimate.total}`);

const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3030, path: '/', method: 'GET' }, (res) => {
  if (res.statusCode !== 200) throw new Error(`Server returned ${res.statusCode}`);
  console.log('Server OK');
  res.resume();
});
req.on('error', (err) => {
  console.log('Server not running; estimator smoke passed. Start with npm start.');
});
req.end();
