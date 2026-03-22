import * as os from 'os';
import { CpuMetrics } from '../types';

export class CpuCollector {
  private prevCpu = process.cpuUsage();
  private prevTime = process.hrtime.bigint();
  private history: number[] = [];
  private historySize: number;
  private cpuCount = os.cpus().length;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  collect(): CpuMetrics {
    const currentCpu = process.cpuUsage(this.prevCpu);
    const currentTime = process.hrtime.bigint();
    const elapsedUs = Number(currentTime - this.prevTime) / 1000; // ns -> µs

    const userPercent = (currentCpu.user / elapsedUs) * 100;
    const systemPercent = (currentCpu.system / elapsedUs) * 100;
    const totalPercent = Math.min((userPercent + systemPercent) / this.cpuCount, 100);

    this.prevCpu = process.cpuUsage();
    this.prevTime = process.hrtime.bigint();

    this.history.push(totalPercent);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    return {
      usage: Math.round(totalPercent * 10) / 10,
      user: Math.round(userPercent * 10) / 10,
      system: Math.round(systemPercent * 10) / 10,
      history: [...this.history],
    };
  }
}
