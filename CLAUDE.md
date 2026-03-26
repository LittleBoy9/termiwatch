# termiwatch

Zero-config, one-line terminal dashboard for Node.js apps. Zero runtime dependencies.

## Quick Reference

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run example      # Build + run demo
npx termiwatch app.js # CLI wrapper (zero code changes)
```

## Architecture

```
src/
├── auto.ts              # Side-effect import: `import "termiwatch/auto"`
├── index.ts             # Public API re-exports
├── collector.ts         # Singleton orchestrator (Termiwatch class)
├── cli.ts               # CLI entry: `npx termiwatch app.js` (spawns child with --require)
├── types.ts             # All interfaces, config defaults, DashboardView type
├── metrics/
│   ├── cpu.ts           # process.cpuUsage() delta tracking
│   ├── memory.ts        # process.memoryUsage() + arrayBuffers
│   ├── eventloop.ts     # monitorEventLoopDelay() + eventLoopUtilization()
│   ├── gc.ts            # PerformanceObserver({ entryTypes: ['gc'] })
│   ├── heap.ts          # v8.getHeapSpaceStatistics() per-space breakdown
│   ├── handles.ts       # process._getActiveHandles() leak detection + trend
│   ├── workers.ts       # Worker constructor interception via Module._load + Proxy
│   ├── network.ts       # Socket stats from _getActiveHandles(), DNS via PerformanceObserver
│   ├── async.ts         # _getActiveHandles/Requests count (lightweight, no async_hooks)
│   └── index.ts         # Re-exports
├── detect/
│   ├── framework.ts     # Auto-detect express/fastify/koa/hapi/nestjs/next via require.cache
│   └── runtime.ts       # Detect nodemon/PM2/tsx/ts-node/--watch/bun/deno
├── patch/
│   ├── http.ts          # Monkey-patches http/https.createServer (APM-style)
│   └── console.ts       # Wraps stdout/stderr, captures uncaught errors
└── ui/
    ├── ansi.ts          # ANSI primitives: colors, box-drawing, sparklines, braille charts
    └── dashboard.ts     # Full-screen terminal UI with 5-view carousel
```

## Data Flow

```
startTermiwatch() → Termiwatch (collector.ts)
  ├── CpuCollector.collect()       → CpuMetrics
  ├── MemoryCollector.collect()    → MemoryMetrics
  ├── EventLoopCollector.collect() → EventLoopMetrics (delay + ELU)
  ├── GcCollector.collect()        → GcMetrics (pauses, kinds, frequency)
  ├── HeapCollector.collect()      → HeapSpaceMetrics (per-space breakdown)
  ├── HandleCollector.collect()    → HandleMetrics (count, types, trend)
  ├── WorkerCollector.collect()    → WorkerMetrics (per-thread ELU + heap) [async]
  ├── NetworkCollector.collect()   → NetworkMetrics (sockets, bytes, DNS)
  ├── AsyncCollector.collect()     → AsyncMetrics (handles + requests count)
  ├── HttpPatcher.collect()        → HttpMetrics
  ├── ConsolePatcher.getLogs()     → LogEntry[]
  ├── detectFramework()            → FrameworkInfo (cached)
  ├── detectRuntime()              → RuntimeInfo (cached)
  └── Dashboard.render(metrics, logs) → ANSI to terminal
```

## Three Usage Modes

1. **One-line import**: `import "termiwatch/auto"` — patches and starts immediately
2. **Manual API**: `import { startTermiwatch } from "termiwatch"` — full control
3. **CLI wrapper**: `npx termiwatch app.js` — zero code changes, uses `--require` preload

## Dashboard Views (Tab to cycle)

- **Overview**: CPU, Memory, Event Loop, GC, HTTP, System — all at once + logs
- **Memory & GC**: Full-width braille chart, per-heap-space bars, GC detail, handle leak monitor
- **HTTP**: Large req/s braille chart, status code bars, event loop detail
- **Network & Workers**: Network I/O braille, active sockets table, DNS lookups, worker threads (ELU/heap), async activity
- **Logs**: Full-screen log viewer with stats bar

## Key Design Decisions

- **Zero dependencies**: Custom ANSI renderer using Unicode box-drawing, braille sparklines (U+2800-U+28FF). No blessed, no ink.
- **HTTP patching**: Uses `require('http')` (not TS `import *`) for mutable module. `Object.defineProperty()` for modern Node.
- **Worker patching**: Uses `Module._load` interception + `Proxy` on Worker constructor. Also patches already-loaded module cache. termiwatch must be loaded BEFORE worker_threads for tracking to work (which is the natural pattern with `import "termiwatch/auto"` at file top or CLI wrapper).
- **Network monitoring**: Extracts socket stats (remoteAddress, bytesRead/Written) from `_getActiveHandles()`. DNS timing via `PerformanceObserver({ entryTypes: ['dns'] })`.
- **Async tracking**: Uses `_getActiveHandles().length` + `_getActiveRequests().length` as lightweight proxy. Avoids raw `async_hooks` which causes 30-97% overhead in Promise-heavy workloads.
- **Console patching**: Wraps `process.stdout.write` (not `console.log`). Dashboard output marked with `\x1b[termiwatch]` sentinel.
- **Production safe**: All timers `.unref()`. TTY detection. Alt-screen buffer.
- **Worker collector is async**: `worker.getHeapStatistics()` returns a Promise. Collector caches last result and updates async between ticks.

## Conventions

- Sync collectors: constructor(historySize), collect() → typed metrics, optional destroy()
- Async collectors (WorkerCollector): collect() returns Promise, results cached in collector.ts
- History arrays are rolling buffers (shift on overflow) for sparklines
- All metrics return copies (spread operator) to prevent mutation
- Colors: green (ok) → yellow (warn) → red (critical)
- Types in types.ts, never inline
- Detection results cached (call resetXxxCache() to re-scan)

## Testing

```bash
# Full headless test (all 24 checks)
node -e "..." # see test in conversation history

# Worker test (termiwatch must load first)
node -r ./dist/auto worker-app.js

# CLI wrapper test
node dist/cli.js app.js

# Dashboard demo
node examples/demo.js
```

## Gotchas

- `import * as http` creates frozen TS namespace — use `require('http')` for patching
- `monitorEventLoopDelay` returns NaN on first read — guard with hasData check
- `v8.getHeapSpaceStatistics()` uses snake_case (space_name not spaceName)
- `process._getActiveHandles()` is undocumented but stable
- GC observer entry.detail.kind is a bitmask: 1=minor, 2=major, 4=incremental, 8=weakcb
- Worker monitoring requires termiwatch loaded BEFORE worker_threads (natural with auto import or CLI)
- `worker.getHeapStatistics()` is async and may not exist in older Node versions
- DNS PerformanceObserver may not be available in all Node versions — degrades gracefully
- Module._load patching must handle both 'worker_threads' and 'node:worker_threads' prefixes
