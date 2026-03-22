import { monitorEventLoopDelay, IntervalHistogram, performance } from 'perf_hooks';
import { EventLoopMetrics } from '../types';

export class EventLoopCollector {
  private histogram: IntervalHistogram;
  private history: number[] = [];
  private eluHistory: number[] = [];
  private historySize: number;
  private prevELU: ReturnType<typeof performance.eventLoopUtilization>;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
    this.histogram = monitorEventLoopDelay({ resolution: 20 });
    this.histogram.enable();
    this.prevELU = performance.eventLoopUtilization();
  }

  collect(): EventLoopMetrics {
    const hasData = this.histogram.min < Number.MAX_SAFE_INTEGER && this.histogram.max > 0;
    const mean = hasData ? this.histogram.mean / 1e6 : 0;
    const p99 = hasData ? this.histogram.percentile(99) / 1e6 : 0;
    const min = hasData ? this.histogram.min / 1e6 : 0;
    const max = hasData ? this.histogram.max / 1e6 : 0;

    // Event Loop Utilization (0 = idle, 1 = fully saturated)
    const currentELU = performance.eventLoopUtilization(this.prevELU);
    const utilization = Math.round(currentELU.utilization * 1000) / 1000;
    this.prevELU = performance.eventLoopUtilization();

    this.history.push(Math.round(mean * 100) / 100);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    this.eluHistory.push(utilization);
    if (this.eluHistory.length > this.historySize) {
      this.eluHistory.shift();
    }

    this.histogram.reset();

    return {
      delay: Math.round(mean * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      utilization,
      history: [...this.history],
      eluHistory: [...this.eluHistory],
    };
  }

  destroy(): void {
    this.histogram.disable();
  }
}
