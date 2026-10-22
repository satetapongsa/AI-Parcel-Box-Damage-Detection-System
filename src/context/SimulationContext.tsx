import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { 
  ParcelRecord, 
  SystemStatusState, 
  TimelineEvent, 
  AnomalyLog, 
  EngineeringSettings,
  DamageType,
  NotificationItem
} from '../types';
import { 
  INITIAL_PARCEL_RECORDS, 
  SYSTEM_ANOMALIES_LOG, 
  DEFAULT_ENGINEERING_SETTINGS 
} from '../data/mockData';
import { SimulationEngine, type SimSpeed } from '../lib/sim/engine';
import type { FaultState } from '../lib/sim/faults';
import type { CiraState } from '../lib/sim/ciraPanel';
import type { UartLogEntry } from '../lib/sim/uartConsole';
import type { TestSuiteSummary } from '../lib/sim/testSuite';
import { saveInspectionToNeon, fetchRecentInspectionsFromNeon, type DbParcelInspection } from '../lib/database/neonClient';

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
  aiInferenceMs: 35,
  missedRejectCount: 0
};

interface SimulationContextType {
  engine: SimulationEngine;
  parcels: ParcelRecord[];
  rejectQueue: ParcelRecord[];
  latestParcel: ParcelRecord;
  systemStatus: SystemStatusState;
  timelineEvents: TimelineEvent[];
  anomalies: AnomalyLog[];
  settings: EngineeringSettings;
  demoModeActive: boolean;
  demoSpeed: SimSpeed;
  isOfflineMode: boolean;
  pendingSyncCount: number;
  ciraState: CiraState;
  uartLogs: UartLogEntry[];
  faults: FaultState;
  testSuiteResult: TestSuiteSummary | null;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  dbRecords: DbParcelInspection[];
  isLoadingDb: boolean;
  toast: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null;
  toggleDemoMode: () => void;
  setDemoSpeed: (speed: SimSpeed) => void;
  toggleOfflineMode: () => void;
  syncOfflineQueue: () => Promise<void>;
  generateParcel: (forceDamage?: DamageType, isFalsePositiveCase?: boolean) => void;
  updateSettings: (newSettings: Partial<EngineeringSettings>) => void;
  resetSettings: () => void;
  setFault: <K extends keyof FaultState>(key: K, value: FaultState[K]) => void;
  setCiraTab: (tab: 'Payload' | 'Output' | 'Image') => void;
  sendUartCmd: (cmd: '1' | '2' | '3') => void;
  markRejectHandled: (id: string, reason: string) => void;
  runTestSuite: () => Promise<TestSuiteSummary>;
  showToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;
  refreshDbRecords: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine(DEFAULT_ENGINEERING_SETTINGS, initialStatus);
  }
  const engine = engineRef.current;

  const [parcels, setParcels] = useState<ParcelRecord[]>(INITIAL_PARCEL_RECORDS);
  const [latestParcel, setLatestParcel] = useState<ParcelRecord>(INITIAL_PARCEL_RECORDS[0]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>(initialStatus);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { id: 't1', timestamp: '08:42:11', source: 'IR SENSOR', message: 'IR Breakbeam beam interrupted — Parcel detected', type: 'info' },
    { id: 't2', timestamp: '08:42:12', source: 'CAMERA', message: 'Dual 1080p frame captured (Top & Side View)', type: 'info' },
    { id: 't3', timestamp: '08:42:12', source: 'OCR', message: 'Barcode decoded: THA-20260930-001248', type: 'info' },
    { id: 't4', timestamp: '08:42:13', source: 'EDGE AI', message: 'CiRA CORE damage inference complete (Normal condition)', type: 'success' },
    { id: 't5', timestamp: '08:42:13', source: 'LOAD CELL', message: 'Weight verified: 2.41 kg (Expected: 2.40 kg, Diff: +0.4%)', type: 'info' },
    { id: 't6', timestamp: '08:42:13', source: 'DECISION ENGINE', message: 'Final Decision: PASS -> Conveyor dispatch clear', type: 'success' },
    { id: 't7', timestamp: '08:42:14', source: 'ACTUATOR', message: 'Pneumatic reject cylinder idle', type: 'info' },
  ]);
  const [anomalies] = useState<AnomalyLog[]>(SYSTEM_ANOMALIES_LOG);
  const [settings, setSettings] = useState<EngineeringSettings>(DEFAULT_ENGINEERING_SETTINGS);

  const [demoModeActive, setDemoModeActive] = useState<boolean>(true);
  const [demoSpeed, setDemoSpeedState] = useState<SimSpeed>(1);
  const [ciraState, setCiraState] = useState<CiraState>(engine.getCiraState());
  const [uartLogs, setUartLogs] = useState<UartLogEntry[]>(engine.getUartLogs());
  const [faults, setFaultsState] = useState<FaultState>(engine.getFaults());
  const [testSuiteResult, setTestSuiteResult] = useState<TestSuiteSummary | null>(null);

  // Notifications state for bell icon
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      timestamp: '08:41:05',
      title: 'Defect Diverted: THA-20260930-001247',
      message: 'Detected surface tear (96.8% confidence). Diverted to quarantine bin.',
      type: 'danger',
      read: false
    },
    {
      id: 'n2',
      timestamp: '08:39:50',
      title: 'Structural Dent: THA-20260930-001246',
      message: 'Detected severe dent (94.7% confidence) on package corner.',
      type: 'danger',
      read: false
    }
  ]);

  // Neon DB state
  const [dbRecords, setDbRecords] = useState<DbParcelInspection[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const [toast] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' } | null>(null);

  const showToast = useCallback((_title: string, _message: string, _type: 'info' | 'success' | 'warning' | 'danger') => {
    // Suppress screen-corner popup according to user requirement
  }, []);

  const refreshDbRecords = useCallback(async () => {
    setIsLoadingDb(true);
    const records = await fetchRecentInspectionsFromNeon(100);
    setDbRecords(records);
    setIsLoadingDb(false);
  }, []);

  // Fetch Neon records on mount
  useEffect(() => {
    refreshDbRecords();
  }, [refreshDbRecords]);

  // Subscribe to engine callbacks
  useEffect(() => {
    const unsubscribe = engine.addListener({
      onStatusChange: (status) => setSystemStatus(status),
      onParcelProcessed: (newParcel) => {
        setLatestParcel(newParcel);
        setParcels((prev) => [newParcel, ...prev].slice(0, 500));

        // If REJECT, save to notifications queue for bell icon
        if (newParcel.status === 'REJECT') {
          const newNotif: NotificationItem = {
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: newParcel.time,
            title: `Defect Diverted: ${newParcel.trackingNumber}`,
            message: newParcel.rejectReason || `${newParcel.damageType} detected (${newParcel.aiConfidence}%)`,
            type: 'danger',
            read: false,
            parcelId: newParcel.id
          };
          setNotifications((prev) => [newNotif, ...prev].slice(0, 100));
        }

        // Save every parcel inspection into Neon Database
        saveInspectionToNeon({
          tracking_no: newParcel.trackingNumber,
          station_id: newParcel.stationId,
          status: newParcel.status,
          damage_type: newParcel.damageType,
          confidence: newParcel.aiConfidence,
          weight_kg: newParcel.weight,
          expected_weight_kg: newParcel.expectedWeight,
          reject_reason: newParcel.rejectReason
        }).then(() => {
          refreshDbRecords();
        });
      },
      onTimelineEvent: (event) => {
        setTimelineEvents((prev) => [event, ...prev].slice(0, 500));
      },
      onCiraChange: (cira) => setCiraState(cira),
      onUartLog: () => setUartLogs(engine.getUartLogs())
    });

    // Start running simulation
    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine, refreshDbRecords]);

  const toggleDemoMode = () => {
    if (demoModeActive) {
      engine.stop();
      setDemoModeActive(false);
    } else {
      engine.start();
      setDemoModeActive(true);
    }
  };

  const setDemoSpeed = (speed: SimSpeed) => {
    setDemoSpeedState(speed);
    engine.setSpeed(speed);
  };

  const setFault = <K extends keyof FaultState>(key: K, value: FaultState[K]) => {
    engine.setFault(key, value);
    setFaultsState(engine.getFaults());
    setSystemStatus(engine.getStatus());
  };

  const toggleOfflineMode = () => {
    const nextOffline = !faults.wanDisconnected;
    setFault('wanDisconnected', nextOffline);
  };

  const syncOfflineQueue = async () => {
    const count = engine.bridgeQueue.size();
    if (count === 0) return;
    await engine.flushBridgeQueue();
    setParcels((prev) => prev.map((p) => ({ ...p, syncedToCloud: true })));
  };

  const generateParcel = (forceDamage?: DamageType, isFalsePositiveCase = false) => {
    engine.triggerSingleParcel(forceDamage, isFalsePositiveCase);
  };

  const updateSettings = (newSettings: Partial<EngineeringSettings>) => {
    engine.updateSettings(newSettings);
    setSettings(engine.getSettings());
  };

  const resetSettings = () => {
    engine.updateSettings(DEFAULT_ENGINEERING_SETTINGS);
    setSettings(DEFAULT_ENGINEERING_SETTINGS);
  };

  const setCiraTab = (tab: 'Payload' | 'Output' | 'Image') => {
    engine.setCiraTab(tab);
    setCiraState(engine.getCiraState());
  };

  const sendUartCmd = (cmd: '1' | '2' | '3') => {
    engine.sendUartCommand(cmd);
    setUartLogs(engine.getUartLogs());
  };

  const markRejectHandled = (id: string, reason: string) => {
    const target = parcels.find((p) => p.id === id);
    engine.localStore.markHandled(id, reason);
    setParcels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, handled: true, handledReason: reason } : p))
    );

    // Persist resolution in Neon DB while retaining full historical row
    if (target) {
      import('../lib/database/neonClient').then(({ updateInspectionHandledInNeon }) => {
        updateInspectionHandledInNeon(target.trackingNumber, reason).then(() => {
          refreshDbRecords();
        });
      });
    }
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const runTestSuite = async (): Promise<TestSuiteSummary> => {
    const startTime = Date.now();
    const results = [];

    // Test 1: Vision Fault / Dark image
    engine.setFault('visionFaultDark', true);
    const pVision = engine.processNextParcel('NORMAL');
    engine.setFault('visionFaultDark', false);
    results.push({
      name: 'Vision Fault / Brightness Check',
      category: 'Vision Fault',
      status: (pVision.aiConfidence < 60 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      metric: `Confidence degraded to ${pVision.aiConfidence}% (< 60%)`,
      threshold: 'Lux < 120 triggers warning & confidence penalty',
      details: 'Evaluates camera frame underexposure fail-safe.',
      timestamp: new Date().toTimeString().slice(0, 8)
    });

    // Test 2: Belt Jam / IR Timeout
    engine.setFault('beltJam', true);
    const jamStatus = engine.getStatus();
    engine.setFault('beltJam', false);
    results.push({
      name: 'Belt Jam / IR Timeout Safe-Halt',
      category: 'Conveyor Jam',
      status: (jamStatus.conveyorStatus === 'JAMMED' && jamStatus.towerLight === 'RED' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      metric: `Belt: ${jamStatus.conveyorStatus}, Tower Light: ${jamStatus.towerLight}`,
      threshold: 'IR blocked > 3.0s halts belt & activates Red Light',
      details: 'Safety interlock test when sensor beam is blocked continuously.',
      timestamp: new Date().toTimeString().slice(0, 8)
    });

    // Test 3: False Positive (Case 1)
    const pPattern = engine.processNextParcel('NORMAL', true);
    results.push({
      name: 'False Positive Discrimination (Case 1)',
      category: 'AI False Positive',
      status: (pPattern.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      metric: `Decision: ${pPattern.status} (${pPattern.aiConfidence}%)`,
      threshold: 'High-contrast print pattern must NOT trigger false reject',
      details: 'Verifies box graphic pattern is separated from structural tear.',
      timestamp: new Date().toTimeString().slice(0, 8)
    });

    // Test 4: Offline Fail-Safe (Case 2)
    engine.setFault('wanDisconnected', true);
    const pOffline = engine.processNextParcel('DENT');
    const queueSize = engine.bridgeQueue.size();
    engine.setFault('wanDisconnected', false);
    await engine.flushBridgeQueue();
    results.push({
      name: 'Offline Fail-Safe & Store-and-Forward (Case 2)',
      category: 'Store-and-Forward',
      status: (pOffline.actuatorTriggered && queueSize > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      metric: `Actuator: ${pOffline.actuatorTriggered ? 'FIRED' : 'IDLE'}, Queued: ${queueSize}`,
      threshold: 'Edge physical reject works offline 100%, records queue in SQLite',
      details: 'Tests LAN cable disconnect resiliency without losing reject actuation.',
      timestamp: new Date().toTimeString().slice(0, 8)
    });

    // Test 5: Actuator Timing & Tuning (Case 3)
    const origDist = engine.getSettings().actuatorDistanceInstalledM;
    engine.updateSettings({ actuatorDistanceInstalledM: 0.10 });
    const missedBefore = engine.getStatus().missedRejectCount || 0;
    engine.processNextParcel('DENT');
    const missedAfter = engine.getStatus().missedRejectCount || 0;
    engine.updateSettings({ actuatorDistanceInstalledM: origDist });
    results.push({
      name: 'Delay Time Tuning & Missed Reject Alert (Case 3)',
      category: 'Timing Calibration',
      status: (missedAfter > missedBefore ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      metric: `Detected MISSED_REJECT: ${missedAfter - missedBefore > 0 ? 'YES' : 'NO'}`,
      threshold: 'Installed distance < Required (0.285m) flags MISSED_REJECT',
      details: 'Tests timing formula against conveyor speed and actuator stroke delay.',
      timestamp: new Date().toTimeString().slice(0, 8)
    });

    const passedTests = results.filter((r) => r.status === 'PASS').length;
    const summary: TestSuiteSummary = {
      totalTests: results.length,
      passedTests,
      failedTests: results.length - passedTests,
      passRate: Number(((passedTests / results.length) * 100).toFixed(1)),
      executionTimeSec: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      results
    };

    setTestSuiteResult(summary);
    return summary;
  };

  const rejectQueue = parcels.filter((p) => p.status === 'REJECT' && !p.handled);
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <SimulationContext.Provider
      value={{
        engine,
        parcels,
        rejectQueue,
        latestParcel,
        systemStatus,
        timelineEvents,
        anomalies,
        settings,
        demoModeActive,
        demoSpeed,
        isOfflineMode: faults.wanDisconnected,
        pendingSyncCount: engine.bridgeQueue.size(),
        ciraState,
        uartLogs,
        faults,
        testSuiteResult,
        notifications,
        unreadNotificationCount,
        dbRecords,
        isLoadingDb,
        toast,
        toggleDemoMode,
        setDemoSpeed,
        toggleOfflineMode,
        syncOfflineQueue,
        generateParcel,
        updateSettings,
        resetSettings,
        setFault,
        setCiraTab,
        sendUartCmd,
        markRejectHandled,
        runTestSuite,
        showToast,
        markNotificationsAsRead,
        clearNotifications,
        refreshDbRecords
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
