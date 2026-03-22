import { PerformanceObserver, PerformanceEntry } from 'perf_hooks';
import { GcMetrics } from '../types';

const GC_KINDS: Record<number, string> = {
  1: 'minor',       // Scavenge
  2: 'major',       // Mark-Sweep-Compact
  4: 'incremental', // Incremental marking
  8: 'weakcb',      // Weak phantom callbacks
  15: 'all',
};

export class GcCollector {
  private observer: PerformanceObserver;
  private totalPauses = 0;
  private totalPauseMs = 0;
  private lastPauseMs = 0;
  private lastKind = '';
  private maxPauseMs = 0;
  private history: number[] = [];
  private historySize: number;
  private kindCounts: Record<string, number> = {};
  private pausesSinceLastCollect = 0;
  private lastCollectTime = Date.now();

  constructor(historySize: number = 60) {
    this.historySize = historySize;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.onGcEntry(entry);
      }
    });

    try {
      this.observer.observe({ entryTypes: ['gc'] });
    } catch {
      // GC observation not available — degrade gracefully
    }
  }

  private onGcEntry(entry: PerformanceEntry): void {
    const durationMs = entry.duration;
    const kind = GC_KINDS[(entry as any).detail?.kind ?? 0] || 'unknown';

    this.totalPauses++;
    this.totalPauseMs += durationMs;
    this.lastPauseMs = durationMs;
    this.lastKind = kind;
    this.pausesSinceLastCollect++;

    if (durationMs > this.maxPauseMs) {
      this.maxPauseMs = durationMs;
    }

    this.kindCounts[kind] = (this.kindCounts[kind] || 0) + 1;
  }

  collect(): GcMetrics {
    const now = Date.now();
    const elapsed = (now - this.lastCollectTime) / 1000;
    const pausesPerSecond =
      elapsed > 0
        ? Math.round((this.pausesSinceLastCollect / elapsed) * 10) / 10
        : 0;

    this.lastCollectTime = now;
    this.pausesSinceLastCollect = 0;

    const avgPauseMs =
      this.totalPauses > 0
        ? Math.round((this.totalPauseMs / this.totalPauses) * 100) / 100
        : 0;

    this.history.push(this.lastPauseMs);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    return {
      totalPauses: this.totalPauses,
      totalPauseMs: Math.round(this.totalPauseMs * 100) / 100,
      lastPauseMs: Math.round(this.lastPauseMs * 100) / 100,
      lastKind: this.lastKind || 'none',
      avgPauseMs,
      maxPauseMs: Math.round(this.maxPauseMs * 100) / 100,
      pausesPerSecond,
      history: [...this.history],
      kindCounts: { ...this.kindCounts },
    };
  }

  destroy(): void {
    try {
      this.observer.disconnect();
    } catch {
      // Already disconnected
    }
  }
}
