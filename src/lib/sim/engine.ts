import type {
  ParcelRecord,
  SystemStatusState,
  TimelineEvent,
  EngineeringSettings,
  DamageType
} from '../../types';
import { BridgeQueue } from './bridgeQueue';
import { SeededRandom, generateParcelSpec } from './scenarios';
import { evaluateInspectionDecision, checkActuatorTiming, getTowerLightState } from './rules';
import { SimulatedCloudSink, SimulatedEdgeController, SimulatedLocalStore } from '../adapters/simulated';
import { parcelRecordToBridgePayload } from '../adapters/mappers';
import type { FaultState } from './faults';
import { INITIAL_FAULTS } from './faults';
import type { CiraState } from './ciraPanel';
import { INITIAL_CIRA_STATE } from './ciraPanel';
import type { UartLogEntry } from './uartConsole';
import { INITIAL_UART_LOGS } from './uartConsole';

export type SimSpeed = 0.5 | 1 | 2 | 4;

export interface EngineListener {
  onStatusChange: (status: SystemStatusState) => void;
  onParcelProcessed: (parcel: ParcelRecord) => void;
  onTimelineEvent: (event: TimelineEvent) => void;
  onCiraChange: (cira: CiraState) => void;
  onUartLog: (log: UartLogEntry) => void;
  onQueueChange: (count: number) => void;
}

export class SimulationEngine {
  private isRunning = false;
  private speed: SimSpeed = 1;
  private intervalId: number | null = null;
  private rng: SeededRandom;
  private settings: EngineeringSettings;
  private faults: FaultState = { ...INITIAL_FAULTS };

  // Adapters
  public readonly cloudSink: SimulatedCloudSink;
  public readonly edgeController: SimulatedEdgeController;
  public readonly localStore: SimulatedLocalStore;
  public readonly bridgeQueue: BridgeQueue;

  // Internal states
  private systemStatus: SystemStatusState;
  private ciraState: CiraState = { ...INITIAL_CIRA_STATE };
  private uartLogs: UartLogEntry[] = [...INITIAL_UART_LOGS];
  private missedRejectCount = 0;
  private listeners: Partial<EngineListener>[] = [];

  constructor(
    initialSettings: EngineeringSettings,
    initialStatus: SystemStatusState,
    seed = 42
  ) {
    this.settings = { ...initialSettings };
    this.systemStatus = { ...initialStatus };
    this.rng = new SeededRandom(seed);
    this.cloudSink = new SimulatedCloudSink();
    this.edgeController = new SimulatedEdgeController();
    this.localStore = new SimulatedLocalStore();
    this.bridgeQueue = new BridgeQueue(this.settings.offlineQueueLimit || 500);

    this.edgeController.onLog((msg) => {
      this.addUartLog('RX', msg);
    });
  }

  public addListener(listener: Partial<EngineListener>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getSettings(): EngineeringSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<EngineeringSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.offlineQueueLimit) {
      this.bridgeQueue.setLimit(newSettings.offlineQueueLimit);
    }
  }

  public getFaults(): FaultState {
    return { ...this.faults };
  }

  public setFault<K extends keyof FaultState>(key: K, value: FaultState[K]): void {
    this.faults[key] = value;
    if (key === 'wanDisconnected') {
      this.cloudSink.isConnected = !value;
      this.updateStatus({
        isOfflineMode: Boolean(value),
        internetStatus: value ? 'OFFLINE' : 'ONLINE',
        mqttStatus: value ? 'OFFLINE' : 'ONLINE',
        cloudSyncStatus: value ? 'OFFLINE' : 'ONLINE'
      });
      // Try syncing when WAN reconnected
      if (!value) {
        this.flushBridgeQueue();
      }
    } else if (key === 'cloudResponseFault') {
      this.cloudSink.faultMode = value as any;
    } else if (key === 'beltJam') {
      this.updateStatus({
        conveyorStatus: value ? 'JAMMED' : 'ACTIVE',
        irSensorStatus: value ? 'FAULT' : 'READY',
        towerLight: value ? 'RED' : 'GREEN',
        buzzer: Boolean(value)
      });
      if (value) {
        this.addTimeline('IR SENSOR', 'Belt Jam detected: IR beam interrupted > timeout', 'danger');
      }
    }
  }

  public getStatus(): SystemStatusState {
    return { ...this.systemStatus, missedRejectCount: this.missedRejectCount };
  }

  public getCiraState(): CiraState {
    return { ...this.ciraState };
  }

  public setCiraTab(tab: 'Payload' | 'Output' | 'Image'): void {
    this.ciraState = { ...this.ciraState, activeTab: tab };
    this.notifyCira();
  }

  public getUartLogs(): UartLogEntry[] {
    return [...this.uartLogs];
  }

  public setSpeed(speed: SimSpeed): void {
    this.speed = speed;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  public getSpeed(): SimSpeed {
    return this.speed;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    const intervalMs = Math.max(1000, Math.floor(4000 / this.speed));
    this.intervalId = window.setInterval(() => {
      if (!this.faults.beltJam) {
        this.processNextParcel();
      }
    }, intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public triggerSingleParcel(forcedType?: DamageType, isFalsePositiveCase = false): ParcelRecord {
    return this.processNextParcel(forcedType, isFalsePositiveCase);
  }

  /**
   * Complete 10-step sequence according to spec Section 6.1
   */
  public processNextParcel(forcedType?: DamageType, isFalsePositiveCase = false): ParcelRecord {
    const timestampStr = new Date().toTimeString().slice(0, 8);
    const isoTimestamp = new Date().toISOString();

    // 1. IR_TRIGGER
    this.addTimeline('IR SENSOR', 'IR Breakbeam beam interrupted — Parcel detected', 'info');

    // 2. CAPTURE & Brightness check
    const spec = generateParcelSpec(this.rng, forcedType, isFalsePositiveCase);
    let cameraFault = false;
    if (this.faults.visionFaultDark) {
      spec.brightness = 40; // Too dark
      cameraFault = true;
      this.addTimeline('CAMERA', `Vision Fault: Average brightness (${spec.brightness}) below minimum (${this.settings.minBrightness})`, 'warning');
      this.updateStatus({ cameraTopStatus: 'WARNING', towerLight: 'YELLOW' });
    } else {
      this.addTimeline('CAMERA', `Dual 1080p frame captured (Top & Side View) [Lux: ${spec.brightness}]`, 'info');
    }

    // 3. BARCODE
    let barcode = spec.trackingNumber;
    if (this.faults.barcodeScanFail) {
      barcode = `UNKNOWN-${Math.floor(1000 + Math.random() * 9000)}`;
      this.addTimeline('OCR', `Barcode scan unreadable, fallback tag: ${barcode}`, 'warning');
    } else {
      this.addTimeline('OCR', `Barcode decoded: ${barcode}`, 'info');
    }

    // 4. EDGE_AI (CiRA CORE)
    let evaluatedConfidence = spec.aiConfidence;
    if (cameraFault) {
      evaluatedConfidence = Math.max(20, evaluatedConfidence - 40);
    }
    if (this.faults.dropSideCamera) {
      evaluatedConfidence = Math.max(30, evaluatedConfidence - 20);
      this.addTimeline('CAMERA', 'Side camera feed dropped: inspection confidence degraded', 'warning');
    }
    if (isFalsePositiveCase && this.faults.weakAiModel) {
      // Weak AI model confuses texture for tear
      spec.damageType = 'TEAR';
      evaluatedConfidence = 88.5;
      spec.labelTag = `box_tear-999 89%`;
    }

    this.ciraState = {
      ...this.ciraState,
      latestPayloadText: JSON.stringify({ device: 'cira-edge-01', trigger: 'IR_HW_INTERRUPT', barcode }, null, 2),
      latestOutputText: JSON.stringify({ class: spec.damageType, confidence: evaluatedConfidence, label: spec.labelTag }, null, 2),
      latestLabelTag: spec.labelTag,
      pipelineRunning: false
    };
    this.notifyCira();
    this.addTimeline('EDGE AI', `CiRA CORE inference: [${spec.labelTag}] (${this.settings.aiInferenceSec}s)`, evaluatedConfidence >= this.settings.aiConfidenceThreshold && spec.damageType !== 'NORMAL' ? 'warning' : 'success');

    // 5. WEIGHT
    const diffPercent = Number((((spec.weightKg - spec.expectedWeightKg) / spec.expectedWeightKg) * 100).toFixed(1));
    this.addTimeline('LOAD CELL', `Weight: ${spec.weightKg} kg (Expected: ${spec.expectedWeightKg} kg, Diff: ${diffPercent > 0 ? '+' : ''}${diffPercent}%)`, Math.abs(diffPercent) > this.settings.weightTolerancePct ? 'warning' : 'info');

    // 6. DECISION
    const decision = evaluateInspectionDecision(
      spec.damageType,
      evaluatedConfidence,
      diffPercent,
      this.settings
    );
    const isReject = decision.status === 'REJECT';
    this.addTimeline('DECISION ENGINE', `Final Decision: ${decision.status} (${decision.reason})`, isReject ? 'danger' : 'success');

    // 7. UART_TX & Actuator Timing check (Case 3 Delay Tuning)
    const timing = checkActuatorTiming(
      this.settings.conveyorSpeedMs,
      this.settings.aiInferenceSec,
      this.settings.actuatorDelayMs,
      this.settings.actuatorDistanceInstalledM
    );

    let isMissed = false;
    if (isReject && !timing.isTimingSufficient) {
      isMissed = true;
      this.missedRejectCount += 1;
      this.addTimeline('ACTUATOR', `MISSED_REJECT: Installed distance (${this.settings.actuatorDistanceInstalledM}m) < Required (${timing.requiredDistanceM}m). Parcel passed actuator!`, 'danger');
    }

    if (this.faults.actuatorFault && isReject) {
      this.addTimeline('ACTUATOR', 'ACTUATOR_FAULT: Cylinder solenoid unresponsive! Manual handling required', 'danger');
    } else {
      const uartCmd = isReject ? '3' : '1';
      this.addUartLog('TX', `Sent: ${uartCmd}`);
      this.edgeController.send(uartCmd);
    }

    // 8. ACTUATOR & Tower Light
    const towerLightState = getTowerLightState(
      decision.status,
      this.faults.wanDisconnected,
      this.faults.visionFaultDark || this.faults.beltJam || this.faults.actuatorFault,
      isReject && !isMissed
    );

    this.updateStatus({
      towerLight: towerLightState.color,
      buzzer: towerLightState.buzzer,
      actuatorStatus: isReject && !this.faults.actuatorFault ? 'FIRING' : 'READY',
      irSensorStatus: 'TRIGGERED'
    });

    setTimeout(() => {
      this.updateStatus({
        towerLight: this.faults.wanDisconnected ? 'YELLOW' : 'GREEN',
        buzzer: false,
        actuatorStatus: 'READY',
        irSensorStatus: 'READY'
      });
    }, 1200);

    // 9. LOCAL_SAVE (Virtual Local SQLite - always saved)
    let boxesTop: any[] = [];
    let boxesSide: any[] = [];
    if (spec.damageType === 'DENT') {
      boxesTop = [{ x: 45, y: 25, width: 30, height: 30, label: spec.labelTag, confidence: evaluatedConfidence }];
    } else if (spec.damageType === 'TEAR') {
      boxesTop = [{ x: 30, y: 35, width: 40, height: 25, label: spec.labelTag, confidence: evaluatedConfidence }];
      boxesSide = [{ x: 35, y: 20, width: 30, height: 35, label: 'Tear Seam', confidence: evaluatedConfidence - 2 }];
    } else if (spec.damageType === 'WATER_STAIN') {
      boxesTop = [{ x: 25, y: 30, width: 45, height: 40, label: spec.labelTag, confidence: evaluatedConfidence }];
    }

    const record: ParcelRecord = {
      id: String(Date.now()),
      trackingNumber: barcode,
      timestamp: isoTimestamp,
      time: timestampStr,
      status: decision.status,
      damageType: spec.damageType,
      aiConfidence: evaluatedConfidence,
      weight: spec.weightKg,
      expectedWeight: spec.expectedWeightKg,
      weightDifference: diffPercent,
      stationId: 'SORT-01',
      rejectReason: isReject ? decision.reason : undefined,
      boundingBoxesTop: boxesTop,
      boundingBoxesSide: boxesSide,
      actuatorTriggered: isReject && !isMissed && !this.faults.actuatorFault,
      syncedToCloud: false
    };

    this.localStore.save(record);
    this.addTimeline('LOCAL DB', `Saved to Local SQLite (${barcode})`, 'info');

    // 10. CLOUD_SYNC (Store-and-Forward)
    const payload = parcelRecordToBridgePayload(record);
    this.cloudSink.send(payload).then((res) => {
      if (res.status === 201) {
        record.syncedToCloud = true;
        this.addTimeline('CLOUD', `Cloud sync OK: 201 Created (${barcode})`, 'success');
      } else {
        // Enqueue to bridge queue
        this.bridgeQueue.enqueue(payload);
        this.notifyQueueChange();
        this.addTimeline('LOCAL DB', `Sync failed (${res.status || 'Offline'}). Queued for Store-and-Forward (Pending: ${this.bridgeQueue.size()})`, 'warning');
      }
      this.notifyParcel(record);
    });

    return record;
  }

  public async flushBridgeQueue(): Promise<void> {
    const items = this.bridgeQueue.getItems();
    if (items.length === 0) return;

    for (const item of items) {
      const res = await this.cloudSink.send(item.payload);
      const action = this.bridgeQueue.handleResponse(item.id, res.status);
      if (action === 'REMOVE' && res.status === 201) {
        this.addTimeline('CLOUD', `Store-and-Forward synced: ${item.payload.tracking_no}`, 'success');
      } else if (action === 'REMOVE') {
        this.addTimeline('CLOUD', `Discarded malformed record (${res.status}): ${item.payload.tracking_no}`, 'danger');
      } else {
        this.addTimeline('CLOUD', `Sync retry kept in queue (${res.status}): ${item.payload.tracking_no}`, 'warning');
      }
    }
    this.notifyQueueChange();
  }

  public sendUartCommand(cmd: '1' | '2' | '3'): void {
    this.addUartLog('TX', `Sent: ${cmd}`);
    this.edgeController.send(cmd);
  }

  private addUartLog(direction: 'TX' | 'RX', message: string): void {
    const entry: UartLogEntry = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      time: new Date().toTimeString().slice(0, 8),
      direction,
      message
    };
    this.uartLogs = [entry, ...this.uartLogs].slice(0, 50);
    this.listeners.forEach((l) => l.onUartLog?.(entry));
  }

  private addTimeline(source: TimelineEvent['source'], message: string, type: TimelineEvent['type']): void {
    const evt: TimelineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toTimeString().slice(0, 8),
      source,
      message,
      type
    };
    this.listeners.forEach((l) => l.onTimelineEvent?.(evt));
  }

  private updateStatus(patch: Partial<SystemStatusState>): void {
    this.systemStatus = { ...this.systemStatus, ...patch, pendingSyncCount: this.bridgeQueue.size() };
    this.listeners.forEach((l) => l.onStatusChange?.(this.getStatus()));
  }

  private notifyParcel(parcel: ParcelRecord): void {
    this.listeners.forEach((l) => l.onParcelProcessed?.(parcel));
  }

  private notifyCira(): void {
    this.listeners.forEach((l) => l.onCiraChange?.({ ...this.ciraState }));
  }

  private notifyQueueChange(): void {
    const count = this.bridgeQueue.size();
    this.systemStatus.pendingSyncCount = count;
    this.listeners.forEach((l) => l.onQueueChange?.(count));
    this.listeners.forEach((l) => l.onStatusChange?.(this.getStatus()));
  }
}
