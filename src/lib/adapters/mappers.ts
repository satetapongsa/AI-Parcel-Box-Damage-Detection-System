import type { ParcelRecord, BridgePayload, DamageType, DecisionStatus } from '../../types';

export function parcelRecordToBridgePayload(record: ParcelRecord): BridgePayload {
  return {
    tracking_no: record.trackingNumber,
    station_id: record.stationId || 'SORT-01',
    result: record.status,
    damage_type: record.damageType,
    confidence: record.aiConfidence,
    weight_g: Math.round(record.weight * 1000),
    inspected_at: record.timestamp
  };
}

export function bridgePayloadToParcelRecord(payload: BridgePayload): ParcelRecord {
  const isReject = payload.result === 'REJECT';
  const weightKg = payload.weight_g / 1000;
  const expectedWeightKg = 2.4; // Default baseline
  const diffPercent = Number((((weightKg - expectedWeightKg) / expectedWeightKg) * 100).toFixed(1));

  return {
    id: String(Date.now()),
    trackingNumber: payload.tracking_no,
    timestamp: payload.inspected_at,
    time: payload.inspected_at.includes('T') ? payload.inspected_at.split('T')[1].slice(0, 8) : payload.inspected_at,
    status: payload.result,
    damageType: payload.damage_type,
    aiConfidence: payload.confidence,
    weight: weightKg,
    expectedWeight: expectedWeightKg,
    weightDifference: diffPercent,
    stationId: payload.station_id,
    rejectReason: isReject ? `Rejected: ${payload.damage_type} (${payload.confidence}%)` : undefined,
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: isReject,
    syncedToCloud: true
  };
}

export function validateBridgePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }
  if (!payload.tracking_no || typeof payload.tracking_no !== 'string' || !payload.tracking_no.trim()) {
    return { valid: false, error: 'tracking_no is required' };
  }
  const allowedResults: DecisionStatus[] = ['PASS', 'REJECT'];
  if (!allowedResults.includes(payload.result)) {
    return { valid: false, error: `Invalid result: ${payload.result}` };
  }
  const allowedDamageTypes: DamageType[] = ['NORMAL', 'DENT', 'TEAR', 'WATER_STAIN', 'WEIGHT_ANOMALY'];
  if (!allowedDamageTypes.includes(payload.damage_type)) {
    return { valid: false, error: `Invalid damage_type: ${payload.damage_type}` };
  }
  if (typeof payload.confidence !== 'number' || payload.confidence < 0 || payload.confidence > 100) {
    return { valid: false, error: 'confidence must be a number between 0 and 100' };
  }
  if (typeof payload.weight_g !== 'number' || payload.weight_g < 0) {
    return { valid: false, error: 'weight_g must be a non-negative number' };
  }
  return { valid: true };
}
