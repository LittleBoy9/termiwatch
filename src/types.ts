export interface Metrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  eventLoop: EventLoopMetrics;
  gc: GcMetrics;
  heap: HeapSpaceMetrics;
  handles: HandleMetrics;
  http: HttpMetrics;
  network: NetworkMetrics;
  workers: WorkerMetrics;
  async: AsyncMetrics;
  process: ProcessMetrics;
  errors: number;
}

export interface CpuMetrics {
  usage: number;       // percentage (0-100)
  user: number;        // user CPU %
  system: number;      // system CPU %
  history: number[];   // last N readings for sparkline
}

export interface MemoryMetrics {
  rss: number;         // bytes
  heapUsed: number;    // bytes
  heapTotal: number;   // bytes
  external: number;    // bytes
  arrayBuffers: number; // bytes
  history: number[];   // heapUsed history for sparkline
}

export interface EventLoopMetrics {
  delay: number;       // current mean delay in ms
  p99: number;         // 99th percentile delay in ms
  min: number;         // min delay in ms
  max: number;         // max delay in ms
  utilization: number; // event loop utilization 0-1
  history: number[];   // delay history for sparkline
  eluHistory: number[]; // ELU history for sparkline
}

export interface GcMetrics {
  totalPauses: number;       // total GC events since start
  totalPauseMs: number;      // cumulative pause time in ms
  lastPauseMs: number;       // most recent GC pause duration
  lastKind: string;          // 'minor' | 'major' | 'incremental' | 'weakcb'
  avgPauseMs: number;        // average pause duration
  maxPauseMs: number;        // worst GC pause seen
  pausesPerSecond: number;   // GC frequency
  history: number[];         // pause duration history for sparkline
  kindCounts: Record<string, number>; // count per GC type
}

export interface HeapSpaceInfo {
  name: string;
  size: number;        // bytes
  used: number;        // bytes
  available: number;   // bytes
  utilization: number; // 0-100%
}

export interface HeapSpaceMetrics {
  spaces: HeapSpaceInfo[];
  totalHeapSize: number;        // bytes
  totalHeapSizeExecutable: number; // bytes
  totalPhysicalSize: number;    // bytes
  heapSizeLimit: number;        // bytes
  mallocedMemory: number;       // bytes
  doesZapGarbage: boolean;
}

export interface HandleMetrics {
  total: number;
  byType: Record<string, number>;  // e.g. { Socket: 3, Server: 1, Timer: 5 }
  history: number[];               // total handle count over time
  trend: 'stable' | 'rising' | 'falling'; // leak indicator
}

export interface HttpMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  activeRequests: number;
  avgResponseTime: number;
  statusCodes: Record<number, number>;
  history: number[];   // rps history for sparkline
}

export interface ProcessMetrics {
  uptime: number;      // seconds
  pid: number;
  nodeVersion: string;
  platform: string;
  status: 'running' | 'crashed';
  framework: string;       // detected framework name or 'none'
  frameworkVersion: string; // detected framework version
  runner: string;           // 'nodemon' | 'pm2' | 'tsx' | 'direct' etc.
  runnerDetails: string;    // extra runner info
}

// ── Tier 3: Network, Workers, Async ──

export interface SocketInfo {
  remoteAddress: string;
  remotePort: number;
  localPort: number;
  bytesRead: number;
  bytesWritten: number;
  state: string;       // 'open' | 'readOnly' | 'writeOnly' | 'opening'
}

export interface DnsEntry {
  hostname: string;
  duration: number;    // ms
  timestamp: number;
}

export interface NetworkMetrics {
  activeSockets: number;
  totalBytesRead: number;
  totalBytesWritten: number;
  sockets: SocketInfo[];           // top N active sockets
  recentDns: DnsEntry[];           // recent DNS lookups with timing
  avgDnsTime: number;              // ms
  bytesReadHistory: number[];      // for sparkline
  bytesWrittenHistory: number[];   // for sparkline
}

export interface WorkerInfo {
  threadId: number;
  utilization: number;    // ELU 0-1
  heapUsed: number;       // bytes
  heapTotal: number;      // bytes
  status: 'online' | 'exited';
}

export interface WorkerMetrics {
  count: number;             // active workers
  totalCreated: number;      // lifetime count
  totalExited: number;
  workers: WorkerInfo[];     // per-worker stats
  eluHistory: number[];      // average worker ELU over time
}

export interface AsyncMetrics {
  activeHandles: number;
  activeRequests: number;
  handleHistory: number[];     // for sparkline
  requestHistory: number[];    // for sparkline
}

export type DashboardView = 'overview' | 'memory' | 'http' | 'network' | 'logs';

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'stdout' | 'stderr' | 'error';
}

export interface TermiwatchConfig {
  refreshInterval: number;   // ms between UI refreshes
  historySize: number;       // number of data points for sparklines
  patchHttp: boolean;        // auto-patch http module
  patchConsole: boolean;     // intercept console output
  showDashboard: boolean;    // render terminal UI
}

export const DEFAULT_CONFIG: TermiwatchConfig = {
  refreshInterval: 1000,
  historySize: 60,
  patchHttp: true,
  patchConsole: true,
  showDashboard: true,
};
