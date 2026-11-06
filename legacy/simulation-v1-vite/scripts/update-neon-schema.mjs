import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.NEON_DATABASE_URL;
if (!DB_URL) {
  console.error('Set NEON_DATABASE_URL (Neon connection string) in your environment first.');
  process.exit(1);
}

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
