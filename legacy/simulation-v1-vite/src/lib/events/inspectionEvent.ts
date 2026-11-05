export type DamageClass = 'none' | 'dent' | 'tear' | 'water_stain';
export type DecisionStatus = 'PASS' | 'REJECT';
export type DecisionReason = 'NORMAL' | 'AI_DAMAGE' | 'WEIGHT_ANOMALY' | 'AI_AND_WEIGHT';

export interface InspectionEvent {
  event: 'parcel_inspection';
  stationId: string;
  timestamp: string;
  trackingNumber: string;
  ai: {
    damageDetected: boolean;
    damageType: DamageClass;
    confidence: number;
  };
  weight: {
    actual: number;
    expected: number;
    differencePercent: number;
  };
  decision: {
    status: DecisionStatus;
    reason: DecisionReason;
  };
  actuator: {
    rejectTriggered: boolean;
    delayMs: number;
  };
  evidence?: {
    topCamera?: string;
    sideCamera?: string;
  };
}

export interface SystemAlertEvent {
  event: 'system_alert';
  alertId: string;
  stationId: string;
  timestamp: string;
  type: 'AI_DAMAGE' | 'WEIGHT_ANOMALY' | 'CAMERA_FAULT' | 'SENSOR_FAULT' | 'ACTUATOR_FAULT' | 'NETWORK_OFFLINE' | 'CLOUD_SYNC';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  trackingNumber?: string;
  payload?: any;
}

export interface ConnectionHealth {
  ciraCore: 'CONNECTED' | 'WARNING' | 'DISCONNECTED';
  mqttBroker: 'CONNECTED' | 'WARNING' | 'DISCONNECTED';
  edgeBridge: 'CONNECTED' | 'WARNING' | 'DISCONNECTED';
  database: 'CONNECTED' | 'WARNING' | 'DISCONNECTED';
  webClient: 'CONNECTED' | 'WARNING' | 'DISCONNECTED';
}
