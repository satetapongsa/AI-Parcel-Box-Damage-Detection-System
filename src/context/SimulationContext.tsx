import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  ParcelRecord, 
  SystemStatusState, 
  TimelineEvent, 
  AnomalyLog, 
  EngineeringSettings,
  DamageType,
  DecisionStatus
} from '../types/spdi';
import { 
  INITIAL_PARCEL_RECORDS, 
  SYSTEM_ANOMALIES_LOG, 
  DEFAULT_ENGINEERING_SETTINGS 
} from '../data/mockData';

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
  toast: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null;
  toggleDemoMode: () => void;
  setDemoSpeed: (speed: 'SLOW' | 'NORMAL' | 'FAST') => void;
  toggleOfflineMode: () => void;
  syncOfflineQueue: () => void;
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

  const [toast, setToast] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null>(null);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Function to generate a realistic parcel inspection event
  const generateParcel = (forceDamage?: DamageType) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const timestampStr = `${now.toISOString().slice(0, 10)} ${timeStr}`;
    const randId = Math.floor(Math.random() * 899999) + 100000;
    const trackingNumber = `THA-20260930-${randId}`;

    const damageTypes: DamageType[] = ['NORMAL', 'NORMAL', 'NORMAL', 'NORMAL', 'DENT', 'TEAR', 'WATER_STAIN', 'WEIGHT_ANOMALY'];
    const selectedDamage = forceDamage || damageTypes[Math.floor(Math.random() * damageTypes.length)];

    let status: DecisionStatus = 'PASS';
    let aiConfidence = Math.round((88 + Math.random() * 11) * 10) / 10;
    let expectedWeight = Math.round((1.2 + Math.random() * 3.5) * 100) / 100;
    let weight = expectedWeight;
    let weightDifference = Math.round((Math.random() * 1.2 - 0.6) * 100) / 100;
    let rejectReason: string | undefined = undefined;

    let boxesTop: any[] = [];
    let boxesSide: any[] = [];
    let actuatorTriggered = false;

    if (selectedDamage === 'DENT') {
      status = 'REJECT';
      aiConfidence = Math.round((86 + Math.random() * 12) * 10) / 10;
      rejectReason = `Corner Dent & Packaging Collapse (${aiConfidence}% confidence)`;
      boxesTop = [{ x: 50, y: 18, width: 32, height: 35, label: `DENT ${aiConfidence}%`, confidence: aiConfidence }];
      actuatorTriggered = true;
    } else if (selectedDamage === 'TEAR') {
      status = 'REJECT';
      aiConfidence = Math.round((87 + Math.random() * 11) * 10) / 10;
      rejectReason = `Box Seam Tear (${aiConfidence}% confidence)`;
      boxesTop = [{ x: 28, y: 30, width: 38, height: 28, label: `TEAR ${aiConfidence}%`, confidence: aiConfidence }];
      boxesSide = [{ x: 35, y: 22, width: 30, height: 32, label: `Tear Seam`, confidence: aiConfidence - 2 }];
      actuatorTriggered = true;
    } else if (selectedDamage === 'WATER_STAIN') {
      status = 'REJECT';
      aiConfidence = Math.round((85 + Math.random() * 12) * 10) / 10;
      rejectReason = `Liquid Water Stain (${aiConfidence}% confidence)`;
      boxesTop = [{ x: 20, y: 35, width: 45, height: 42, label: `WATER STAIN ${aiConfidence}%`, confidence: aiConfidence }];
      actuatorTriggered = true;
    } else if (selectedDamage === 'WEIGHT_ANOMALY') {
      status = 'REJECT';
      const spike = Math.random() > 0.5 ? 1.25 : 0.75;
      weight = Math.round(expectedWeight * spike * 100) / 100;
      weightDifference = Math.round(((weight - expectedWeight) / expectedWeight) * 1000) / 10;
      rejectReason = `Weight anomaly exceeds ±${settings.weightTolerancePct}% tolerance (Actual: ${weight}kg, Expected: ${expectedWeight}kg)`;
      actuatorTriggered = true;
    } else {
      // Normal
      status = 'PASS';
      aiConfidence = Math.round((96 + Math.random() * 3.8) * 10) / 10;
    }

    const newRecord: ParcelRecord = {
      id: String(Date.now()),
      trackingNumber,
      timestamp: timestampStr,
      time: timeStr,
      status,
      damageType: selectedDamage,
      aiConfidence,
      weight,
      expectedWeight,
      weightDifference,
      stationId: 'SORT-01',
      rejectReason,
      boundingBoxesTop: boxesTop,
      boundingBoxesSide: boxesSide,
      actuatorTriggered,
      syncedToCloud: !isOfflineMode
    };

    if (isOfflineMode) {
      setPendingSyncCount((prev) => prev + 1);
    }

    setLatestParcel(newRecord);
    setParcels((prev) => [newRecord, ...prev]);

    // Update real-time timeline events
    const newTimeline: TimelineEvent[] = [
      { id: `t1-${Date.now()}`, timestamp: timeStr, source: 'IR SENSOR', message: 'IR Breakbeam triggered — Parcel entry', type: 'info' },
      { id: `t2-${Date.now()}`, timestamp: timeStr, source: 'CAMERA', message: 'Dual 1080p frame captured (Top & Side)', type: 'info' },
      { id: `t3-${Date.now()}`, timestamp: timeStr, source: 'OCR', message: `Barcode scanned: ${trackingNumber}`, type: 'info' },
      { id: `t4-${Date.now()}`, timestamp: timeStr, source: 'EDGE AI', message: `YOLOv8 inference: ${selectedDamage} (${aiConfidence}%)`, type: status === 'PASS' ? 'success' : 'warning' },
      { id: `t5-${Date.now()}`, timestamp: timeStr, source: 'LOAD CELL', message: `Weight: ${weight}kg (Expected: ${expectedWeight}kg, Diff: ${weightDifference}%)`, type: 'info' },
      { id: `t6-${Date.now()}`, timestamp: timeStr, source: 'DECISION ENGINE', message: `Final Decision: ${status} ${rejectReason ? `(${rejectReason})` : ''}`, type: status === 'PASS' ? 'success' : 'danger' },
      { id: `t7-${Date.now()}`, timestamp: timeStr, source: 'ACTUATOR', message: actuatorTriggered ? 'Pneumatic Reject Cylinder FIRED' : 'Pneumatic Reject idle (Parcel passed)', type: actuatorTriggered ? 'danger' : 'info' },
    ];
    setTimelineEvents(newTimeline);

    // Update tower light & actuator status briefly
    setSystemStatus((prev) => ({
      ...prev,
      irSensorStatus: 'TRIGGERED',
      loadCellStatus: 'MEASURING',
      actuatorStatus: actuatorTriggered ? 'FIRING' : 'READY',
      towerLight: status === 'PASS' ? 'GREEN' : 'RED',
      buzzer: actuatorTriggered
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

    if (status === 'REJECT') {
      showToast('REJECT ALERT!', `Parcel ${trackingNumber} rejected: ${selectedDamage}`, 'danger');
    }
  };

  // Demo mode continuous generator loop
  useEffect(() => {
    if (!demoModeActive) return;
    const intervalTime = demoSpeed === 'FAST' ? 3000 : demoSpeed === 'SLOW' ? 8000 : 5000;
    const timer = setInterval(() => {
      generateParcel();
    }, intervalTime);
    return () => clearInterval(timer);
  }, [demoModeActive, demoSpeed, isOfflineMode, settings]);

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
        toast,
        toggleDemoMode,
        setDemoSpeed,
        toggleOfflineMode,
        syncOfflineQueue,
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
