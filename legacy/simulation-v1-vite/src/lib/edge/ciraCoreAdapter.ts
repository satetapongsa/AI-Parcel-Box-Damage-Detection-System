import type { InspectionEvent } from '../events/inspectionEvent';
import { EventNormalizer } from '../events/eventNormalizer';

/**
 * CiRACoreAdapter
 * Integration abstraction for connecting real CiRA CORE Deep Learning Engine streams.
 *
 * Architecture:
 * CiRA CORE (TCP/WebSocket / Shared Memory)
 *   ↓
 * CiRACoreAdapter.onRawFramePayload()
 *   ↓
 * EventNormalizer.normalize()
 *   ↓
 * MQTT Publisher / WebSocket Server
 */
export class CiRACoreAdapter {
  private isConnected: boolean = false;
  private onEventCallback: ((event: InspectionEvent) => void) | null = null;
  private ciraHost: string;
  private ciraPort: number;

  constructor(ciraHost: string = '127.0.0.1', ciraPort: number = 8888) {
    this.ciraHost = ciraHost;
    this.ciraPort = ciraPort;
  }

  public async connect(): Promise<boolean> {
    console.log(`[CiRACoreAdapter] Connecting to CiRA CORE Engine at ${this.ciraHost}:${this.ciraPort}...`);
    // TODO: Connect to real CiRA CORE TCP Socket or WebSocket server
    // Example: this.socket = new WebSocket(`ws://${this.ciraHost}:${this.ciraPort}/cira-stream`);
    this.isConnected = true;
    return true;
  }

  public disconnect(): void {
    console.log(`[CiRACoreAdapter] Disconnecting from CiRA CORE Engine.`);
    this.isConnected = false;
  }

  public subscribe(callback: (event: InspectionEvent) => void): void {
    this.onEventCallback = callback;
  }

  /**
   * Called whenever a raw AI inference frame payload is emitted by CiRA CORE.
   */
  public handleRawCiRAPayload(rawPayload: any): void {
    if (!this.isConnected) return;

    // Normalize raw CiRA CORE output into standard SPDI InspectionEvent schema
    const normalized = EventNormalizer.normalize(rawPayload);

    if (this.onEventCallback) {
      this.onEventCallback(normalized);
    }
  }

  public getStatus(): 'CONNECTED' | 'DISCONNECTED' {
    return this.isConnected ? 'CONNECTED' : 'DISCONNECTED';
  }
}
