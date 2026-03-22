/**
 * nodewatch - Zero-config terminal dashboard for Node.js
 *
 * Auto-start:
 *   import "nodewatch/auto"
 *
 * Manual API:
 *   import { startNodewatch, stopNodewatch } from "nodewatch"
 *   const nw = startNodewatch()
 *   const metrics = nw.collectMetrics()
 *   stopNodewatch()
 *
 * CLI wrapper (zero code changes):
 *   npx nodewatch app.js
 */

export { Nodewatch, startNodewatch, stopNodewatch, getNodewatch } from './collector';
export { detectFramework } from './detect/framework';
export { detectRuntime } from './detect/runtime';
export { DEFAULT_CONFIG } from './types';
export type {
  Metrics,
  CpuMetrics,
  MemoryMetrics,
  EventLoopMetrics,
  GcMetrics,
  HeapSpaceMetrics,
  HeapSpaceInfo,
  HandleMetrics,
  HttpMetrics,
  NetworkMetrics,
  SocketInfo,
  DnsEntry,
  WorkerMetrics,
  WorkerInfo,
  AsyncMetrics,
  ProcessMetrics,
  LogEntry,
  NodewatchConfig,
  DashboardView,
} from './types';
