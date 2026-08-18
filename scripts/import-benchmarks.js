const XLSX = require('../frontend/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../frontend/public/benchmark_ocr.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', data.length);
console.log('\nFirst row sample:');
console.log(JSON.stringify(data[0], null, 2));

console.log('\nAll columns:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

// Write to JSON for inspection
fs.writeFileSync(
  path.join(__dirname, '../frontend/public/benchmark_data.json'),
  JSON.stringify(data, null, 2)
);

console.log('\nData written to frontend/public/benchmark_data.json');
