const ExcelJS = require('exceljs');
const fs = require('fs');

async function importVramData() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:/Users/anandkul/Projects/intel-ai/Intel-AI/frontend/public/intel_catalog_kv_vram_sizing.xlsx');

  const ws = workbook.worksheets[0];

  // Find the header row (row 13)
  const headerRow = ws.getRow(13);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  console.log('Headers:', headers);

  const data = [];

  // Process data rows (starting from row 14)
  for (let i = 14; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const modelName = row.getCell(1).value;

    // Skip empty rows
    if (!modelName || typeof modelName !== 'string') continue;

    const record = {
      model: modelName,
      category: row.getCell(2).value,
      kvCacheType: row.getCell(3).value,
      totalLayers: row.getCell(4).value,
      denseSelfattnLayers: row.getCell(5).value,
      windowLayers: row.getCell(6).value,
      windowSize: row.getCell(7).value,
      kvHeads: row.getCell(8).value,
      headDim: row.getCell(9).value,
      imageTokens: row.getCell(10).value,
      weightVramGiB: row.getCell(11).value,
      kvBytesPerTokPerLayer: getCellNumericValue(row.getCell(12)),
      cachedTokenLayersPerSeq: getCellNumericValue(row.getCell(13)),
      kvPerSeqMiB: getCellNumericValue(row.getCell(14)),
      kvTotalAtConcurrencyGiB: getCellNumericValue(row.getCell(15)),
      totalVramGiB: getCellNumericValue(row.getCell(16)),
      kvFormula: getCellFormulaOrValue(row.getCell(17)),
      prov: row.getCell(18).value,
      notes: row.getCell(19).value,
      smallestSingleCard: row.getCell(21).value,
    };

    data.push(record);
  }

  console.log(`\nExtracted ${data.length} records`);
  console.log('\nFirst record:', JSON.stringify(data[0], null, 2));

  fs.writeFileSync(
    'C:/Users/anandkul/Projects/intel-ai/Intel-AI/frontend/public/vram_data.json',
    JSON.stringify(data, null, 2)
  );

  console.log('\nData written to frontend/public/vram_data.json');
}

function getCellNumericValue(cell) {
  if (cell.value === null || cell.value === undefined) return null;
  if (typeof cell.value === 'number') return cell.value;
  if (cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result;
  }
  return cell.value;
}

function getCellFormulaOrValue(cell) {
  if (cell.value === null || cell.value === undefined) return null;
  if (cell.value && typeof cell.value === 'object') {
    if ('formula' in cell.value) return cell.value.formula;
    if ('result' in cell.value) return cell.value.result;
  }
  return cell.value;
}

importVramData().catch(console.error);
