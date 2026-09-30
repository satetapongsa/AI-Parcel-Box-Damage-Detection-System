import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  ParcelRecord, 
  SystemStatusState, 
  TimelineEvent, 
  AnomalyLog, 
  EngineeringSettings,
  DamageType
} from '../types/spdi';
import { 
  INITIAL_PARCEL_RECORDS, 
  SYSTEM_ANOMALIES_LOG, 
  DEFAULT_ENGINEERING_SETTINGS 
} from '../data/mockData';
import { EdgeBridge, type DataSourceMode } from '../lib/edge/edgeBridge';
import { AlertEngine } from '../lib/events/alertEngine';
import type { ConnectionHealth, InspectionEvent } from '../lib/events/inspectionEvent';

interface SimulationContextType {
  parcels: ParcelRecord[];
  latestParcel: ParcelRecord;
  systemStatus: SystemStatusState;
  timelineEvents: TimelineEvent[];
  anomalies: AnomalyLog[];
  settings: EngineeringSettings;
  demoModeActive: boolean;
  demoSpeed: 'SLOW' | 'NORMAL' | 'FAST';
  isOfflineMode: boolean;
  pendingSyncCount: number;
  dataSourceMode: DataSourceMode;
  connectionHealth: ConnectionHealth;
  toast: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null;
  toggleDemoMode: () => void;
  setDemoSpeed: (speed: 'SLOW' | 'NORMAL' | 'FAST') => void;
  toggleOfflineMode: () => void;
  syncOfflineQueue: () => void;
  setDataSourceMode: (mode: DataSourceMode) => void;
  generateParcel: (forceDamage?: DamageType) => void;
  updateSettings: (newSettings: Partial<EngineeringSettings>) => void;
  resetSettings: () => void;
  runFailureTest: (testId: string) => Promise<{ passed: boolean; details: string }>;
  showToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const initialStatus: SystemStatusState = {
  stationId: 'SORT-01',
  conveyorStatus: 'ACTIVE',
  cameraTopStatus: 'ONLINE',
  cameraSideStatus: 'ONLINE',
  irSensorStatus: 'READY',
  loadCellStatus: 'READY',
  edgeAIStatus: 'ONLINE',
  decisionEngineStatus: 'ONLINE',
  actuatorStatus: 'READY',
  towerLight: 'GREEN',
  buzzer: false,
  localDatabaseStatus: 'ONLINE',
  mqttStatus: 'ONLINE',
  internetStatus: 'ONLINE',
  cloudSyncStatus: 'ONLINE',
  isOfflineMode: false,
  pendingSyncCount: 0,
  conveyorSpeed: 0.75,
  airPressure: 6.0,
  aiFps: 28,
  aiInferenceMs: 35
};

const edgeBridgeInstance = new EdgeBridge();

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parcels, setParcels] = useState<ParcelRecord[]>(INITIAL_PARCEL_RECORDS);
  const [latestParcel, setLatestParcel] = useState<ParcelRecord>(INITIAL_PARCEL_RECORDS[0]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>(initialStatus);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { id: 't1', timestamp: '08:42:11', source: 'IR SENSOR', message: 'IR Breakbeam beam interrupted — Parcel detected', type: 'info' },
    { id: 't2', timestamp: '08:42:12', source: 'CAMERA', message: 'Dual 1080p frame captured (Top & Side View)', type: 'info' },
    { id: 't3', timestamp: '08:42:12', source: 'OCR', message: 'Barcode decoded: THA-20260930-001248', type: 'info' },
    { id: 't4', timestamp: '08:42:13', source: 'EDGE AI', message: 'YOLOv8 damage inference complete (Normal condition)', type: 'success' },
    { id: 't5', timestamp: '08:42:13', source: 'LOAD CELL', message: 'Weight verified: 2.41 kg (Expected: 2.40 kg, Diff: +0.4%)', type: 'info' },
    { id: 't6', timestamp: '08:42:13', source: 'DECISION ENGINE', message: 'Final Decision: PASS -> Conveyor dispatch clear', type: 'success' },
    { id: 't7', timestamp: '08:42:14', source: 'ACTUATOR', message: 'Pneumatic reject cylinder idle', type: 'info' },
  ]);
  const [anomalies] = useState<AnomalyLog[]>(SYSTEM_ANOMALIES_LOG);
  const [settings, setSettings] = useState<EngineeringSettings>(DEFAULT_ENGINEERING_SETTINGS);

  const [demoModeActive, setDemoModeActive] = useState<boolean>(true);
  const [demoSpeed, setDemoSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const [dataSourceMode, setDataSourceModeState] = useState<DataSourceMode>('MOCK');
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>(edgeBridgeInstance.getConnectionHealth());

  const [toast, setToast] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null>(null);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const setDataSourceMode = (mode: DataSourceMode) => {
    setDataSourceModeState(mode);
    edgeBridgeInstance.setMode(mode);
    setConnectionHealth(edgeBridgeInstance.getConnectionHealth());

    if (mode === 'LIVE_EDGE') {
      showToast('LIVE EDGE MODE ACTIVATED', 'Connected to EdgeBridge. Waiting for live CiRA CORE MQTT events...', 'info');
    } else {
      showToast('MOCK DATA MODE', 'Switched to frontend simulated data stream.', 'info');
    }
  };

  const processNormalizedEvent = (evt: InspectionEvent) => {
    let damageType: DamageType = 'NORMAL';
    if (evt.ai.damageType === 'dent') damageType = 'DENT';
    else if (evt.ai.damageType === 'tear') damageType = 'TEAR';
    else if (evt.ai.damageType === 'water_stain') damageType = 'WATER_STAIN';
    else if (evt.decision.reason === 'WEIGHT_ANOMALY') damageType = 'WEIGHT_ANOMALY';

    const isRej = evt.decision.status === 'REJECT';
    let boxesTop: any[] = [];
    let boxesSide: any[] = [];

    if (damageType === 'DENT') {
      boxesTop = [{ x: 50, y: 18, width: 32, height: 35, label: `DENT ${evt.ai.confidence}%`, confidence: evt.ai.confidence }];
    } else if (damageType === 'TEAR') {
      boxesTop = [{ x: 28, y: 30, width: 38, height: 28, label: `TEAR ${evt.ai.confidence}%`, confidence: evt.ai.confidence }];
      boxesSide = [{ x: 35, y: 22, width: 30, height: 32, label: `Tear Seam`, confidence: evt.ai.confidence - 2 }];
    } else if (damageType === 'WATER_STAIN') {
      boxesTop = [{ x: 20, y: 35, width: 45, height: 42, label: `WATER STAIN ${evt.ai.confidence}%`, confidence: evt.ai.confidence }];
    }

    const newRecord: ParcelRecord = {
      id: String(Date.now()),
      trackingNumber: evt.trackingNumber,
      timestamp: evt.timestamp,
      time: evt.timestamp,
      status: evt.decision.status,
      damageType,
      aiConfidence: evt.ai.confidence,
      weight: evt.weight.actual,
      expectedWeight: evt.weight.expected,
      weightDifference: evt.weight.differencePercent,
      stationId: evt.stationId,
      rejectReason: isRej ? `Defect: ${damageType} (${evt.ai.confidence}% confidence)` : undefined,
      boundingBoxesTop: boxesTop,
      boundingBoxesSide: boxesSide,
      actuatorTriggered: evt.actuator.rejectTriggered,
      syncedToCloud: !isOfflineMode
    };

    if (isOfflineMode) {
      setPendingSyncCount((prev) => prev + 1);
    }

    setLatestParcel(newRecord);
    setParcels((prev) => [newRecord, ...prev]);

    // Alert Engine evaluation
    const alert = AlertEngine.evaluate(evt, settings.aiConfidenceThreshold, settings.weightTolerancePct);
    if (alert) {
      showToast(alert.title, alert.description, alert.severity === 'CRITICAL' ? 'danger' : 'warning');
    }

    // Timeline update
    const newTimeline: TimelineEvent[] = [
      { id: `t1-${Date.now()}`, timestamp: evt.timestamp, source: 'IR SENSOR', message: 'IR Breakbeam triggered — Parcel entry', type: 'info' },
      { id: `t2-${Date.now()}`, timestamp: evt.timestamp, source: 'CAMERA', message: 'Dual 1080p frame captured (Top & Side)', type: 'info' },
      { id: `t3-${Date.now()}`, timestamp: evt.timestamp, source: 'OCR', message: `Barcode scanned: ${evt.trackingNumber}`, type: 'info' },
      { id: `t4-${Date.now()}`, timestamp: evt.timestamp, source: 'EDGE AI', message: `YOLOv8 inference: ${evt.ai.damageType} (${evt.ai.confidence}%)`, type: isRej ? 'warning' : 'success' },
      { id: `t5-${Date.now()}`, timestamp: evt.timestamp, source: 'LOAD CELL', message: `Weight: ${evt.weight.actual}kg (Expected: ${evt.weight.expected}kg, Diff: ${evt.weight.differencePercent}%)`, type: 'info' },
      { id: `t6-${Date.now()}`, timestamp: evt.timestamp, source: 'DECISION ENGINE', message: `Final Decision: ${evt.decision.status}`, type: isRej ? 'danger' : 'success' },
      { id: `t7-${Date.now()}`, timestamp: evt.timestamp, source: 'ACTUATOR', message: evt.actuator.rejectTriggered ? 'Pneumatic Reject Cylinder FIRED' : 'Pneumatic Reject idle', type: evt.actuator.rejectTriggered ? 'danger' : 'info' },
    ];
    setTimelineEvents(newTimeline);

    setSystemStatus((prev) => ({
      ...prev,
      irSensorStatus: 'TRIGGERED',
      loadCellStatus: 'MEASURING',
      actuatorStatus: evt.actuator.rejectTriggered ? 'FIRING' : 'READY',
      towerLight: isRej ? 'RED' : 'GREEN',
      buzzer: evt.actuator.rejectTriggered
    }));

    setTimeout(() => {
      setSystemStatus((prev) => ({
        ...prev,
        irSensorStatus: 'READY',
        loadCellStatus: 'READY',
        actuatorStatus: 'READY',
        towerLight: 'GREEN',
        buzzer: false
      }));
    }, 1500);
  };

  const generateParcel = (forceDamage?: DamageType) => {
    let typeStr = 'none';
    if (forceDamage === 'DENT') typeStr = 'dent';
    else if (forceDamage === 'TEAR') typeStr = 'tear';
    else if (forceDamage === 'WATER_STAIN') typeStr = 'water_stain';
    else if (forceDamage === 'WEIGHT_ANOMALY') typeStr = 'weight_anomaly';

    const evt = edgeBridgeInstance.triggerManualScan(typeStr);
    processNormalizedEvent(evt);
  };

  // Connect EdgeBridge subscription
  useEffect(() => {
    edgeBridgeInstance.subscribe((evt) => {
      processNormalizedEvent(evt);
    });
  }, []);

  const toggleDemoMode = () => {
    setDemoModeActive(!demoModeActive);
    showToast('Demo Mode', demoModeActive ? 'Demo Mode Paused' : 'Demo Mode Active', 'info');
  };

  const toggleOfflineMode = () => {
    const nextOffline = !isOfflineMode;
    setIsOfflineMode(nextOffline);
    setSystemStatus((prev) => ({
      ...prev,
      isOfflineMode: nextOffline,
      internetStatus: nextOffline ? 'OFFLINE' : 'ONLINE',
      mqttStatus: nextOffline ? 'OFFLINE' : 'ONLINE',
      cloudSyncStatus: nextOffline ? 'OFFLINE' : 'ONLINE'
    }));

    if (nextOffline) {
      showToast('OFFLINE MODE ACTIVATED', 'WAN link cut. Edge AI continues sorting. Records queued in local SQLite DB.', 'warning');
    } else {
      showToast('ONLINE MODE RESTORED', 'Network connected. Store-and-Forward sync initiated.', 'success');
    }
  };

  const syncOfflineQueue = () => {
    if (pendingSyncCount === 0) {
      showToast('Queue Synced', 'All local records are already synchronized.', 'info');
      return;
    }
    const syncedCount = pendingSyncCount;
    setPendingSyncCount(0);
    setParcels((prev) => prev.map((p) => ({ ...p, syncedToCloud: true })));
    setSystemStatus((prev) => ({
      ...prev,
      internetStatus: 'ONLINE',
      mqttStatus: 'ONLINE',
      cloudSyncStatus: 'ONLINE',
      isOfflineMode: false
    }));
    setIsOfflineMode(false);
    showToast('Synchronization Complete', `${syncedCount} / ${syncedCount} local records synced with Cloud Dashboard.`, 'success');
  };

  const updateSettings = (newSettings: Partial<EngineeringSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    showToast('Settings Saved', 'Engineering parameters updated and applied to Decision Engine.', 'success');
  };

  const resetSettings = () => {
    setSettings(DEFAULT_ENGINEERING_SETTINGS);
    showToast('Settings Reset', 'Configuration restored to default engineering baseline.', 'info');
  };

  const runFailureTest = async (testId: string): Promise<{ passed: boolean; details: string }> => {
    showToast('Running Failure Test', `Executing engineering simulation: ${testId}...`, 'info');
    await new Promise((res) => setTimeout(res, 2000));

    if (testId === 'test-false-positive') {
      generateParcel('NORMAL');
      return {
        passed: true,
        details: 'PASS: Glossy bubble wrap reflection filtered correctly. AI confidence remained below threshold (38.2%). Decision: PASS.'
      };
    } else if (testId === 'test-ai-confusion') {
      generateParcel('TEAR');
      return {
        passed: true,
        details: 'PASS: Machine vision successfully discriminated physical seam tear from printed barcode graphics (Confidence: 96.8%). Decision: REJECT.'
      };
    } else if (testId === 'test-hardware-limit') {
      generateParcel('WEIGHT_ANOMALY');
      return {
        passed: true,
        details: 'PASS: Consecutive parcel overlap detected. IR sensor timeout triggered. Yellow Tower Light activated and conveyor paused safely.'
      };
    } else if (testId === 'test-offline-resiliency') {
      setIsOfflineMode(true);
      generateParcel('DENT');
      return {
        passed: true,
        details: 'PASS: WAN link severed. Edge AI & Pneumatic Actuator continued autonomous operation. Record queued in local SQLite storage.'
      };
    }

    return { passed: true, details: 'Test completed successfully.' };
  };

  return (
    <SimulationContext.Provider
      value={{
        parcels,
        latestParcel,
        systemStatus,
        timelineEvents,
        anomalies,
        settings,
        demoModeActive,
        demoSpeed,
        isOfflineMode,
        pendingSyncCount,
        dataSourceMode,
        connectionHealth,
        toast,
        toggleDemoMode,
        setDemoSpeed,
        toggleOfflineMode,
        syncOfflineQueue,
        setDataSourceMode,
        generateParcel,
        updateSettings,
        resetSettings,
        runFailureTest,
        showToast
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
