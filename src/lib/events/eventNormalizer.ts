import type { InspectionEvent, DamageClass, DecisionReason } from './inspectionEvent';

export class EventNormalizer {
  static normalize(raw: any, stationId: string = 'SORT-01'): InspectionEvent {
    const timestamp = raw.timestamp || new Date().toLocaleTimeString('en-GB', { hour12: false });
    const trackingNumber = raw.trackingNumber || `THA-20261001-${Math.floor(Math.random() * 899999 + 100000)}`;

    const rawDamage = (raw.damageType || raw.ai?.damageType || 'none').toLowerCase();
    let damageType: DamageClass = 'none';
    if (rawDamage.includes('dent')) damageType = 'dent';
    else if (rawDamage.includes('tear')) damageType = 'tear';
    else if (rawDamage.includes('wet') || rawDamage.includes('water')) damageType = 'water_stain';

    const confidence = Number(raw.confidence || raw.ai?.confidence || 95.0);
    const damageDetected = damageType !== 'none' && confidence >= 85.0;

    const actualWeight = Number(raw.weight?.actual || raw.weight || 2.40);
    const expectedWeight = Number(raw.weight?.expected || 2.40);
    const diffPct = Number(raw.weight?.differencePercent || Math.round(((actualWeight - expectedWeight) / expectedWeight) * 1000) / 10);
    const isWeightAnomaly = Math.abs(diffPct) > 5.0;

    let reason: DecisionReason = 'NORMAL';
    if (damageDetected && isWeightAnomaly) reason = 'AI_AND_WEIGHT';
    else if (damageDetected) reason = 'AI_DAMAGE';
    else if (isWeightAnomaly) reason = 'WEIGHT_ANOMALY';

    const status = (damageDetected || isWeightAnomaly) ? 'REJECT' : 'PASS';
    const rejectTriggered = status === 'REJECT';

    return {
      event: 'parcel_inspection',
      stationId,
      timestamp,
      trackingNumber,
      ai: {
        damageDetected,
        damageType,
        confidence
      },
      weight: {
        actual: actualWeight,
        expected: expectedWeight,
        differencePercent: diffPct
      },
      decision: {
        status,
        reason
      },
      actuator: {
        rejectTriggered,
        delayMs: Number(raw.actuatorDelayMs || 180)
      },
      evidence: {
        topCamera: raw.evidence?.topCamera || 'cam-01-capture.jpg',
        sideCamera: raw.evidence?.sideCamera || 'cam-02-capture.jpg'
      }
    };
  }
}
