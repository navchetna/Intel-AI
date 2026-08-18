const fs = require('fs');
const path = require('path');

// Read the JSON data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/public/benchmark_data.json'), 'utf8'));

// Transform to database schema
const transformed = data.map(row => ({
  timestamp: row.timestamp,
  platform: row.Platform || 'Unknown',
  serving_engine: null, // Not in the Excel data
  model: row.model,
  tp: null, // Not in the Excel data
  num_deployments: null, // Not in the Excel data
  dataset: row.dataset,
  input_tokens: row.input_tokens,
  output_tokens: row.output_tokens,
  concurrency: row.concurrency,
  request_rate: row.request_rate,
  mean_ttft_ms: row.mean_ttft_ms,
  median_ttft_ms: row.median_ttft_ms,
  p90_ttft_ms: row.p90_ttft_ms,
  mean_tpot_ms: row.mean_tpot_ms,
  median_tpot_ms: row.median_tpot_ms,
  p90_tpot_ms: row.p90_tpot_ms,
  mean_itl_ms: row.mean_itl_ms,
  median_itl_ms: row.median_itl_ms,
  p90_itl_ms: row.p90_itl_ms,
  request_throughput: row.req_throughput_per_s,
  output_token_throughput: row.output_tok_throughput_per_s,
  interactivity_tokens_per_sec_per_user: row.tok_per_s_per_user
}));

// Generate SQL INSERT statements
const sqlStatements = transformed.map((row, idx) => {
  const values = [
    `'${row.timestamp}'`,
    `'${row.platform}'`,
    row.serving_engine === null ? 'NULL' : `'${row.serving_engine}'`,
    `'${row.model}'`,
    row.tp === null ? 'NULL' : row.tp,
    row.num_deployments === null ? 'NULL' : row.num_deployments,
    row.dataset === null ? 'NULL' : `'${row.dataset}'`,
    row.input_tokens === null ? 'NULL' : row.input_tokens,
    row.output_tokens === null ? 'NULL' : row.output_tokens,
    row.concurrency === null ? 'NULL' : row.concurrency,
    row.request_rate === null ? 'NULL' : row.request_rate,
    row.mean_ttft_ms === null ? 'NULL' : row.mean_ttft_ms,
    row.median_ttft_ms === null ? 'NULL' : row.median_ttft_ms,
    row.p90_ttft_ms === null ? 'NULL' : row.p90_ttft_ms,
    row.mean_tpot_ms === null ? 'NULL' : row.mean_tpot_ms,
    row.median_tpot_ms === null ? 'NULL' : row.median_tpot_ms,
    row.p90_tpot_ms === null ? 'NULL' : row.p90_tpot_ms,
    row.mean_itl_ms === null ? 'NULL' : row.mean_itl_ms,
    row.median_itl_ms === null ? 'NULL' : row.median_itl_ms,
    row.p90_itl_ms === null ? 'NULL' : row.p90_itl_ms,
    row.request_throughput === null ? 'NULL' : row.request_throughput,
    row.output_token_throughput === null ? 'NULL' : row.output_token_throughput,
    row.interactivity_tokens_per_sec_per_user === null ? 'NULL' : row.interactivity_tokens_per_sec_per_user
  ].join(', ');

  return `INSERT INTO inference_benchmarks (timestamp, platform, serving_engine, model, tp, num_deployments, dataset, input_tokens, output_tokens, concurrency, request_rate, mean_ttft_ms, median_ttft_ms, p90_ttft_ms, mean_tpot_ms, median_tpot_ms, p90_tpot_ms, mean_itl_ms, median_itl_ms, p90_itl_ms, request_throughput, output_token_throughput, interactivity_tokens_per_sec_per_user) VALUES (${values});`;
});

// Write SQL file
fs.writeFileSync(
  path.join(__dirname, '../backend/seed_benchmarks.sql'),
  sqlStatements.join('\n\n')
);

console.log(`Generated ${sqlStatements.length} INSERT statements`);
console.log('SQL written to backend/seed_benchmarks.sql');
console.log('\nTo import into database, run:');
console.log('  psql -U <user> -d <database> -f backend/seed_benchmarks.sql');
