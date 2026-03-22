<p align="center">
  <br>
  <b style="font-size: 2em;">⚡ nodewatch</b>
  <br>
  <em>Zero-config terminal dashboard for Node.js — one line, real-time, zero dependencies.</em>
  <br><br>
  <a href="https://www.npmjs.com/package/nodewatch"><img src="https://img.shields.io/npm/v/nodewatch?style=flat-square&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/nodewatch"><img src="https://img.shields.io/npm/dm/nodewatch?style=flat-square" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/nodewatch?style=flat-square" alt="license"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square" alt="zero dependencies">
  <img src="https://img.shields.io/node/v/nodewatch?style=flat-square" alt="node version">
</p>

<br>

<pre align="center">
 ⚡ nodewatch  │ ● RUNNING │ PID 1234 │ v20.10.0 │ ↑ 2h 14m │ express 4.21.0 │ ✔ 0 errors
 <b>Overview</b>  Memory & GC   HTTP   Network & Workers   Logs                         ← Tab →
┌──────────────── CPU ────────────────┐┌──────────────── MEMORY ─────────────┐
│ <b>12.4%</b> usr:9.1%  sys:3.3%           ││ <b>RSS</b> 84.2MB  <b>Heap</b> 28.1/52.0MB       │
│                                     ││ Ext 2.1MB  Buf 128KB               │
│ ⣿⣷⣶⣤⣄⡀⠀⠀⠀⣠⣤⣶⣿⣿⣷⣶⣤⣄⡀⠀⠀⠀⣠⣤⣶⣿ ││ ⣿⣷⣶⣤⣄⡀⠀⠀⠀⣠⣤⣶⣿⣿⣷⣶⣤⣄⡀⠀⠀⣶⣿ │
│ ⣿⣿⣿⣿⣿⣿⣷⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣶⣿⣿⣿⣿ ││ ⣿⣿⣿⣿⣿⣿⣷⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣶⣿⣿ │
│                                     ││                                     │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ ││ ███████████████░░░░░░░░░░░░░░░░░░░░ │
├──────────── EVENT LOOP ─────────────┤├──────────────── GC ─────────────────┤
│ <b>1.24ms</b> p99:2.31ms  min:0.8  max:4.1││ <b>142</b> pauses  avg:0.4ms  max:12.1ms   │
│ ELU <b>8%</b> ████░░░░░░░░░░░░░░░░        ││ minor:128 major:8 incremental:6     │
│                                     ││                                     │
│ ▁▁▂▂▃▃▄▄▅▆▆▇▇██▇▇▆▅▅▄▃▃▂▂▁▁▁▂▂▃▃ ││ ▁▁▁▁▁▁▁▁▁▂▁▁▁▁▁▁▁▁█▁▁▁▁▁▁▁▁▁▁▁▁▁ │
├──────────────── HTTP ───────────────┤├──────────── SYSTEM ──────────────────┤
│ <b>847</b> req/s  total:24381  avg:1.2ms   ││ <b>Handles</b> 12 ~ stable                  │
│ 200:23104 304:892 500:42            ││ <b>Heap</b> 52MB/4.1GB  malloc:1.2MB        │
│                                     ││ ████████████████████                  │
│ ▅▆▇█▇▆▅▄▃▃▄▅▆▇█▇▆▅▄▃▃▄▅▆▇█▇▆▅▄▃▃ ││ ■new ■old ■code ■large               │
├────────────────── LOGS ─────────────┴──────────────────────────────────────┤
│ 14:23:01 LOG [app] Request batch #847 processed                           │
│ 14:23:04 LOG [app] Cache cleared, 42 items evicted                        │
│ 14:23:07 ERR [app] Connection timeout to redis:6379                       │
│ 14:23:10 LOG [app] Health check OK - 12ms                                 │
└───────────────────────────────────────────────────────────────────────────┘
 Tab switch view  q exit  nodewatch v1.0.0
</pre>

<br>

## Why nodewatch?

Most Node.js monitoring tools are either **dead**, **heavy**, or **require external services**:

| Tool | Status | Dependencies | Setup |
|------|--------|-------------|-------|
| nodejs-dashboard | Archived (2022) | blessed, socket.io | Global install + wrapper |
| clinic.js | Dead (3 years) | Native compilation | CLI profiling sessions |
| appmetrics-dash | Dead (6 years) | C++ native addon | Code changes + browser |
| PM2 monit | Active | Entire PM2 ecosystem | Full process manager |
| **nodewatch** | **Active** | **Zero** | **One line** |

**nodewatch** gives you Datadog-level metrics in your terminal with zero setup:

- **One line** — `import "nodewatch/auto"` and you're done
- **Zero dependencies** — custom ANSI renderer, no native addons, nothing to break
- **14 metric categories** — CPU, memory, event loop, GC pauses, heap spaces, HTTP, network I/O, DNS, worker threads, and more
- **5 dashboard views** — Tab to cycle between Overview, Memory, HTTP, Network, and Logs
- **Production safe** — unref'd timers, TTY detection, alt-screen buffer
- **428 KB** total package size

<br>

## Quick Start

### Install

```bash
npm install nodewatch
```

### Use (pick one)

**Option 1 — One line** (recommended)

```js
import "nodewatch/auto"

// ... your app code below. That's it.
```

**Option 2 — CLI wrapper** (zero code changes)

```bash
npx nodewatch server.js
```

**Option 3 — Manual API**

```js
import { startNodewatch, stopNodewatch } from "nodewatch"

const nw = startNodewatch({ refreshInterval: 500 })

// Later...
const metrics = nw.collectMetrics()
stopNodewatch()
```

<br>

## Dashboard Views

Press **Tab** to cycle between views, **Shift+Tab** to go back.

### 1. Overview

Everything at a glance — CPU and memory with braille-resolution sparklines, event loop delay + ELU, GC pause tracking, HTTP req/s, handle leak detection, and live logs.

### 2. Memory & GC

Deep-dive into memory — full-width braille chart, per-heap-space breakdown (new/old/code/large object), GC pause detail by kind (minor/major/incremental), and a handle leak monitor with trend detection.

### 3. HTTP

Request throughput — large braille chart of req/s over time, per-status-code breakdown with bars, event loop health, and CPU usage.

### 4. Network & Workers

Network I/O — active TCP sockets with bytes read/written, DNS lookup timing, worker thread monitoring (per-thread ELU and heap), and async activity levels.

### 5. Logs

Full-screen log viewer — all captured stdout/stderr/errors with timestamps, color-coded by type, with stats bar.

<br>

## What It Tracks

| Category | Metrics | Source |
|----------|---------|--------|
| **CPU** | Usage %, user/system split, history | `process.cpuUsage()` |
| **Memory** | RSS, heap used/total, external, array buffers | `process.memoryUsage()` |
| **Event Loop** | Mean delay, p99, min, max | `perf_hooks.monitorEventLoopDelay()` |
| **ELU** | Event loop utilization (0-100%) | `performance.eventLoopUtilization()` |
| **GC** | Pause count, avg/max duration, frequency, kind | `PerformanceObserver({ entryTypes: ['gc'] })` |
| **Heap Spaces** | Per-space size/used/available (new, old, code...) | `v8.getHeapSpaceStatistics()` |
| **Handles** | Active count, by type, leak trend | `process._getActiveHandles()` |
| **HTTP** | Req/s, total, active, avg latency, status codes | Monkey-patches `http.createServer` |
| **Network** | Active sockets, bytes read/written, socket table | Socket stats from active handles |
| **DNS** | Lookup timing, average resolution time | `PerformanceObserver({ entryTypes: ['dns'] })` |
| **Workers** | Per-thread ELU, heap used/total, status | `worker.performance.eventLoopUtilization()` |
| **Async** | Active handles count, pending I/O requests | `process._getActiveHandles/Requests()` |
| **Framework** | Auto-detect Express, Fastify, Koa, Hapi, NestJS, Next | `require.cache` inspection |
| **Runtime** | Detect nodemon, PM2, tsx, ts-node, --watch, Bun, Deno | Environment variable checks |

<br>

## Auto-Detection

nodewatch automatically detects your framework and runtime environment — no config needed.

**Frameworks:** Express, Fastify, Koa, Hapi, NestJS, Next.js

**Runtimes:** nodemon, PM2 (with instance ID and cluster mode), tsx, ts-node, `node --watch`, Bun, Deno

Detected framework and runtime are shown as badges in the dashboard header:

```
⚡ nodewatch │ ● RUNNING │ PID 1234 │ v20.10.0 │ ↑ 2h │ express 4.21.0 │ nodemon
```

<br>

## API Reference

### `startNodewatch(config?)`

Start monitoring and return the `Nodewatch` instance.

```ts
const nw = startNodewatch({
  refreshInterval: 1000,  // ms between updates (default: 1000)
  historySize: 60,        // data points for sparklines (default: 60)
  patchHttp: true,        // track HTTP requests (default: true)
  patchConsole: true,     // capture console output (default: true)
  showDashboard: true,    // render terminal UI (default: true)
})
```

### `stopNodewatch()`

Stop monitoring, restore console, clean up.

```ts
stopNodewatch()
```

### `getNodewatch()`

Get the singleton instance (useful when using `nodewatch/auto`).

```ts
import "nodewatch/auto"
import { getNodewatch } from "nodewatch"

const nw = getNodewatch()
const metrics = nw.collectMetrics()
```

### `nw.collectMetrics()`

Returns a complete `Metrics` snapshot:

```ts
const m = nw.collectMetrics()

console.log(m.cpu.usage)              // 12.4
console.log(m.memory.heapUsed)        // 29360128
console.log(m.eventLoop.p99)          // 2.31
console.log(m.eventLoop.utilization)  // 0.08
console.log(m.gc.maxPauseMs)          // 12.1
console.log(m.http.requestsPerSecond) // 847
console.log(m.network.activeSockets)  // 3
console.log(m.workers.count)          // 2
console.log(m.handles.trend)          // 'stable'
console.log(m.process.framework)      // 'express'
```

### `nw.getLogs()`

Returns captured log entries:

```ts
const logs = nw.getLogs()
// [{ timestamp: 1711234567890, message: 'Server started', type: 'stdout' }, ...]
```

<br>

## CLI Usage

```bash
# Run any Node.js script with the dashboard
npx nodewatch server.js

# Pass arguments through
npx nodewatch app.js --port 3000 --env production

# Help
npx nodewatch --help
```

The CLI wrapper uses `--require` to preload nodewatch before your code runs — zero modifications needed.

<br>

## Headless Mode

Use nodewatch for metrics collection without the dashboard:

```ts
import { startNodewatch } from "nodewatch"

const nw = startNodewatch({ showDashboard: false })

setInterval(() => {
  const m = nw.collectMetrics()
  // Send to your own monitoring, logging, or alerting system
  myLogger.info('metrics', {
    cpu: m.cpu.usage,
    memory: m.memory.heapUsed,
    eventLoopP99: m.eventLoop.p99,
    gcMaxPause: m.gc.maxPauseMs,
    rps: m.http.requestsPerSecond,
  })
}, 5000)
```

nodewatch also skips the dashboard automatically in non-TTY environments (CI, piped output, Docker logs).

<br>

## How It Works

nodewatch uses **only Node.js built-in APIs** — no native addons, no external processes:

- **Terminal UI**: Custom ANSI escape code renderer with Unicode box-drawing characters and braille sparklines (U+2800-U+28FF) for 8x resolution charts
- **HTTP tracking**: Monkey-patches `http.createServer` using the same APM technique as Datadog and New Relic
- **Console capture**: Wraps `process.stdout.write` (not `console.log`) to preserve stack traces
- **Worker monitoring**: Intercepts the `Worker` constructor via `Module._load` + `Proxy` to track threads from the main thread
- **Production safety**: All timers call `.unref()`, dashboard renders in alt-screen buffer, TTY detection prevents rendering in CI

<br>

## Requirements

- **Node.js** >= 16.0.0
- A terminal with Unicode support (virtually all modern terminals)

<br>

## FAQ

<details>
<summary><b>Does it affect my app's performance?</b></summary>

Minimal impact. Metrics collection uses Node.js built-in APIs (`process.cpuUsage()`, `perf_hooks`, `v8` module) which are designed for production use. The HTTP monkey-patch adds ~0.01ms per request. The dashboard renders in an alt-screen buffer on a 1s interval with change detection to avoid unnecessary writes. All timers are `.unref()`'d so nodewatch never keeps your process alive.

</details>

<details>
<summary><b>Does it work in production?</b></summary>

Yes. Use `showDashboard: false` in production to collect metrics without the terminal UI. The dashboard auto-disables in non-TTY environments (Docker, CI, piped output).

</details>

<details>
<summary><b>Does it break console.log?</b></summary>

No. nodewatch wraps `process.stdout.write` (not `console.log` directly), so stack traces, source locations, and debugger integration are preserved. When the dashboard is visible, console output is captured and shown in the Logs panel. When the dashboard exits, original behavior is restored.

</details>

<details>
<summary><b>Does it work with Express / Fastify / Koa?</b></summary>

Yes. nodewatch auto-detects your framework and patches `http.createServer` at the Node.js level, so it works with any framework that uses Node's built-in HTTP server — which is all of them.

</details>

<details>
<summary><b>Does it work with worker threads?</b></summary>

Yes. nodewatch intercepts the `Worker` constructor and monitors each thread's event loop utilization and heap usage from the main thread — no code changes in your workers needed. Just make sure nodewatch is imported before `worker_threads`.

</details>

<details>
<summary><b>Can I use it with PM2 / nodemon / tsx?</b></summary>

Yes. nodewatch detects these runtimes automatically and shows them in the dashboard header. For PM2, it shows the instance ID and cluster mode.

</details>

<br>

## License

[MIT](LICENSE)
