import type { DamageType } from '../../types';

/**
 * Deterministic PRNG using LCG (Linear Congruential Generator)
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
}

export interface ParcelDistribution {
  normalRatio: number;      // e.g. 0.80
  dentRatio: number;        // e.g. 0.08
  tearRatio: number;        // e.g. 0.07
  waterStainRatio: number;  // e.g. 0.05
}

export const DEFAULT_DISTRIBUTION: ParcelDistribution = {
  normalRatio: 0.80,
  dentRatio: 0.08,
  tearRatio: 0.07,
  waterStainRatio: 0.05
};

export interface GeneratedParcelSpec {
  trackingNumber: string;
  damageType: DamageType;
  aiConfidence: number;
  weightKg: number;
  expectedWeightKg: number;
  brightness: number;
  barcodeReadable: boolean;
  isFalsePositivePattern?: boolean;
  labelTag: string; // e.g. "box_good-157 95%" or "box_dent-204 89%"
}

let trackingCounter = 1250;

export function generateParcelSpec(
  rng: SeededRandom = new SeededRandom(Date.now()),
  forcedType?: DamageType,
  isFalsePositiveCase = false
): GeneratedParcelSpec {
  trackingCounter += 1;
  const numStr = String(trackingCounter).padStart(6, '0');
  const trackingNumber = `THA-20261022-${numStr}`;

  let damageType: DamageType = 'NORMAL';

  if (forcedType) {
    damageType = forcedType;
  } else {
    const roll = rng.next();
    if (roll < 0.80) damageType = 'NORMAL';
    else if (roll < 0.88) damageType = 'DENT';
    else if (roll < 0.95) damageType = 'TEAR';
    else damageType = 'WATER_STAIN';
  }

  let aiConfidence = 0;
  let labelTag = '';
  const seqNum = Math.floor(rng.next() * 800) + 100;

  if (isFalsePositiveCase) {
    // Printed pattern that resembles a tear: High-grade model PASSes (low confidence ~42%), Weak model flags tear
    aiConfidence = 42.0;
    labelTag = `box_pattern-${seqNum} ${aiConfidence.toFixed(0)}%`;
  } else if (damageType === 'NORMAL') {
    aiConfidence = Number((92 + rng.next() * 7.5).toFixed(1));
    labelTag = `box_good-${seqNum} ${aiConfidence.toFixed(0)}%`;
  } else if (damageType === 'DENT') {
    aiConfidence = Number((86 + rng.next() * 12).toFixed(1));
    labelTag = `box_dent-${seqNum} ${aiConfidence.toFixed(0)}%`;
  } else if (damageType === 'TEAR') {
    aiConfidence = Number((87 + rng.next() * 11.5).toFixed(1));
    labelTag = `box_tear-${seqNum} ${aiConfidence.toFixed(0)}%`;
  } else if (damageType === 'WATER_STAIN') {
    aiConfidence = Number((85 + rng.next() * 13).toFixed(1));
    labelTag = `box_water-${seqNum} ${aiConfidence.toFixed(0)}%`;
  } else if (damageType === 'WEIGHT_ANOMALY') {
    aiConfidence = Number((90 + rng.next() * 8).toFixed(1));
    labelTag = `box_good-${seqNum} ${aiConfidence.toFixed(0)}%`;
  }

  const expectedWeightKg = 2.40;
  let weightKg = expectedWeightKg;
  if (damageType === 'WEIGHT_ANOMALY') {
    // deviation > 5% (e.g. 2.75kg or 2.1kg)
    weightKg = rng.next() > 0.5 ? 2.68 : 2.15;
  } else {
    // Normal small variation ±1.5%
    weightKg = Number((2.37 + rng.next() * 0.07).toFixed(2));
  }

  const brightness = Math.floor(130 + rng.next() * 50);

  return {
    trackingNumber,
    damageType,
    aiConfidence,
    weightKg,
    expectedWeightKg,
    brightness,
    barcodeReadable: true,
    isFalsePositivePattern: isFalsePositiveCase,
    labelTag
  };
}
