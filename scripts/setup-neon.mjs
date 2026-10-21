import { neon } from '@neondatabase/serverless';

const DB_URL = 'postgresql://neondb_owner:npg_QjI8V7vPWKoc@ep-withered-fire-azqk8g3a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const sql = neon(DB_URL);
  console.log('Testing connection to Neon DB...');
  const res = await sql`SELECT 1 as test`;
  console.log('Connection OK:', res);

  console.log('Creating table parcel_inspections...');
  await sql`
    CREATE TABLE IF NOT EXISTS parcel_inspections (
      id SERIAL PRIMARY KEY,
      tracking_no VARCHAR(100) NOT NULL,
      station_id VARCHAR(50) DEFAULT 'SORT-01',
      status VARCHAR(20) NOT NULL, -- PASS / REJECT
      damage_type VARCHAR(50) NOT NULL, -- NORMAL, DENT, TEAR, WATER_STAIN, WEIGHT_ANOMALY
      confidence NUMERIC(5,2) DEFAULT 0,
      weight_kg NUMERIC(6,3) DEFAULT 0,
      expected_weight_kg NUMERIC(6,3) DEFAULT 0,
      reject_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('Table parcel_inspections created / verified successfully.');

  const count = await sql`SELECT count(*) FROM parcel_inspections`;
  console.log('Current rows in DB:', count);
}

main().catch(console.error);
