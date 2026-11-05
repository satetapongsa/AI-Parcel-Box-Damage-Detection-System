import { describe, it, expect } from 'vitest';
import { calculateRequiredActuatorDistance, evaluateInspectionDecision, checkActuatorTiming, getTowerLightState } from '../rules';
import { BridgeQueue } from '../bridgeQueue';
import { parcelRecordToBridgePayload, bridgePayloadToParcelRecord, validateBridgePayload } from '../../adapters/mappers';
import type { EngineeringSettings, ParcelRecord, BridgePayload } from '../../../types';

const mockSettings: EngineeringSettings = {
  aiConfidenceThreshold: 85,
  weightTolerancePct: 5,
  conveyorSpeedMs: 0.75,
  aiInferenceSec: 0.20,
  actuatorDelayMs: 180,
  actuatorType: 'PNEUMATIC',
  actuatorDistanceInstalledM: 0.35,
  irTimeoutSec: 3.0,
  minBrightness: 120,
  offlineQueueLimit: 500,
  classMapping: { box_good: 'NORMAL' },
  reviewStateEnabled: false
};

describe('Rules Engine (Pure)', () => {
  it('calculates required actuator distance correctly', () => {
    // 0.75 * (0.20 + 0.18) = 0.75 * 0.38 = 0.285 m
    const dist = calculateRequiredActuatorDistance(0.75, 0.20, 180);
    expect(dist).toBe(0.285);
  });

  it('checks actuator timing boundary and detects missed reject', () => {
    // Required is 0.285m. If installed is 0.25m, timing is insufficient!
    const resShort = checkActuatorTiming(0.75, 0.20, 180, 0.25);
    expect(resShort.isTimingSufficient).toBe(false);
    expect(resShort.missMarginM).toBe(-0.035);

    // If installed is 0.35m, sufficient
    const resGood = checkActuatorTiming(0.75, 0.20, 180, 0.35);
    expect(resGood.isTimingSufficient).toBe(true);
    expect(resGood.missMarginM).toBe(0.065);
  });

  it('evaluates threshold boundary conditions (84.9% vs 85.0%)', () => {
    // At 84.9%, below threshold of 85% -> PASS
    const passEval = evaluateInspectionDecision('DENT', 84.9, 0, mockSettings);
    expect(passEval.status).toBe('PASS');

    // At 85.0%, equal threshold -> REJECT
    const rejectEval = evaluateInspectionDecision('DENT', 85.0, 0, mockSettings);
    expect(rejectEval.status).toBe('REJECT');
  });

  it('evaluates weight tolerance (±5%)', () => {
    // Within tolerance 4.9% -> PASS
    const passWeight = evaluateInspectionDecision('NORMAL', 99, 4.9, mockSettings);
    expect(passWeight.status).toBe('PASS');

    // Beyond tolerance 5.1% -> REJECT
    const rejectWeight = evaluateInspectionDecision('NORMAL', 99, 5.1, mockSettings);
    expect(rejectWeight.status).toBe('REJECT');
  });

  it('determines tower light colors according to spec (Green=Pass, Red=Reject, Yellow=Offline/Fault)', () => {
    expect(getTowerLightState('PASS', false, false, false).color).toBe('GREEN');
    expect(getTowerLightState('REJECT', false, false, true).color).toBe('RED');
    expect(getTowerLightState('PASS', true, false, false).color).toBe('YELLOW');
    expect(getTowerLightState('PASS', false, true, false).color).toBe('YELLOW');
  });
});

describe('Store-and-Forward BridgeQueue (Pure)', () => {
  it('enforces queue capacity and drops oldest items FIFO', () => {
    const queue = new BridgeQueue(3);
    const p1: BridgePayload = { tracking_no: 'T1', station_id: 'S1', result: 'PASS', damage_type: 'NORMAL', confidence: 99, weight_g: 2400, inspected_at: '2026-10-22' };
    const p2: BridgePayload = { tracking_no: 'T2', station_id: 'S1', result: 'PASS', damage_type: 'NORMAL', confidence: 99, weight_g: 2400, inspected_at: '2026-10-22' };
    const p3: BridgePayload = { tracking_no: 'T3', station_id: 'S1', result: 'PASS', damage_type: 'NORMAL', confidence: 99, weight_g: 2400, inspected_at: '2026-10-22' };
    const p4: BridgePayload = { tracking_no: 'T4', station_id: 'S1', result: 'PASS', damage_type: 'NORMAL', confidence: 99, weight_g: 2400, inspected_at: '2026-10-22' };

    queue.enqueue(p1);
    queue.enqueue(p2);
    queue.enqueue(p3);
    expect(queue.size()).toBe(3);

    const { droppedOldest } = queue.enqueue(p4);
    expect(droppedOldest).toBe(true);
    expect(queue.size()).toBe(3);
    const remainingTrackings = queue.getItems().map((i) => i.payload.tracking_no);
    expect(remainingTrackings).toEqual(['T2', 'T3', 'T4']);
  });

  it('handles response codes: deletes on 2xx and 400/422, keeps on 401/429/5xx', () => {
    const queue = new BridgeQueue(10);
    const p1: BridgePayload = { tracking_no: 'T1', station_id: 'S1', result: 'PASS', damage_type: 'NORMAL', confidence: 99, weight_g: 2400, inspected_at: '2026-10-22' };
    queue.enqueue(p1);
    const item = queue.getItems()[0];

    // Auth error 401 -> KEEP
    expect(queue.handleResponse(item.id, 401)).toBe('RETRY');
    expect(queue.size()).toBe(1);

    // Server error 500 -> KEEP
    expect(queue.handleResponse(item.id, 500)).toBe('RETRY');
    expect(queue.size()).toBe(1);

    // Malformed error 422 -> REMOVE
    expect(queue.handleResponse(item.id, 422)).toBe('REMOVE');
    expect(queue.size()).toBe(0);
  });
});

describe('Mappers and Payload Validation', () => {
  it('validates bridge payload correctly', () => {
    const validPayload: BridgePayload = {
      tracking_no: 'THA-20261022-000001',
      station_id: 'SORT-01',
      result: 'PASS',
      damage_type: 'NORMAL',
      confidence: 95.5,
      weight_g: 2400,
      inspected_at: '2026-10-22T08:00:00Z'
    };
    expect(validateBridgePayload(validPayload).valid).toBe(true);

    const invalidTracking = { ...validPayload, tracking_no: '' };
    expect(validateBridgePayload(invalidTracking).valid).toBe(false);

    const invalidConfidence = { ...validPayload, confidence: 150 };
    expect(validateBridgePayload(invalidConfidence).valid).toBe(false);
  });

  it('performs bidirectional mapping without losing essential fields', () => {
    const record: ParcelRecord = {
      id: 'rec-1',
      trackingNumber: 'THA-20261022-999999',
      timestamp: '2026-10-22T10:00:00Z',
      time: '10:00:00',
      status: 'REJECT',
      damageType: 'DENT',
      aiConfidence: 92.4,
      weight: 2.55,
      expectedWeight: 2.40,
      weightDifference: 6.2,
      stationId: 'SORT-01',
      boundingBoxesTop: [],
      boundingBoxesSide: [],
      actuatorTriggered: true,
      syncedToCloud: true
    };

    const payload = parcelRecordToBridgePayload(record);
    expect(payload.tracking_no).toBe(record.trackingNumber);
    expect(payload.result).toBe(record.status);
    expect(payload.damage_type).toBe(record.damageType);
    expect(payload.weight_g).toBe(2550);

    const backToRecord = bridgePayloadToParcelRecord(payload);
    expect(backToRecord.trackingNumber).toBe(record.trackingNumber);
    expect(backToRecord.status).toBe(record.status);
    expect(backToRecord.damageType).toBe(record.damageType);
  });
});
