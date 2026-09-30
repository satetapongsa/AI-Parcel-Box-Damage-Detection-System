export type DamageType = 'NORMAL' | 'DAMAGED' | 'WET' | 'OPEN';
export type SeverityLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DecisionStatus = 'PASS' | 'HOLD' | 'MANUAL INSPECTION';

export interface BoundingBox {
  x: number;      // % from left
  y: number;      // % from top
  width: number;  // % width
  height: number; // % height
  label: string;
  confidence: number;
}

export interface ParcelInspection {
  id: string;
  parcelId: string;
  timestamp: string;
  time: string;
  camera: string;
  result: DamageType;
  damageType: DamageType;
  confidence: number;
  severity: SeverityLevel;
  status: DecisionStatus;
  detectedIssues: { issue: string; confidence: number }[];
  recommendation: string;
  inspector?: string;
  boundingBoxes: BoundingBox[];
  imageUrl?: string;
  decisionTimeline?: { time: string; event: string; user?: string }[];
}

export interface SystemComponentStatus {
  name: string;
  type: string;
  status: 'ONLINE' | 'WARNING' | 'OFFLINE' | 'READY';
  metrics?: string;
  ping?: string;
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
