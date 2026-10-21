import type { ParcelRecord, BridgePayload } from '../../types';

export interface InspectionSource {
  start(onInspection: (record: ParcelRecord) => void): void;
  stop(): void;
}

export interface InspectionStore {
  save(record: ParcelRecord): Promise<void>;
  list(limit?: number): Promise<ParcelRecord[]>;
  subscribe(listener: (record: ParcelRecord) => void): () => void;
}

export interface CloudSink {
  send(payload: BridgePayload): Promise<{ status: number; message: string }>;
}

export interface EdgeController {
  send(cmd: '1' | '2' | '3'): Promise<string>;
}
