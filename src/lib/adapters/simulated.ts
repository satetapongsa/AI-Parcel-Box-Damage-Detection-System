import type { CloudSink, EdgeController, InspectionStore } from './interfaces';
import type { BridgePayload, ParcelRecord } from '../../types';
import { validateBridgePayload } from './mappers';

/**
 * SimulatedCloudSink simulates the cloud ingestion endpoint matching api/inspections.ts behavior:
 * - 401 if unauthorized / invalid api key
 * - 422 / 400 if payload invalid
 * - 429 if rate limited
 * - 500 if server error
 * - 201 on success
 */
export class SimulatedCloudSink implements CloudSink {
  public faultMode: 'NONE' | 'AUTH_401' | 'MALFORMED_422' | 'SERVER_500' | 'RATE_LIMIT_429' = 'NONE';
  public isConnected = true;

  async send(payload: BridgePayload): Promise<{ status: number; message: string }> {
    if (!this.isConnected) {
      return { status: 0, message: 'Network offline: Connection refused' };
    }

    if (this.faultMode === 'AUTH_401') {
      return { status: 401, message: 'Unauthorized: Invalid x-api-key' };
    }

    if (this.faultMode === 'RATE_LIMIT_429') {
      return { status: 429, message: 'Too Many Requests' };
    }

    if (this.faultMode === 'SERVER_500') {
      return { status: 500, message: 'Internal Server Error (Database unreachable)' };
    }

    if (this.faultMode === 'MALFORMED_422') {
      return { status: 422, message: 'Unprocessable Entity: Malformed schema' };
    }

    const val = validateBridgePayload(payload);
    if (!val.valid) {
      return { status: 422, message: val.error || 'Invalid payload schema' };
    }

    return { status: 201, message: 'Created: Inspection recorded to cloud DB' };
  }
}

/**
 * SimulatedEdgeController matches the Wokwi ESP32 serial prototype:
 * Commands:
 * '1' -> GREEN: Parcel PASSED
 * '2' -> YELLOW: Waiting for inspection
 * '3' -> RED: Parcel FAILED
 */
export class SimulatedEdgeController implements EdgeController {
  private logListeners: ((msg: string) => void)[] = [];

  public onLog(cb: (msg: string) => void): () => void {
    this.logListeners.push(cb);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== cb);
    };
  }

  async send(cmd: '1' | '2' | '3'): Promise<string> {
    let response = '';
    if (cmd === '1') {
      response = '[ESP32 UART] 1 -> GREEN: Parcel PASSED (Actuator idle)';
    } else if (cmd === '2') {
      response = '[ESP32 UART] 2 -> YELLOW: Waiting for inspection';
    } else if (cmd === '3') {
      response = '[ESP32 UART] 3 -> RED: Parcel FAILED (Actuator TRIGGERED)';
    }

    this.logListeners.forEach((l) => l(response));
    return response;
  }
}

/**
 * In-memory local SQLite / Store implementation (queue <= 500)
 */
export class SimulatedLocalStore implements InspectionStore {
  private records: ParcelRecord[] = [];
  private listeners: ((record: ParcelRecord) => void)[] = [];

  constructor(initialRecords: ParcelRecord[] = []) {
    this.records = [...initialRecords];
  }

  async save(record: ParcelRecord): Promise<void> {
    // Keep max 500 records
    this.records = [record, ...this.records].slice(0, 500);
    this.listeners.forEach((l) => l(record));
  }

  async list(limit = 100): Promise<ParcelRecord[]> {
    return this.records.slice(0, limit);
  }

  subscribe(listener: (record: ParcelRecord) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  markHandled(id: string, reason: string): void {
    const r = this.records.find((rec) => rec.id === id);
    if (r) {
      r.handled = true;
      r.handledReason = reason;
    }
  }
}
