import { MemoryMetrics } from '../types';

export class MemoryCollector {
  private history: number[] = [];
  private historySize: number;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  collect(): MemoryMetrics {
    const mem = process.memoryUsage();

    this.history.push(mem.heapUsed);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    return {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      history: [...this.history],
    };
  }
}
