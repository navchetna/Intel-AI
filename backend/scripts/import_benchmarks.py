#!/usr/bin/env python3
"""Import benchmark data from Excel file into the database."""

import sys
from pathlib import Path
import json

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir / "src"))

from sqlalchemy import create_engine, text
from app.core.config import settings


def main():
    # Read the JSON data (already converted from Excel)
    json_path = backend_dir.parent / "frontend" / "public" / "benchmark_data.json"

    if not json_path.exists():
        print(f"Error: {json_path} not found")
        print("Run: node scripts/import-benchmarks.js first")
        return 1

    with open(json_path) as f:
        data = json.load(f)

    print(f"Found {len(data)} benchmark records")

    # Create synchronous engine for this script
    db_url = str(settings.DATABASE_URL).replace("+asyncpg", "")
    engine = create_engine(db_url)

    inserted = 0
    with engine.connect() as conn:
        for row in data:
            # Transform to match database schema
            record = {
                'timestamp': row['timestamp'],
                'platform': row.get('Platform', 'Unknown'),
                'serving_engine': None,
                'model': row['model'],
                'tp': None,
                'num_deployments': None,
                'dataset': row.get('dataset'),
                'input_tokens': row.get('input_tokens'),
                'output_tokens': row.get('output_tokens'),
                'concurrency': row.get('concurrency'),
                'request_rate': row.get('request_rate'),
                'mean_ttft_ms': row.get('mean_ttft_ms'),
                'median_ttft_ms': row.get('median_ttft_ms'),
                'p90_ttft_ms': row.get('p90_ttft_ms'),
                'mean_tpot_ms': row.get('mean_tpot_ms'),
                'median_tpot_ms': row.get('median_tpot_ms'),
                'p90_tpot_ms': row.get('p90_tpot_ms'),
                'mean_itl_ms': row.get('mean_itl_ms'),
                'median_itl_ms': row.get('median_itl_ms'),
                'p90_itl_ms': row.get('p90_itl_ms'),
                'request_throughput': row.get('req_throughput_per_s'),
                'output_token_throughput': row.get('output_tok_throughput_per_s'),
                'interactivity_tokens_per_sec_per_user': row.get('tok_per_s_per_user'),
            }

            sql = text("""
                INSERT INTO inference_benchmarks (
                    timestamp, platform, serving_engine, model, tp, num_deployments,
                    dataset, input_tokens, output_tokens, concurrency, request_rate,
                    mean_ttft_ms, median_ttft_ms, p90_ttft_ms,
                    mean_tpot_ms, median_tpot_ms, p90_tpot_ms,
                    mean_itl_ms, median_itl_ms, p90_itl_ms,
                    request_throughput, output_token_throughput,
                    interactivity_tokens_per_sec_per_user
                ) VALUES (
                    :timestamp, :platform, :serving_engine, :model, :tp, :num_deployments,
                    :dataset, :input_tokens, :output_tokens, :concurrency, :request_rate,
                    :mean_ttft_ms, :median_ttft_ms, :p90_ttft_ms,
                    :mean_tpot_ms, :median_tpot_ms, :p90_tpot_ms,
                    :mean_itl_ms, :median_itl_ms, :p90_itl_ms,
                    :request_throughput, :output_token_throughput,
                    :interactivity_tokens_per_sec_per_user
                )
            """)

            conn.execute(sql, record)
            inserted += 1

        conn.commit()

    print(f"✓ Successfully inserted {inserted} records")
    return 0


if __name__ == "__main__":
    sys.exit(main())
