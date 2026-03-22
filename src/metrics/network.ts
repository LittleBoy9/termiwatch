import { PerformanceObserver } from 'perf_hooks';
import { NetworkMetrics, SocketInfo, DnsEntry } from '../types';

const net = require('net');

export class NetworkCollector {
  private dnsEntries: DnsEntry[] = [];
  private maxDnsEntries = 50;
  private dnsObserver: PerformanceObserver | null = null;
  private bytesReadHistory: number[] = [];
  private bytesWrittenHistory: number[] = [];
  private historySize: number;
  private lastBytesRead = 0;
  private lastBytesWritten = 0;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
    this.setupDnsObserver();
  }

  private setupDnsObserver(): void {
    try {
      this.dnsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.dnsEntries.push({
            hostname: entry.name || 'unknown',
            duration: Math.round(entry.duration * 100) / 100,
            timestamp: Date.now(),
          });
          if (this.dnsEntries.length > this.maxDnsEntries) {
            this.dnsEntries.shift();
          }
        }
      });
      this.dnsObserver.observe({ entryTypes: ['dns'] });
    } catch {
      // DNS observation not available — degrade gracefully
    }
  }

  collect(): NetworkMetrics {
    const sockets = this.getActiveSockets();
    const activeSockets = sockets.length;

    let totalBytesRead = 0;
    let totalBytesWritten = 0;

    const socketInfos: SocketInfo[] = [];
    for (const sock of sockets) {
      totalBytesRead += sock.bytesRead || 0;
      totalBytesWritten += sock.bytesWritten || 0;

      socketInfos.push({
        remoteAddress: sock.remoteAddress || 'unknown',
        remotePort: sock.remotePort || 0,
        localPort: sock.localPort || 0,
        bytesRead: sock.bytesRead || 0,
        bytesWritten: sock.bytesWritten || 0,
        state: sock.readyState || 'unknown',
      });
    }

    // Sort by bytes transferred (most active first), take top 10
    socketInfos.sort((a, b) => (b.bytesRead + b.bytesWritten) - (a.bytesRead + a.bytesWritten));
    const topSockets = socketInfos.slice(0, 10);

    // Calculate bytes/s delta
    const bytesReadDelta = totalBytesRead - this.lastBytesRead;
    const bytesWrittenDelta = totalBytesWritten - this.lastBytesWritten;
    this.lastBytesRead = totalBytesRead;
    this.lastBytesWritten = totalBytesWritten;

    this.bytesReadHistory.push(Math.max(bytesReadDelta, 0));
    if (this.bytesReadHistory.length > this.historySize) {
      this.bytesReadHistory.shift();
    }

    this.bytesWrittenHistory.push(Math.max(bytesWrittenDelta, 0));
    if (this.bytesWrittenHistory.length > this.historySize) {
      this.bytesWrittenHistory.shift();
    }

    // Recent DNS entries (last 10)
    const recentDns = this.dnsEntries.slice(-10);
    const avgDnsTime =
      this.dnsEntries.length > 0
        ? Math.round(
            (this.dnsEntries.reduce((sum, d) => sum + d.duration, 0) /
              this.dnsEntries.length) *
              100
          ) / 100
        : 0;

    return {
      activeSockets,
      totalBytesRead,
      totalBytesWritten,
      sockets: topSockets,
      recentDns,
      avgDnsTime,
      bytesReadHistory: [...this.bytesReadHistory],
      bytesWrittenHistory: [...this.bytesWrittenHistory],
    };
  }

  private getActiveSockets(): any[] {
    try {
      const handles: any[] = (process as any)._getActiveHandles?.() || [];
      return handles.filter(
        (h) =>
          h instanceof net.Socket &&
          !h.destroyed &&
          h.remoteAddress !== undefined
      );
    } catch {
      return [];
    }
  }

  destroy(): void {
    try {
      this.dnsObserver?.disconnect();
    } catch {
      // Already disconnected
    }
  }
}
