const fs = require('fs');
const path = require('path');

// Read the JSON data
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/public/benchmark_data.json'), 'utf8'));

console.log(`Uploading ${data.length} benchmark records...`);

// Transform to match Excel column headers (as expected by the API)
// Remove null fields entirely - the API will handle defaults
const transformedRows = data.map(row => {
  const transformed = {
    'Timestamp': row.timestamp,
    'Platform': row.Platform || 'Unknown',
    'Model': row.model,
    'Dataset': row.dataset,
    'Input_Tokens': row.input_tokens,
    'Output_Tokens': row.output_tokens,
    'Concurrency': row.concurrency,
    'Request_Rate': row.request_rate,
    'Mean_TTFT_ms': row.mean_ttft_ms,
    'Median_TTFT_ms': row.median_ttft_ms,
    'P90_TTFT_ms': row.p90_ttft_ms,
    'Mean_TPOT_ms': row.mean_tpot_ms,
    'Median_TPOT_ms': row.median_tpot_ms,
    'P90_TPOT_ms': row.p90_tpot_ms,
    'Mean_ITL_ms': row.mean_itl_ms,
    'Median_ITL_ms': row.median_itl_ms,
    'P90_ITL_ms': row.p90_itl_ms,
    'Request_Throughput': row.req_throughput_per_s,
    'Output_Token_Throughput': row.output_tok_throughput_per_s,
    'Interactivity_tokens_per_sec_per_user': row.tok_per_s_per_user
  };

  // Only add optional fields if they have values
  // This prevents null validation issues
  return transformed;
});

const BASE_URL = 'http://localhost:8040/api/inference-benchmarks';

// First, we need to login to get a token
async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });

  if (!response.ok) {
    console.error('Login failed. Creating admin user...');
    // Try to create user first
    const createResponse = await fetch(`${BASE_URL}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Failed to create user:', errorText);
    } else {
      console.log('✓ Admin user created');
    }

    // Try login again
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed after user creation');
    }

    const loginData = await loginResponse.json();
    return loginData.token;
  }

  const data = await response.json();
  return data.token;
}

async function uploadBenchmarks(token) {
  // Upload in batches of 10 to avoid any bulk insert limits
  const BATCH_SIZE = 10;
  let totalInserted = 0;
  let totalFailed = 0;
  const allErrors = [];

  for (let i = 0; i < transformedRows.length; i += BATCH_SIZE) {
    const batch = transformedRows.slice(i, i + BATCH_SIZE);
    console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);

    const response = await fetch(`${BASE_URL}/records/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rows: batch })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText.substring(0, 500)}`);
    }

    const result = await response.json();
    totalInserted += result.inserted;
    totalFailed += result.failed;
    if (result.errors) {
      allErrors.push(...result.errors);
    }
  }

  return {
    inserted: totalInserted,
    failed: totalFailed,
    errors: allErrors
  };
}

async function main() {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('✓ Authenticated');

    console.log('Uploading records...');
    const result = await uploadBenchmarks(token);

    console.log('\n✓ Upload complete!');
    console.log(`  Inserted: ${result.inserted}`);
    console.log(`  Failed: ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => {
        console.log(`  Row ${err.row}: ${err.errors.join(', ')}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
