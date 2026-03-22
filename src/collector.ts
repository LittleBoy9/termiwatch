import {
  CpuCollector,
  MemoryCollector,
  EventLoopCollector,
  GcCollector,
  HeapCollector,
  HandleCollector,
  WorkerCollector,
  NetworkCollector,
  AsyncCollector,
} from './metrics';
import { HttpPatcher } from './patch/http';
import { ConsolePatcher } from './patch/console';
import { Dashboard } from './ui/dashboard';
import { detectFramework } from './detect/framework';
import { detectRuntime } from './detect/runtime';
import { Metrics, NodewatchConfig, DEFAULT_CONFIG, LogEntry, WorkerMetrics } from './types';

export class Nodewatch {
  private config: NodewatchConfig;
  private cpuCollector: CpuCollector;
  private memoryCollector: MemoryCollector;
  private eventLoopCollector: EventLoopCollector;
  private gcCollector: GcCollector;
  private heapCollector: HeapCollector;
  private handleCollector: HandleCollector;
  private workerCollector: WorkerCollector;
  private networkCollector: NetworkCollector;
  private asyncCollector: AsyncCollector;
  private httpPatcher: HttpPatcher;
  private consolePatcher: ConsolePatcher;
  private dashboard: Dashboard | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private lastWorkerMetrics: WorkerMetrics = {
    count: 0,
    totalCreated: 0,
    totalExited: 0,
    workers: [],
    eluHistory: [],
  };

  constructor(config: Partial<NodewatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cpuCollector = new CpuCollector(this.config.historySize);
    this.memoryCollector = new MemoryCollector(this.config.historySize);
    this.eventLoopCollector = new EventLoopCollector(this.config.historySize);
    this.gcCollector = new GcCollector(this.config.historySize);
    this.heapCollector = new HeapCollector();
    this.handleCollector = new HandleCollector(this.config.historySize);
    this.workerCollector = new WorkerCollector(this.config.historySize);
    this.networkCollector = new NetworkCollector(this.config.historySize);
    this.asyncCollector = new AsyncCollector(this.config.historySize);
    this.httpPatcher = new HttpPatcher(this.config.historySize);
    this.consolePatcher = new ConsolePatcher();
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    const isTTY = process.stdout.isTTY === true;

    if (this.config.patchHttp) {
      this.httpPatcher.patch();
    }

    // Patch Worker constructor for monitoring
    this.workerCollector.patch();

    if (this.config.patchConsole) {
      this.consolePatcher.patch();
    }

    if (this.config.showDashboard && isTTY) {
      this.consolePatcher.suppressOutput = true;
      this.dashboard = new Dashboard((data: string) => {
        this.consolePatcher.rawWrite(data);
      });
      this.dashboard.start();
      this.setupKeyboard();
    }

    this.interval = setInterval(() => {
      this.tick();
    }, this.config.refreshInterval);

    if (this.interval.unref) {
      this.interval.unref();
    }

    process.on('exit', () => {
      this.stop();
    });

    this.tick();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.dashboard) {
      this.dashboard.stop();
      this.dashboard = null;
    }

    this.consolePatcher.suppressOutput = false;
    this.consolePatcher.restore();
    this.eventLoopCollector.destroy();
    this.gcCollector.destroy();
    this.networkCollector.destroy();
  }

  private tick(): void {
    // Collect worker metrics asynchronously (has getHeapStatistics)
    this.workerCollector
      .collect()
      .then((wm) => {
        this.lastWorkerMetrics = wm;
      })
      .catch(() => {
        // Ignore worker collection errors
      });

    const metrics = this.collectMetrics();
    const logs = this.consolePatcher.getLogs();

    if (this.dashboard) {
      this.dashboard.render(metrics, logs);
    }
  }

  collectMetrics(): Metrics {
    const fw = detectFramework();
    const rt = detectRuntime();

    return {
      cpu: this.cpuCollector.collect(),
      memory: this.memoryCollector.collect(),
      eventLoop: this.eventLoopCollector.collect(),
      gc: this.gcCollector.collect(),
      heap: this.heapCollector.collect(),
      handles: this.handleCollector.collect(),
      http: this.httpPatcher.collect(),
      network: this.networkCollector.collect(),
      workers: this.lastWorkerMetrics,
      async: this.asyncCollector.collect(),
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        status: 'running',
        framework: fw.name,
        frameworkVersion: fw.version,
        runner: rt.runner,
        runnerDetails: rt.details,
      },
      errors: this.consolePatcher.getErrorCount(),
    };
  }

  getLogs(): LogEntry[] {
    return this.consolePatcher.getLogs();
  }

  private setupKeyboard(): void {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.unref();

    process.stdin.on('data', (key: string) => {
      if (key === 'q' || key === '\x03') {
        this.stop();
        process.exit(0);
      }

      if (key === '\t') {
        this.dashboard?.nextView();
        this.tick();
      }

      if (key === '\x1b[Z') {
        this.dashboard?.prevView();
        this.tick();
      }
    });
  }
}

let instance: Nodewatch | null = null;

export function getNodewatch(): Nodewatch {
  if (!instance) {
    instance = new Nodewatch();
  }
  return instance;
}

export function startNodewatch(config?: Partial<NodewatchConfig>): Nodewatch {
  if (instance) {
    return instance;
  }
  instance = new Nodewatch(config);
  instance.start();
  return instance;
}

export function stopNodewatch(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
