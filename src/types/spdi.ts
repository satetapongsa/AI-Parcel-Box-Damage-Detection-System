export type DamageType = 'NORMAL' | 'DENT' | 'TEAR' | 'WATER_STAIN' | 'WEIGHT_ANOMALY';
export type DecisionStatus = 'PASS' | 'REJECT';
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type NodeStatus = 'ONLINE' | 'WARNING' | 'OFFLINE' | 'ERROR' | 'READY';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
}

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
  towerLight: 'GREEN' | 'YELLOW' | 'RED';
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
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  source: 'IR SENSOR' | 'CAMERA' | 'OCR' | 'EDGE AI' | 'LOAD CELL' | 'DECISION ENGINE' | 'ACTUATOR' | 'SYSTEM';
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
  aiConfidenceThreshold: number; // e.g. 85
  actuatorDelayMs: number;       // e.g. 180
  weightTolerancePct: number;    // e.g. 5
  conveyorSpeedMs: number;       // e.g. 0.75
  cameraExposure: number;        // e.g. 450
  brightnessThreshold: number;   // e.g. 120
  offlineQueueLimit: number;     // e.g. 500
}
