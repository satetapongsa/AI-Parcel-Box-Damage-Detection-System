import type { BridgePayload } from '../../types';

export interface QueueItem {
  id: string;
  payload: BridgePayload;
  addedAt: number;
  retryCount: number;
}

/**
 * Pure Store-and-Forward queue implementation matching bridge.py logic:
 * - Maximum queue capacity (e.g. 500)
 * - Drops OLDEST items when capacity exceeded (FIFO dropping)
 * - Retry rule:
 *     - 2xx: Success -> Remove from queue
 *     - 400, 422: Malformed payload -> Discard item
 *     - 401, 403, 404, 429, 5xx: Auth / Server error -> KEEP in queue to retry
 */
export class BridgeQueue {
  private queue: QueueItem[] = [];
  private limit: number;

  constructor(limit = 500) {
    this.limit = limit;
  }

  public getLimit(): number {
    return this.limit;
  }

  public setLimit(limit: number): void {
    this.limit = limit;
    this.enforceCapacity();
  }

  public getItems(): readonly QueueItem[] {
    return [...this.queue];
  }

  public size(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }

  /**
   * Enqueues a new item. If full, drops the oldest item.
   * Returns true if an older item was dropped to make room.
   */
  public enqueue(payload: BridgePayload): { droppedOldest: boolean } {
    let droppedOldest = false;
    if (this.queue.length >= this.limit) {
      this.queue.shift(); // Drop oldest
      droppedOldest = true;
    }

    this.queue.push({
      id: `${payload.tracking_no}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      payload,
      addedAt: Date.now(),
      retryCount: 0
    });

    return { droppedOldest };
  }

  /**
   * Evaluates the HTTP response code for a queued item according to bridge.py logic.
   * Returns:
   * - 'REMOVE': If status is 2xx, 400, or 422
   * - 'RETRY': If status is 401, 403, 404, 429, 5xx
   */
  public handleResponse(itemId: string, statusCode: number): 'REMOVE' | 'RETRY' {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const isPayloadError = statusCode === 400 || statusCode === 422;

    if (isSuccess || isPayloadError) {
      // Remove permanently
      this.queue = this.queue.filter((item) => item.id !== itemId);
      return 'REMOVE';
    }

    // Auth error (401), Rate limit (429), or Server error (5xx) -> Keep in queue
    const target = this.queue.find((item) => item.id === itemId);
    if (target) {
      target.retryCount += 1;
    }
    return 'RETRY';
  }

  private enforceCapacity(): void {
    while (this.queue.length > this.limit) {
      this.queue.shift();
    }
  }
}
