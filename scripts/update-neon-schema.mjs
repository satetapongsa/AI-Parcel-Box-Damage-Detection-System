import { neon } from '@neondatabase/serverless';

const DB_URL = 'postgresql://neondb_owner:npg_QjI8V7vPWKoc@ep-withered-fire-azqk8g3a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function updateSchema() {
  const sql = neon(DB_URL);
  console.log('Adding resolution columns to parcel_inspections...');
  await sql`
    ALTER TABLE parcel_inspections 
    ADD COLUMN IF NOT EXISTS handled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS handled_reason TEXT,
    ADD COLUMN IF NOT EXISTS handled_at TIMESTAMP WITH TIME ZONE;
  `;
  console.log('Schema updated successfully.');
}

updateSchema().catch(console.error);
