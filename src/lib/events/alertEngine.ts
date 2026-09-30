import type { InspectionEvent, SystemAlertEvent } from './inspectionEvent';

export class AlertEngine {
  static evaluate(event: InspectionEvent, confidenceThreshold: number = 85, weightTolerancePct: number = 5): SystemAlertEvent | null {
    if (event.ai.damageDetected && event.ai.confidence >= confidenceThreshold) {
      const isCritical = event.ai.confidence >= 90 || event.ai.damageType === 'tear';
      return {
        event: 'system_alert',
        alertId: `alt-${Date.now()}`,
        stationId: event.stationId,
        timestamp: event.timestamp,
        type: 'AI_DAMAGE',
        severity: isCritical ? 'CRITICAL' : 'WARNING',
        title: `🚨 AI DAMAGE DETECTED: ${event.ai.damageType.toUpperCase()}`,
        description: `Tracking ${event.trackingNumber}: ${event.ai.damageType.toUpperCase()} defect detected with ${event.ai.confidence}% confidence. Actuator REJECT ${event.actuator.rejectTriggered ? 'Triggered' : 'Idle'}.`,
        trackingNumber: event.trackingNumber,
        payload: event
      };
    }

    if (Math.abs(event.weight.differencePercent) > weightTolerancePct) {
      return {
        event: 'system_alert',
        alertId: `alt-${Date.now()}`,
        stationId: event.stationId,
        timestamp: event.timestamp,
        type: 'WEIGHT_ANOMALY',
        severity: 'WARNING',
        title: `⚖️ WEIGHT ANOMALY DETECTED`,
        description: `Tracking ${event.trackingNumber}: Weight discrepancy of ${event.weight.differencePercent}% (Actual: ${event.weight.actual}kg, Expected: ${event.weight.expected}kg).`,
        trackingNumber: event.trackingNumber,
        payload: event
      };
    }

    return null;
  }
}
