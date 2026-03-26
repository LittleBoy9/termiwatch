/**
 * termiwatch - Zero-config terminal dashboard for Node.js
 *
 * Auto-start:
 *   import "termiwatch/auto"
 *
 * Manual API:
 *   import { startTermiwatch, stopTermiwatch } from "termiwatch"
 *   const nw = startTermiwatch()
 *   const metrics = nw.collectMetrics()
 *   stopTermiwatch()
 *
 * CLI wrapper (zero code changes):
 *   npx termiwatch app.js
 */

export { Termiwatch, startTermiwatch, stopTermiwatch, getTermiwatch } from './collector';
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
  TermiwatchConfig,
  DashboardView,
} from './types';
