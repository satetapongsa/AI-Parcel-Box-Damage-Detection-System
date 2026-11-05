import type { DamageType, DecisionStatus, EngineeringSettings, TowerLightColor } from '../../types';

/**
 * Calculates the required actuator distance in meters based on:
 * Distance = Conveyor Speed (m/s) * (AI Inference Time (s) + Actuator Delay (s))
 */
export function calculateRequiredActuatorDistance(
  conveyorSpeedMs: number,
  aiInferenceSec: number,
  actuatorDelayMs: number
): number {
  const totalDelaySec = aiInferenceSec + actuatorDelayMs / 1000;
  return Number((conveyorSpeedMs * totalDelaySec).toFixed(3));
}

/**
 * Evaluates whether an inspection passes or is rejected based on:
 * - AI Confidence >= Threshold for any defect
 * - Weight deviation > Tolerance %
 * - Review status if enabled
 */
export function evaluateInspectionDecision(
  damageType: DamageType,
  aiConfidence: number,
  weightDiffPercent: number,
  settings: EngineeringSettings
): {
  status: DecisionStatus;
  reason: string;
  isMissedReject?: boolean;
} {
  const isWeightAnomaly = Math.abs(weightDiffPercent) > settings.weightTolerancePct;
  const isAiDefect = damageType !== 'NORMAL' && aiConfidence >= settings.aiConfidenceThreshold;

  // Review mode check
  if (settings.reviewStateEnabled && damageType !== 'NORMAL' && aiConfidence >= 60 && aiConfidence < settings.aiConfidenceThreshold) {
    return {
      status: 'REJECT', // or HOLD/REVIEW treated as safety reject
      reason: `REVIEW_REQUIRED: ${damageType} confidence ${aiConfidence}% (within 60-${settings.aiConfidenceThreshold}%)`
    };
  }

  if (isAiDefect && isWeightAnomaly) {
    return {
      status: 'REJECT',
      reason: `DEFECT_AND_WEIGHT: ${damageType} (${aiConfidence}%) & Weight diff ${weightDiffPercent.toFixed(1)}%`
    };
  }

  if (isAiDefect) {
    return {
      status: 'REJECT',
      reason: `AI_DEFECT: ${damageType} (${aiConfidence}%) >= ${settings.aiConfidenceThreshold}%`
    };
  }

  if (isWeightAnomaly) {
    return {
      status: 'REJECT',
      reason: `WEIGHT_ANOMALY: Weight difference ${weightDiffPercent.toFixed(1)}% exceeds ±${settings.weightTolerancePct}%`
    };
  }

  return {
    status: 'PASS',
    reason: 'NORMAL: Parcel passed all automated inspection criteria'
  };
}

/**
 * Checks if the actuator position is sufficient to catch the parcel before it passes the actuator.
 * If installed distance < required distance, the actuator will miss the reject!
 */
export function checkActuatorTiming(
  conveyorSpeedMs: number,
  aiInferenceSec: number,
  actuatorDelayMs: number,
  installedDistanceM: number
): {
  requiredDistanceM: number;
  isTimingSufficient: boolean;
  missMarginM: number;
} {
  const requiredDistanceM = calculateRequiredActuatorDistance(
    conveyorSpeedMs,
    aiInferenceSec,
    actuatorDelayMs
  );
  const isTimingSufficient = installedDistanceM >= requiredDistanceM;
  const missMarginM = Number((installedDistanceM - requiredDistanceM).toFixed(3));

  return {
    requiredDistanceM,
    isTimingSufficient,
    missMarginM
  };
}

/**
 * Maps system status to LED Tower Light according to project spec:
 * - GREEN = PASS / Normal Operation
 * - RED (+ buzzer) = Defect / Reject in progress
 * - YELLOW = Offline (WAN cut) or System fault / Jammed
 */
export function getTowerLightState(
  status: DecisionStatus | null,
  isOffline: boolean,
  hasFault: boolean,
  isRejectFiring: boolean
): {
  color: TowerLightColor;
  buzzer: boolean;
  description: string;
} {
  if (isOffline || hasFault) {
    return {
      color: 'YELLOW',
      buzzer: false,
      description: isOffline ? 'OFFLINE: WAN severed (Store-and-Forward queue active)' : 'FAULT: Hardware or Vision anomaly'
    };
  }

  if (isRejectFiring || status === 'REJECT') {
    return {
      color: 'RED',
      buzzer: true,
      description: 'REJECT: Defective parcel detected / Actuator firing'
    };
  }

  return {
    color: 'GREEN',
    buzzer: false,
    description: 'PASS: System operational / Parcel cleared'
  };
}
