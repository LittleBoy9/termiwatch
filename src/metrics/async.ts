import { AsyncMetrics } from '../types';

/**
 * Async Activity Monitor
 *
 * Uses process._getActiveHandles() and process._getActiveRequests()
 * as lightweight proxies for async activity level.
 *
 * This avoids the 30-97% overhead of raw async_hooks while still
 * providing useful visibility into the async work queue depth.
 */
export class AsyncCollector {
  private handleHistory: number[] = [];
  private requestHistory: number[] = [];
  private historySize: number;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  collect(): AsyncMetrics {
    const activeHandles = this.getActiveHandleCount();
    const activeRequests = this.getActiveRequestCount();

    this.handleHistory.push(activeHandles);
    if (this.handleHistory.length > this.historySize) {
      this.handleHistory.shift();
    }

    this.requestHistory.push(activeRequests);
    if (this.requestHistory.length > this.historySize) {
      this.requestHistory.shift();
    }

    return {
      activeHandles,
      activeRequests,
      handleHistory: [...this.handleHistory],
      requestHistory: [...this.requestHistory],
    };
  }

  private getActiveHandleCount(): number {
    try {
      return ((process as any)._getActiveHandles?.() || []).length;
    } catch {
      return 0;
    }
  }

  private getActiveRequestCount(): number {
    try {
      return ((process as any)._getActiveRequests?.() || []).length;
    } catch {
      return 0;
    }
  }
}
