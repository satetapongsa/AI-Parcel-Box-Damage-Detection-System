import { neon } from '@neondatabase/serverless';

// Neon PostgreSQL connection
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_QjI8V7vPWKoc@ep-withered-fire-azqk8g3a-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(NEON_CONNECTION_STRING);

export interface DbParcelInspection {
  id: number;
  tracking_no: string;
  station_id: string;
  status: string;
  damage_type: string;
  confidence: number;
  weight_kg: number;
  expected_weight_kg: number;
  reject_reason: string | null;
  created_at: string;
}

/**
 * Inserts a parcel inspection record into Neon DB
 */
export async function saveInspectionToNeon(record: {
  tracking_no: string;
  station_id?: string;
  status: 'PASS' | 'REJECT';
  damage_type: string;
  confidence: number;
  weight_kg: number;
  expected_weight_kg?: number;
  reject_reason?: string;
}): Promise<boolean> {
  try {
    await sql`
      INSERT INTO parcel_inspections (
        tracking_no, station_id, status, damage_type, confidence, weight_kg, expected_weight_kg, reject_reason
      ) VALUES (
        ${record.tracking_no},
        ${record.station_id || 'SORT-01'},
        ${record.status},
        ${record.damage_type},
        ${record.confidence},
        ${record.weight_kg},
        ${record.expected_weight_kg || 2.40},
        ${record.reject_reason || null}
      );
    `;
    return true;
  } catch (err) {
    console.error('Failed to save inspection to Neon DB:', err);
    return false;
  }
}

/**
 * Fetches recent inspections directly from Neon DB
 */
export async function fetchRecentInspectionsFromNeon(limit = 100): Promise<DbParcelInspection[]> {
  try {
    const rows = await sql`
      SELECT 
        id, 
        tracking_no, 
        station_id, 
        status, 
        damage_type, 
        confidence, 
        weight_kg, 
        expected_weight_kg, 
        reject_reason, 
        created_at
      FROM parcel_inspections
      ORDER BY id DESC
      LIMIT ${limit};
    `;
    return rows as DbParcelInspection[];
  } catch (err) {
    console.error('Failed to fetch from Neon DB:', err);
    return [];
  }
}

/**
 * Fetches aggregate metrics from Neon DB
 */
export async function fetchNeonStats(): Promise<{
  total: number;
  passCount: number;
  rejectCount: number;
  rejectRate: number;
  dentCount: number;
  tearCount: number;
  wetCount: number;
  weightAnomalyCount: number;
}> {
  try {
    const rows = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PASS' THEN 1 END) as pass_count,
        COUNT(CASE WHEN status = 'REJECT' THEN 1 END) as reject_count,
        COUNT(CASE WHEN damage_type = 'DENT' THEN 1 END) as dent_count,
        COUNT(CASE WHEN damage_type = 'TEAR' THEN 1 END) as tear_count,
        COUNT(CASE WHEN damage_type = 'WATER_STAIN' THEN 1 END) as wet_count,
        COUNT(CASE WHEN damage_type = 'WEIGHT_ANOMALY' THEN 1 END) as weight_count
      FROM parcel_inspections;
    `;
    if (rows && rows.length > 0) {
      const r = rows[0];
      const total = Number(r.total) || 0;
      const rejectCount = Number(r.reject_count) || 0;
      return {
        total,
        passCount: Number(r.pass_count) || 0,
        rejectCount,
        rejectRate: total > 0 ? Number(((rejectCount / total) * 100).toFixed(1)) : 0,
        dentCount: Number(r.dent_count) || 0,
        tearCount: Number(r.tear_count) || 0,
        wetCount: Number(r.wet_count) || 0,
        weightAnomalyCount: Number(r.weight_count) || 0
      };
    }
  } catch (err) {
    console.error('Failed to fetch stats from Neon DB:', err);
  }
  return {
    total: 0,
    passCount: 0,
    rejectCount: 0,
    rejectRate: 0,
    dentCount: 0,
    tearCount: 0,
    wetCount: 0,
    weightAnomalyCount: 0
  };
}
