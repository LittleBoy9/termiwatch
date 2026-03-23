import {
  color,
  cursor,
  sparkline,
  brailleSparkline,
  progressBar,
  stackedBar,
  drawBox,
  formatBytes,
  formatUptime,
  formatTime,
  fitWidth,
} from './ansi';
import { Metrics, LogEntry, DashboardView } from '../types';

const VIEWS: DashboardView[] = ['overview', 'memory', 'http', 'network', 'logs'];
const VIEW_LABELS: Record<DashboardView, string> = {
  overview: 'Overview',
  memory: 'Memory & GC',
  http: 'HTTP',
  network: 'Network & Workers',
  logs: 'Logs',
};

export class Dashboard {
  private width = 0;
  private height = 0;
  private rawWrite: (data: string) => void;
  private running = false;
  private lastRender = '';
  private currentView: DashboardView = 'overview';

  constructor(rawWrite: (data: string) => void) {
    this.rawWrite = rawWrite;
    this.updateSize();
  }

  private updateSize(): void {
    this.width = Math.max(process.stdout.columns || 80, 60);
    this.height = Math.max(process.stdout.rows || 24, 20);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rawWrite(cursor.altScreenOn + cursor.hide);
    process.stdout.on('resize', () => this.updateSize());
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.rawWrite(cursor.show + cursor.altScreenOff);
  }

  nextView(): void {
    const idx = VIEWS.indexOf(this.currentView);
    this.currentView = VIEWS[(idx + 1) % VIEWS.length];
    this.lastRender = '';
  }

  prevView(): void {
    const idx = VIEWS.indexOf(this.currentView);
    this.currentView = VIEWS[(idx - 1 + VIEWS.length) % VIEWS.length];
    this.lastRender = '';
  }

  render(metrics: Metrics, logs: LogEntry[]): void {
    if (!this.running) return;
    this.updateSize();
    const output = this.buildFrame(metrics, logs);
    if (output !== this.lastRender) {
      this.rawWrite(cursor.moveTo(1, 1) + output);
      this.lastRender = output;
    }
  }

  private buildFrame(metrics: Metrics, logs: LogEntry[]): string {
    const w = this.width;
    const lines: string[] = [];

    lines.push(this.renderHeader(metrics, w));
    lines.push(this.renderViewTabs(w));

    switch (this.currentView) {
      case 'overview':
        this.renderOverviewView(metrics, logs, w, lines);
        break;
      case 'memory':
        this.renderMemoryView(metrics, w, lines);
        break;
      case 'http':
        this.renderHttpView(metrics, w, lines);
        break;
      case 'network':
        this.renderNetworkView(metrics, w, lines);
        break;
      case 'logs':
        this.renderLogsView(logs, w, lines);
        break;
    }

    lines.push(this.renderFooter(w));

    while (lines.length < this.height) {
      lines.push(' '.repeat(w));
    }

    return lines.slice(0, this.height).join('\n');
  }

  // ════════════════════════════════════════════════════════
  //  HEADER & TABS
  // ════════════════════════════════════════════════════════

  private renderHeader(metrics: Metrics, w: number): string {
    const title = `${color.bold}${color.brightCyan} ⚡ nodewatcher ${color.reset}`;
    const statusColor = metrics.process.status === 'running' ? color.brightGreen : color.brightRed;
    const statusIcon = metrics.process.status === 'running' ? '●' : '✖';
    const status = `${statusColor}${statusIcon} ${metrics.process.status.toUpperCase()}${color.reset}`;
    const sep = `${color.gray} │ ${color.reset}`;
    let info = `${color.gray}PID ${metrics.process.pid} │ ${metrics.process.nodeVersion} │ ↑ ${formatUptime(metrics.process.uptime)}${color.reset}`;

    if (metrics.process.framework !== 'none') {
      const fwVer = metrics.process.frameworkVersion ? ` ${metrics.process.frameworkVersion}` : '';
      info += `${sep}${color.brightYellow}${metrics.process.framework}${fwVer}${color.reset}`;
    }
    if (metrics.process.runner !== 'direct') {
      info += `${sep}${color.brightMagenta}${metrics.process.runner}${color.reset}`;
    }
    if (metrics.workers.count > 0) {
      info += `${sep}${color.brightCyan}${metrics.workers.count} worker${metrics.workers.count > 1 ? 's' : ''}${color.reset}`;
    }

    const errLabel = metrics.errors > 0
      ? `${color.brightRed}✖ ${metrics.errors} errors${color.reset}`
      : `${color.green}✔ 0 errors${color.reset}`;

    return fitWidth(title + sep + status + sep + info + '  ' + errLabel, w);
  }

  private renderViewTabs(w: number): string {
    let tabs = '';
    for (const view of VIEWS) {
      if (view === this.currentView) {
        tabs += `${color.bgCyan}${color.black}${color.bold} ${VIEW_LABELS[view]} ${color.reset} `;
      } else {
        tabs += `${color.gray} ${VIEW_LABELS[view]} ${color.reset} `;
      }
    }
    return fitWidth(tabs + `${color.dim}← Tab →${color.reset}`, w);
  }

  // ════════════════════════════════════════════════════════
  //  VIEW: OVERVIEW
  // ════════════════════════════════════════════════════════

  private renderOverviewView(metrics: Metrics, logs: LogEntry[], w: number, lines: string[]): void {
    const halfW = Math.floor((w - 1) / 2);
    const rightW = w - halfW;

    this.mergeBoxes(lines, this.renderCpuBox(metrics, halfW), this.renderMemoryBox(metrics, rightW));
    this.mergeBoxes(lines, this.renderEventLoopBox(metrics, halfW), this.renderGcBox(metrics, rightW));
    this.mergeBoxes(lines, this.renderHttpBox(metrics, halfW), this.renderSystemBox(metrics, rightW));

    const logHeight = Math.max(this.height - lines.length - 2, 4);
    lines.push(...this.renderLogBox(logs, w, logHeight));
  }

  // ════════════════════════════════════════════════════════
  //  VIEW: MEMORY & GC (deep dive)
  // ════════════════════════════════════════════════════════

  private renderMemoryView(metrics: Metrics, w: number, lines: string[]): void {
    const halfW = Math.floor((w - 1) / 2);
    const rightW = w - halfW;
    const sparkW = Math.max(w - 6, 10);
    const mem = metrics.memory;
    const heap = metrics.heap;
    const gc = metrics.gc;

    // Large memory braille chart
    const braille = brailleSparkline(mem.history.map((h) => h / (1024 * 1024)), sparkW, 4);
    const heapPercent = (mem.heapUsed / (mem.heapTotal || 1)) * 100;
    const memColor = this.thresholdColor(heapPercent, 60, 85);

    const memContent = [
      `${color.bold}RSS${color.reset} ${formatBytes(mem.rss)}  ${color.bold}Heap${color.reset} ${formatBytes(mem.heapUsed)}/${formatBytes(mem.heapTotal)}  ${color.bold}Ext${color.reset} ${formatBytes(mem.external)}  ${color.bold}Buf${color.reset} ${formatBytes(mem.arrayBuffers)}`,
      '',
      ...braille.map((l) => `${memColor}${l}${color.reset}`),
      '',
      progressBar(mem.heapUsed, mem.heapTotal, Math.min(sparkW, 60), memColor),
    ];
    lines.push(...drawBox('MEMORY USAGE', memContent, w, memContent.length + 2, color.brightMagenta));

    // Heap spaces + GC side by side
    const heapContent: string[] = [];
    heapContent.push(`${color.bold}Limit${color.reset} ${formatBytes(heap.heapSizeLimit)}  ${color.bold}Physical${color.reset} ${formatBytes(heap.totalPhysicalSize)}  ${color.bold}Malloc${color.reset} ${formatBytes(heap.mallocedMemory)}`);
    heapContent.push('');
    const spaceColors = [color.brightCyan, color.brightGreen, color.brightYellow, color.brightMagenta, color.blue, color.white];
    for (let i = 0; i < heap.spaces.length; i++) {
      const s = heap.spaces[i];
      if (s.size === 0) continue;
      const c = spaceColors[i % spaceColors.length];
      const barW2 = Math.max(halfW - 30, 8);
      heapContent.push(`${c}■${color.reset} ${fitWidth(s.name, 14)}${formatBytes(s.used).padStart(8)}/${formatBytes(s.size).padStart(8)} ${progressBar(s.used, s.size, barW2, c)}`);
    }

    const gcContent: string[] = [];
    gcContent.push(`${color.bold}Total${color.reset} ${gc.totalPauses} pauses  ${color.bold}Time${color.reset} ${gc.totalPauseMs.toFixed(1)}ms  ${color.bold}Rate${color.reset} ${gc.pausesPerSecond}/s`);
    gcContent.push(`${color.bold}Avg${color.reset} ${gc.avgPauseMs}ms  ${color.bold}Max${color.reset} ${color.brightRed}${gc.maxPauseMs}ms${color.reset}  ${color.bold}Last${color.reset} ${gc.lastPauseMs}ms (${gc.lastKind})`);
    gcContent.push('');
    const kindStr = Object.entries(gc.kindCounts)
      .map(([kind, count]) => {
        const c = kind === 'major' ? color.brightRed : kind === 'minor' ? color.green : color.yellow;
        return `${c}${kind}:${count}${color.reset}`;
      }).join('  ');
    gcContent.push(kindStr || `${color.dim}no GC events yet${color.reset}`);
    gcContent.push('');
    gcContent.push(`${this.thresholdColor(gc.lastPauseMs, 5, 50)}${sparkline(gc.history, Math.max(rightW - 4, 10))}${color.reset}`);

    const boxH = Math.max(heapContent.length, gcContent.length) + 2;
    this.mergeBoxes(lines,
      drawBox('HEAP SPACES', heapContent, halfW, boxH, color.brightCyan),
      drawBox('GARBAGE COLLECTION', gcContent, rightW, boxH, color.brightRed)
    );

    // Handle leak monitor
    const h = metrics.handles;
    const trendIcon = h.trend === 'rising' ? `${color.brightRed}↑ RISING — possible leak!${color.reset}`
      : h.trend === 'falling' ? `${color.brightGreen}↓ falling${color.reset}`
      : `${color.green}~ stable${color.reset}`;
    const topHandles = Object.entries(h.byType).sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([type, count]) => `${color.dim}${type}:${color.reset}${count}`).join('  ');

    const handleContent = [
      `${color.bold}${h.total}${color.reset} active handles  ${trendIcon}`,
      topHandles || `${color.dim}no active handles${color.reset}`,
      `${color.cyan}${sparkline(h.history, Math.max(w - 6, 10))}${color.reset}`,
    ];
    lines.push(...drawBox('HANDLE LEAK MONITOR', handleContent, w, handleContent.length + 2, color.brightWhite));
  }

  // ════════════════════════════════════════════════════════
  //  VIEW: HTTP
  // ════════════════════════════════════════════════════════

  private renderHttpView(metrics: Metrics, w: number, lines: string[]): void {
    const http = metrics.http;
    const sparkW = Math.max(w - 6, 10);
    const halfW = Math.floor((w - 1) / 2);
    const rightW = w - halfW;

    // Large req/s braille chart
    const braille = brailleSparkline(http.history, sparkW, 3);
    const rateContent = [
      `${color.brightCyan}${color.bold}${http.requestsPerSecond}${color.reset} ${color.dim}req/s${color.reset}  ${color.bold}Total${color.reset} ${http.totalRequests}  ${color.bold}Active${color.reset} ${http.activeRequests}  ${color.bold}Avg Latency${color.reset} ${http.avgResponseTime}ms`,
      '',
      ...braille.map((l) => `${color.brightCyan}${l}${color.reset}`),
    ];
    lines.push(...drawBox('REQUESTS / SECOND', rateContent, w, rateContent.length + 2, color.brightBlue));

    // Status codes + Event Loop
    const statusContent: string[] = [];
    const codes = Object.entries(http.statusCodes).sort(([a], [b]) => Number(a) - Number(b));
    const totalReqs = http.totalRequests || 1;
    if (codes.length === 0) {
      statusContent.push(`${color.dim}No requests recorded yet${color.reset}`);
    } else {
      for (const [code, count] of codes) {
        const codeNum = Number(code);
        const c = codeNum < 300 ? color.brightGreen : codeNum < 400 ? color.cyan : codeNum < 500 ? color.brightYellow : color.brightRed;
        const pct = ((count / totalReqs) * 100).toFixed(1);
        const barW2 = Math.max(halfW - 20, 5);
        statusContent.push(`${c}${code}${color.reset}  ${String(count).padStart(6)}  ${pct.padStart(5)}%  ${progressBar(count, totalReqs, barW2, c)}`);
      }
    }

    const el = metrics.eventLoop;
    const delayColor = this.thresholdColor(el.delay, 10, 50);
    const eluPercent = Math.round(el.utilization * 100);
    const eluColor = this.thresholdColor(eluPercent, 50, 80);

    const elContent = [
      `${delayColor}${color.bold}${el.delay.toFixed(2)}ms${color.reset} ${color.dim}mean  p99:${el.p99.toFixed(2)}ms${color.reset}`,
      `${color.dim}min:${el.min.toFixed(2)}ms  max:${el.max.toFixed(2)}ms${color.reset}`,
      '',
      `${eluColor}ELU ${color.bold}${eluPercent}%${color.reset} ${progressBar(eluPercent, 100, 15, eluColor)}`,
      '',
      `${delayColor}${sparkline(el.history, Math.max(rightW - 4, 10))}${color.reset}`,
    ];

    const boxH = Math.max(statusContent.length, elContent.length) + 2;
    this.mergeBoxes(lines,
      drawBox('STATUS CODES', statusContent, halfW, boxH, color.brightGreen),
      drawBox('EVENT LOOP', elContent, rightW, boxH, color.brightYellow)
    );
  }

  // ════════════════════════════════════════════════════════
  //  VIEW: NETWORK & WORKERS (Tier 3)
  // ════════════════════════════════════════════════════════

  private renderNetworkView(metrics: Metrics, w: number, lines: string[]): void {
    const halfW = Math.floor((w - 1) / 2);
    const rightW = w - halfW;
    const sparkW = Math.max(w - 6, 10);
    const net = metrics.network;

    // ── Network I/O (full width braille chart) ──
    const rxBraille = brailleSparkline(net.bytesReadHistory, sparkW, 2);
    const netContent = [
      `${color.bold}Sockets${color.reset} ${net.activeSockets}  ` +
      `${color.brightGreen}↓${color.reset} ${formatBytes(net.totalBytesRead)} read  ` +
      `${color.brightCyan}↑${color.reset} ${formatBytes(net.totalBytesWritten)} written  ` +
      `${color.bold}DNS avg${color.reset} ${net.avgDnsTime}ms`,
      '',
      `${color.brightGreen}${rxBraille[0]}${color.reset}`,
      `${color.brightGreen}${rxBraille[1]}${color.reset}`,
    ];
    lines.push(...drawBox('NETWORK I/O', netContent, w, netContent.length + 2, color.brightGreen));

    // ── Active Sockets + DNS side by side ──
    const socketContent: string[] = [];
    if (net.sockets.length === 0) {
      socketContent.push(`${color.dim}No active TCP connections${color.reset}`);
    } else {
      socketContent.push(`${color.dim}${'Remote'.padEnd(22)} ${'Port'.padStart(5)} ${'Read'.padStart(9)} ${'Written'.padStart(9)} State${color.reset}`);
      for (const s of net.sockets.slice(0, 8)) {
        const addr = s.remoteAddress.length > 20 ? s.remoteAddress.slice(0, 19) + '…' : s.remoteAddress;
        socketContent.push(
          `${addr.padEnd(22)} ${String(s.remotePort).padStart(5)} ${formatBytes(s.bytesRead).padStart(9)} ${formatBytes(s.bytesWritten).padStart(9)} ${color.dim}${s.state}${color.reset}`
        );
      }
    }

    const dnsContent: string[] = [];
    if (net.recentDns.length === 0) {
      dnsContent.push(`${color.dim}No DNS lookups recorded${color.reset}`);
    } else {
      dnsContent.push(`${color.dim}Avg: ${net.avgDnsTime}ms  Total: ${net.recentDns.length} lookups${color.reset}`);
      dnsContent.push('');
      for (const d of net.recentDns.slice(-6)) {
        const dnsColor = d.duration > 50 ? color.brightRed : d.duration > 10 ? color.brightYellow : color.brightGreen;
        dnsContent.push(`${color.gray}${formatTime(d.timestamp)}${color.reset} ${d.hostname} ${dnsColor}${d.duration}ms${color.reset}`);
      }
    }

    const sockDnsH = Math.max(socketContent.length, dnsContent.length) + 2;
    this.mergeBoxes(lines,
      drawBox('ACTIVE SOCKETS', socketContent, halfW, sockDnsH, color.brightCyan),
      drawBox('DNS LOOKUPS', dnsContent, rightW, sockDnsH, color.brightYellow)
    );

    // ── Workers + Async Activity side by side ──
    const wk = metrics.workers;
    const workerContent: string[] = [];

    if (wk.count === 0 && wk.totalCreated === 0) {
      workerContent.push(`${color.dim}No worker threads created${color.reset}`);
    } else {
      workerContent.push(
        `${color.bold}Active${color.reset} ${wk.count}  ${color.bold}Created${color.reset} ${wk.totalCreated}  ${color.bold}Exited${color.reset} ${wk.totalExited}`
      );
      workerContent.push('');

      if (wk.workers.length > 0) {
        workerContent.push(`${color.dim}${'TID'.padStart(4)} ${'ELU'.padStart(6)} ${'Heap'.padStart(12)} Status${color.reset}`);
        for (const worker of wk.workers.slice(0, 6)) {
          const eluPct = Math.round(worker.utilization * 100);
          const eluC = this.thresholdColor(eluPct, 50, 80);
          const statusC = worker.status === 'online' ? color.brightGreen : color.gray;
          workerContent.push(
            `${String(worker.threadId).padStart(4)} ${eluC}${(eluPct + '%').padStart(5)}${color.reset} ${formatBytes(worker.heapUsed).padStart(6)}/${formatBytes(worker.heapTotal).padStart(6)} ${statusC}${worker.status}${color.reset}`
          );
        }
      }

      if (wk.eluHistory.length > 0) {
        workerContent.push('');
        workerContent.push(`${color.brightCyan}${sparkline(wk.eluHistory.map((e) => e * 100), Math.max(halfW - 4, 10))}${color.reset}`);
      }
    }

    const as = metrics.async;
    const asyncContent = [
      `${color.bold}Handles${color.reset} ${as.activeHandles}  ${color.bold}Requests${color.reset} ${as.activeRequests}`,
      '',
      `${color.dim}Handles${color.reset}`,
      `${color.brightCyan}${sparkline(as.handleHistory, Math.max(rightW - 4, 10))}${color.reset}`,
      '',
      `${color.dim}Pending I/O${color.reset}`,
      `${color.brightYellow}${sparkline(as.requestHistory, Math.max(rightW - 4, 10))}${color.reset}`,
    ];

    const waH = Math.max(workerContent.length, asyncContent.length) + 2;
    this.mergeBoxes(lines,
      drawBox('WORKER THREADS', workerContent, halfW, waH, color.brightMagenta),
      drawBox('ASYNC ACTIVITY', asyncContent, rightW, waH, color.brightWhite)
    );
  }

  // ════════════════════════════════════════════════════════
  //  VIEW: LOGS (full screen)
  // ════════════════════════════════════════════════════════

  private renderLogsView(logs: LogEntry[], w: number, lines: string[]): void {
    const statsBar = `${color.dim}Total: ${logs.length} entries  │  ` +
      `stdout: ${logs.filter((l) => l.type === 'stdout').length}  │  ` +
      `stderr: ${logs.filter((l) => l.type === 'stderr').length}  │  ` +
      `errors: ${logs.filter((l) => l.type === 'error').length}${color.reset}`;
    lines.push(fitWidth(statsBar, w));
    const logHeight = Math.max(this.height - lines.length - 2, 6);
    lines.push(...this.renderLogBox(logs, w, logHeight));
  }

  // ════════════════════════════════════════════════════════
  //  SHARED PANEL RENDERERS
  // ════════════════════════════════════════════════════════

  private renderCpuBox(metrics: Metrics, w: number): string[] {
    const cpu = metrics.cpu;
    const sparkW = Math.max(w - 4, 10);
    const cpuColor = this.thresholdColor(cpu.usage, 50, 80);
    const braille = brailleSparkline(cpu.history, sparkW, 2);
    const content = [
      `${cpuColor}${color.bold}${cpu.usage.toFixed(1)}%${color.reset} ${color.dim}usr:${cpu.user.toFixed(1)}%  sys:${cpu.system.toFixed(1)}%${color.reset}`,
      '',
      ...braille.map((l) => `${cpuColor}${l}${color.reset}`),
      '',
      progressBar(cpu.usage, 100, Math.min(sparkW, 40), cpuColor),
    ];
    return drawBox('CPU', content, w, content.length + 2, color.brightCyan);
  }

  private renderMemoryBox(metrics: Metrics, w: number): string[] {
    const mem = metrics.memory;
    const sparkW = Math.max(w - 4, 10);
    const heapPercent = (mem.heapUsed / (mem.heapTotal || 1)) * 100;
    const memColor = this.thresholdColor(heapPercent, 60, 85);
    const braille = brailleSparkline(mem.history.map((h) => h / (1024 * 1024)), sparkW, 2);
    const content = [
      `${color.bold}RSS${color.reset} ${formatBytes(mem.rss)}  ${color.bold}Heap${color.reset} ${formatBytes(mem.heapUsed)}/${formatBytes(mem.heapTotal)}`,
      `${color.dim}Ext ${formatBytes(mem.external)}  Buf ${formatBytes(mem.arrayBuffers)}${color.reset}`,
      ...braille.map((l) => `${memColor}${l}${color.reset}`),
      '',
      progressBar(mem.heapUsed, mem.heapTotal, Math.min(sparkW, 40), memColor),
    ];
    return drawBox('MEMORY', content, w, content.length + 2, color.brightMagenta);
  }

  private renderEventLoopBox(metrics: Metrics, w: number): string[] {
    const el = metrics.eventLoop;
    const sparkW = Math.max(w - 4, 10);
    const delayColor = this.thresholdColor(el.delay, 10, 50);
    const eluPercent = Math.round(el.utilization * 100);
    const eluColor = this.thresholdColor(eluPercent, 50, 80);
    const content = [
      `${delayColor}${color.bold}${el.delay.toFixed(2)}ms${color.reset} ${color.dim}p99:${el.p99.toFixed(2)}ms  min:${el.min.toFixed(2)}ms  max:${el.max.toFixed(2)}ms${color.reset}`,
      `${eluColor}ELU ${color.bold}${eluPercent}%${color.reset} ${progressBar(eluPercent, 100, 20, eluColor)} ${color.dim}(0%=idle 100%=saturated)${color.reset}`,
      '',
      `${delayColor}${sparkline(el.history, sparkW)}${color.reset}`,
    ];
    return drawBox('EVENT LOOP', content, w, content.length + 2, color.brightYellow);
  }

  private renderGcBox(metrics: Metrics, w: number): string[] {
    const gc = metrics.gc;
    const sparkW = Math.max(w - 4, 10);
    const pauseColor = this.thresholdColor(gc.lastPauseMs, 5, 50);
    const kindStr = Object.entries(gc.kindCounts)
      .map(([kind, count]) => {
        const c = kind === 'major' ? color.brightRed : kind === 'minor' ? color.green : color.yellow;
        return `${c}${kind}:${count}${color.reset}`;
      }).join(' ');
    const content = [
      `${color.bold}${gc.totalPauses}${color.reset} ${color.dim}pauses  ${color.reset}${pauseColor}avg:${gc.avgPauseMs}ms${color.reset}  ${color.dim}max:${color.reset}${color.brightRed}${gc.maxPauseMs}ms${color.reset}  ${color.dim}${gc.pausesPerSecond}/s${color.reset}`,
      kindStr || `${color.dim}no GC events yet${color.reset}`,
      '',
      `${pauseColor}${sparkline(gc.history, sparkW)}${color.reset}`,
    ];
    return drawBox('GC', content, w, content.length + 2, color.brightRed);
  }

  private renderHttpBox(metrics: Metrics, w: number): string[] {
    const http = metrics.http;
    const sparkW = Math.max(w - 4, 10);
    const statusStr = Object.entries(http.statusCodes)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([code, count]) => {
        const c = Number(code) < 400 ? color.green : Number(code) < 500 ? color.yellow : color.red;
        return `${c}${code}:${count}${color.reset}`;
      }).join(' ');
    const content = [
      `${color.brightCyan}${color.bold}${http.requestsPerSecond}${color.reset} ${color.dim}req/s  total:${http.totalRequests}  active:${http.activeRequests}  avg:${http.avgResponseTime}ms${color.reset}`,
      statusStr || `${color.dim}no requests yet${color.reset}`,
      '',
      `${color.brightCyan}${sparkline(http.history, sparkW)}${color.reset}`,
    ];
    return drawBox('HTTP', content, w, content.length + 2, color.brightBlue);
  }

  private renderSystemBox(metrics: Metrics, w: number): string[] {
    const h = metrics.handles;
    const heap = metrics.heap;
    const barW = Math.max(w - 4, 10);
    const trendIcon = h.trend === 'rising' ? `${color.brightRed}↑ RISING${color.reset}`
      : h.trend === 'falling' ? `${color.brightGreen}↓ falling${color.reset}`
      : `${color.green}~ stable${color.reset}`;
    const topHandles = Object.entries(h.byType).sort(([, a], [, b]) => b - a).slice(0, 4)
      .map(([type, count]) => `${color.dim}${type}:${color.reset}${count}`).join(' ');
    const heapSegments = heap.spaces.filter((s) => s.used > 0)
      .map((s, i) => ({
        value: s.used,
        color: [color.brightCyan, color.brightGreen, color.brightYellow, color.brightMagenta, color.blue, color.white][i % 6],
      }));
    const heapLegend = heap.spaces.filter((s) => s.used > 0).slice(0, 4)
      .map((s, i) => {
        const c = [color.brightCyan, color.brightGreen, color.brightYellow, color.brightMagenta][i % 4];
        return `${c}■${color.reset}${color.dim}${s.name}${color.reset}`;
      }).join(' ');
    const content = [
      `${color.bold}Handles${color.reset} ${h.total} ${trendIcon}  ${topHandles}`,
      `${color.bold}Heap${color.reset} ${formatBytes(heap.totalHeapSize)}/${formatBytes(heap.heapSizeLimit)} ${color.dim}malloc:${formatBytes(heap.mallocedMemory)}${color.reset}`,
      stackedBar(heapSegments, Math.min(barW, 40)),
      heapLegend,
    ];
    return drawBox('SYSTEM', content, w, content.length + 2, color.brightWhite);
  }

  private renderLogBox(logs: LogEntry[], w: number, h: number): string[] {
    const innerH = h - 2;
    const recentLogs = logs.slice(-innerH);
    const content: string[] = [];
    for (const log of recentLogs) {
      const time = `${color.gray}${formatTime(log.timestamp)}${color.reset}`;
      const typeColor = log.type === 'error' ? color.brightRed : log.type === 'stderr' ? color.yellow : color.white;
      const typeLabel = log.type === 'error' ? `${color.brightRed}ERR${color.reset}`
        : log.type === 'stderr' ? `${color.yellow}ERR${color.reset}`
        : `${color.gray}LOG${color.reset}`;
      const prefix = `${time} ${typeLabel} `;
      const msgWidth = w - 16;
      const msg = log.message.length > msgWidth ? log.message.slice(0, msgWidth - 1) + '…' : log.message;
      content.push(`${prefix}${typeColor}${msg}${color.reset}`);
    }
    return drawBox('LOGS', content, w, h, color.gray);
  }

  private renderFooter(w: number): string {
    const help = `${color.dim} Tab${color.reset}${color.gray} switch view${color.reset}  ${color.dim}q${color.reset}${color.gray} exit${color.reset}  ${color.dim}nodewatcher v1.0.0${color.reset}`;
    return fitWidth(help, w);
  }

  // ════════════════════════════════════════════════════════

  private mergeBoxes(lines: string[], left: string[], right: string[]): void {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      lines.push((left[i] || '') + (right[i] || ''));
    }
  }

  private thresholdColor(value: number, warn: number, crit: number): string {
    if (value > crit) return color.brightRed;
    if (value > warn) return color.brightYellow;
    return color.brightGreen;
  }
}
