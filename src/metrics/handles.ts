import { HandleMetrics } from '../types';

export class HandleCollector {
  private history: number[] = [];
  private historySize: number;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  collect(): HandleMetrics {
    const handles = (process as any)._getActiveHandles?.() || [];
    const total = handles.length;

    // Classify handles by constructor name
    const byType: Record<string, number> = {};
    for (const handle of handles) {
      const typeName = handle?.constructor?.name || 'Unknown';
      byType[typeName] = (byType[typeName] || 0) + 1;
    }

    this.history.push(total);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    // Determine trend from last 10 readings
    const trend = this.computeTrend();

    return {
      total,
      byType,
      history: [...this.history],
      trend,
    };
  }

  private computeTrend(): HandleMetrics['trend'] {
    if (this.history.length < 5) return 'stable';

    const recent = this.history.slice(-10);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const avgFirst =
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;
    const threshold = Math.max(avgFirst * 0.1, 1); // 10% change or at least 1

    if (diff > threshold) return 'rising';
    if (diff < -threshold) return 'falling';
    return 'stable';
  }
}
