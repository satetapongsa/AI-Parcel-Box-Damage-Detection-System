import type { InspectionEvent } from '../events/inspectionEvent';
import { EventNormalizer } from '../events/eventNormalizer';

export class MockEdgeBridge {
  private listener: ((event: InspectionEvent) => void) | null = null;
  private intervalTimer: any = null;

  public start(callback: (event: InspectionEvent) => void, intervalMs: number = 4000): void {
    this.listener = callback;
    this.stop();

    this.intervalTimer = setInterval(() => {
      if (this.listener) {
        const mockRaw = this.generateMockRawPayload();
        const normalized = EventNormalizer.normalize(mockRaw);
        this.listener(normalized);
      }
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public triggerSingle(damageType?: string): InspectionEvent {
    const mockRaw = this.generateMockRawPayload(damageType);
    const normalized = EventNormalizer.normalize(mockRaw);
    if (this.listener) {
      this.listener(normalized);
    }
    return normalized;
  }

  private generateMockRawPayload(forcedDamage?: string): any {
    const damages = ['none', 'none', 'none', 'dent', 'tear', 'water_stain', 'none'];
    const selectedDamage = forcedDamage || damages[Math.floor(Math.random() * damages.length)];
    const randId = Math.floor(Math.random() * 899999 + 100000);

    let weight = 2.40;
    if (forcedDamage === 'weight_anomaly') {
      weight = 3.10;
    } else {
      weight = Math.round((1.5 + Math.random() * 2.5) * 100) / 100;
    }

    return {
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      trackingNumber: `THA-20261001-${randId}`,
      damageType: selectedDamage,
      confidence: selectedDamage === 'none' ? 98.5 : Math.round((86 + Math.random() * 11) * 10) / 10,
      weight: {
        actual: weight,
        expected: 2.40,
        differencePercent: Math.round(((weight - 2.40) / 2.40) * 1000) / 10
      },
      actuatorDelayMs: 180
    };
  }
}
