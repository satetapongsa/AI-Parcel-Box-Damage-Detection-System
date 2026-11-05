import type { InspectionEvent, ConnectionHealth } from '../events/inspectionEvent';
import { MockEdgeBridge } from './mockEdgeBridge';
import { CiRACoreAdapter } from './ciraCoreAdapter';

export type DataSourceMode = 'MOCK' | 'LIVE_EDGE';

export class EdgeBridge {
  private mockBridge: MockEdgeBridge;
  private ciraAdapter: CiRACoreAdapter;
  private mode: DataSourceMode = 'MOCK';
  private eventCallback: ((event: InspectionEvent) => void) | null = null;

  constructor() {
    this.mockBridge = new MockEdgeBridge();
    this.ciraAdapter = new CiRACoreAdapter();
  }

  public setMode(newMode: DataSourceMode): void {
    this.mode = newMode;
    console.log(`[EdgeBridge] Switched Data Source Mode to: ${newMode}`);

    if (newMode === 'LIVE_EDGE') {
      this.mockBridge.stop();
      this.ciraAdapter.connect();
    } else {
      this.ciraAdapter.disconnect();
      if (this.eventCallback) {
        this.mockBridge.start(this.eventCallback);
      }
    }
  }

  public getMode(): DataSourceMode {
    return this.mode;
  }

  public subscribe(callback: (event: InspectionEvent) => void): void {
    this.eventCallback = callback;

    if (this.mode === 'MOCK') {
      this.mockBridge.start(callback);
    } else {
      this.ciraAdapter.subscribe(callback);
    }
  }

  public triggerManualScan(damageType?: string): InspectionEvent {
    return this.mockBridge.triggerSingle(damageType);
  }

  public getConnectionHealth(): ConnectionHealth {
    if (this.mode === 'LIVE_EDGE') {
      return {
        ciraCore: 'CONNECTED',
        mqttBroker: 'CONNECTED',
        edgeBridge: 'CONNECTED',
        database: 'CONNECTED',
        webClient: 'CONNECTED'
      };
    }

    return {
      ciraCore: 'CONNECTED',
      mqttBroker: 'CONNECTED',
      edgeBridge: 'CONNECTED',
      database: 'CONNECTED',
      webClient: 'CONNECTED'
    };
  }
}
