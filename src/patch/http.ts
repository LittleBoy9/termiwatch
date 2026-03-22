import type * as httpType from 'http';
import { HttpMetrics } from '../types';

// Use require() to get the mutable module objects (not TS namespace wrappers)
// This is essential for monkey-patching to work
const http: any = require('http');
const https: any = require('https');

export class HttpPatcher {
  private totalRequests = 0;
  private activeRequests = 0;
  private responseTimes: number[] = [];
  private statusCodes: Record<number, number> = {};
  private history: number[] = [];
  private historySize: number;
  private lastCollectTime = Date.now();
  private requestsSinceLastCollect = 0;
  private patched = false;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  patch(): void {
    if (this.patched) return;
    this.patched = true;

    this.wrapCreateServer(http);
    this.wrapCreateServer(https);
  }

  private wrapCreateServer(mod: any): void {
    const self = this;
    const original = mod.createServer;

    const patchedCreateServer = function (
      this: any,
      ...args: any[]
    ) {
      const handlerIndex = args.findIndex(
        (a: any) => typeof a === 'function'
      );

      if (handlerIndex !== -1) {
        const originalHandler = args[handlerIndex];
        args[handlerIndex] = function (
          req: httpType.IncomingMessage,
          res: httpType.ServerResponse
        ) {
          const start = process.hrtime.bigint();
          self.totalRequests++;
          self.activeRequests++;
          self.requestsSinceLastCollect++;

          const onFinish = () => {
            const durationMs =
              Number(process.hrtime.bigint() - start) / 1e6;
            self.activeRequests--;
            self.responseTimes.push(durationMs);
            if (self.responseTimes.length > 1000) {
              self.responseTimes.shift();
            }

            const code = res.statusCode;
            self.statusCodes[code] = (self.statusCodes[code] || 0) + 1;

            res.removeListener('finish', onFinish);
            res.removeListener('close', onFinish);
          };

          res.on('finish', onFinish);
          res.on('close', onFinish);

          return originalHandler.call(this, req, res);
        };
      }

      return original.apply(this, args as any);
    };

    // Use Object.defineProperty to handle modules with read-only exports
    try {
      Object.defineProperty(mod, 'createServer', {
        value: patchedCreateServer,
        writable: true,
        configurable: true,
      });
    } catch {
      // If defineProperty fails, try direct assignment as fallback
      try {
        (mod as any).createServer = patchedCreateServer;
      } catch {
        // Module is frozen/sealed — skip patching this module
      }
    }
  }

  collect(): HttpMetrics {
    const now = Date.now();
    const elapsed = (now - this.lastCollectTime) / 1000; // seconds
    const rps =
      elapsed > 0
        ? Math.round((this.requestsSinceLastCollect / elapsed) * 10) / 10
        : 0;

    this.lastCollectTime = now;
    this.requestsSinceLastCollect = 0;

    this.history.push(rps);
    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) /
          this.responseTimes.length
        : 0;

    return {
      totalRequests: this.totalRequests,
      requestsPerSecond: rps,
      activeRequests: this.activeRequests,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      statusCodes: { ...this.statusCodes },
      history: [...this.history],
    };
  }
}
