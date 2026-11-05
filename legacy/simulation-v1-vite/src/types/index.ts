export type DamageType = 'NORMAL' | 'DENT' | 'TEAR' | 'WATER_STAIN' | 'WEIGHT_ANOMALY';
export type DecisionStatus = 'PASS' | 'REJECT';
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type NodeStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'ERROR' | 'READY';

export type TowerLightColor = 'GREEN' | 'YELLOW' | 'RED';

export interface BoundingBox {
  x: number;      // % from left
  y: number;      // % from top
  width: number;  // % width
  height: number; // % height
  label: string;
  confidence: number;
}

export interface ParcelRecord {
  id: string;
  trackingNumber: string;
  timestamp: string;
  time: string;
  status: DecisionStatus;
  damageType: DamageType;
  aiConfidence: number;
  weight: number;
  expectedWeight: number;
  weightDifference: number; // percentage
  stationId: string;
  rejectReason?: string;
  topCameraImage?: string;
  sideCameraImage?: string;
  boundingBoxesTop: BoundingBox[];
  boundingBoxesSide: BoundingBox[];
  actuatorTriggered: boolean;
  syncedToCloud: boolean;
  handled?: boolean;
  handledReason?: string;
}

// Backward-compatibility alias for older components (replaces legacy ParcelInspection)
export type ParcelInspection = ParcelRecord & {
  parcelId: string;
  camera?: string;
  result: DamageType;
  severity: SeverityLevel;
  detectedIssues: { issue: string; confidence: number }[];
  recommendation: string;
  inspector?: string;
  boundingBoxes: BoundingBox[];
  imageUrl?: string;
  decisionTimeline?: { time: string; event: string; user?: string }[];
};

export interface SystemStatusState {
  stationId: string;
  conveyorStatus: 'ACTIVE' | 'PAUSED' | 'JAMMED';
  cameraTopStatus: NodeStatus;
  cameraSideStatus: NodeStatus;
  irSensorStatus: 'TRIGGERED' | 'READY' | 'FAULT';
  loadCellStatus: 'READY' | 'MEASURING' | 'UNSTABLE';
  edgeAIStatus: NodeStatus;
  decisionEngineStatus: NodeStatus;
  actuatorStatus: 'READY' | 'FIRING' | 'FAULT';
  towerLight: TowerLightColor;
  buzzer: boolean;
  localDatabaseStatus: NodeStatus;
  mqttStatus: NodeStatus;
  internetStatus: NodeStatus;
  cloudSyncStatus: NodeStatus;
  isOfflineMode: boolean;
  pendingSyncCount: number;
  conveyorSpeed: number; // m/s
  airPressure: number; // bar
  aiFps: number;
  aiInferenceMs: number;
  missedRejectCount?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  source: 'IR SENSOR' | 'CAMERA' | 'OCR' | 'EDGE AI' | 'LOAD CELL' | 'DECISION ENGINE' | 'ACTUATOR' | 'LOCAL DB' | 'CLOUD' | 'UART' | 'SYSTEM';
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface AnomalyLog {
  id: string;
  timestamp: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  resolved: boolean;
}

export interface FailureTestScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  expectedResult: string;
  simulatedDamage: DamageType;
  testSteps: string[];
}

export interface ArchitectureNode {
  id: string;
  title: string;
  category: 'SENSOR' | 'VISION' | 'COMPUTE' | 'ACTUATOR' | 'STORAGE' | 'NETWORK';
  role: string;
  input: string;
  output: string;
  spec: string;
  protocol: string;
  latency: string;
  status: NodeStatus;
}

export interface EngineeringSettings {
  aiConfidenceThreshold: number; // e.g. 85 %
  weightTolerancePct: number;    // e.g. 5 %
  conveyorSpeedMs: number;       // e.g. 0.75 m/s
  aiInferenceSec: number;        // e.g. 0.20 s benchmark
  actuatorDelayMs: number;       // e.g. 180 ms
  actuatorType: 'PNEUMATIC' | 'SERVO'; // Default PNEUMATIC
  actuatorDistanceInstalledM: number; // Installed distance (meters)
  irTimeoutSec: number;          // IR timeout (seconds)
  minBrightness: number;         // Minimum optical lux threshold
  offlineQueueLimit: number;     // e.g. 500 records
  classMapping: Record<string, DamageType>; // e.g. { 'box_good': 'NORMAL', 'box_dent': 'DENT' }
  reviewStateEnabled: boolean;   // Third state "Operator Review" (REVIEW 60-85%)
  weakAiModelMode?: boolean;     // Degraded AI model for false positive testing
  dropCameraSide?: boolean;      // Disconnect side camera
  actuatorFault?: boolean;       // Actuator mechanical fault
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  parcelId?: string;
  read: boolean;
}

// Canonical BridgePayload matching bridge.py and api/inspections.ts
export interface BridgePayload {
  tracking_no: string;
  station_id: string;
  result: 'PASS' | 'REJECT';
  damage_type: 'NORMAL' | 'DENT' | 'TEAR' | 'WATER_STAIN' | 'WEIGHT_ANOMALY';
  confidence: number;
  weight_g: number;
  inspected_at: string;
}
