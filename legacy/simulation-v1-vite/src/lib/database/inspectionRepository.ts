import type { InspectionEvent } from '../events/inspectionEvent';

export class InspectionRepository {
  private records: InspectionEvent[] = [];

  public save(event: InspectionEvent): void {
    this.records.unshift(event);
    if (this.records.length > 500) {
      this.records.pop();
    }
  }

  public getAll(): InspectionEvent[] {
    return this.records;
  }

  public findByTracking(trackingNumber: string): InspectionEvent | undefined {
    return this.records.find((r) => r.trackingNumber.toLowerCase().includes(trackingNumber.toLowerCase()));
  }

  public getRejects(): InspectionEvent[] {
    return this.records.filter((r) => r.decision.status === 'REJECT');
  }
}
