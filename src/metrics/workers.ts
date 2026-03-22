import { WorkerMetrics, WorkerInfo } from '../types';

/**
 * Worker Thread Monitor
 *
 * Uses Module._load interception to wrap the Worker constructor before
 * user code accesses it. Also patches already-loaded module cache.
 * Reads per-worker ELU + heap stats from the main thread.
 */

interface TrackedWorker {
  threadId: number;
  worker: any;
  status: 'online' | 'exited';
  lastELU: any;
}

export class WorkerCollector {
  private tracked: Map<number, TrackedWorker> = new Map();
  private totalCreated = 0;
  private totalExited = 0;
  private eluHistory: number[] = [];
  private historySize: number;
  private patched = false;
  private OriginalWorker: any = null;

  constructor(historySize: number = 60) {
    this.historySize = historySize;
  }

  patch(): void {
    if (this.patched) return;
    this.patched = true;

    const self = this;

    try {
      // Get the real worker_threads module
      const wt = require('worker_threads');
      if (!wt.Worker) return;

      this.OriginalWorker = wt.Worker;

      // Create a Proxy-based wrapper that intercepts `new Worker(...)`
      const OrigWorker = this.OriginalWorker;
      const ProxiedWorker = new Proxy(OrigWorker, {
        construct(target, args, newTarget) {
          const instance = Reflect.construct(target, args, newTarget);
          self.trackWorker(instance);
          return instance;
        },
        // Ensure instanceof checks still work
        get(target, prop, receiver) {
          if (prop === Symbol.hasInstance) {
            return (inst: any) => inst instanceof OrigWorker;
          }
          return Reflect.get(target, prop, receiver);
        },
      });

      // Patch the module cache directly
      // Built-in modules are stored in Module._cache or the internal NativeModule
      // We need to replace Worker in the cached exports
      try {
        Object.defineProperty(wt, 'Worker', {
          value: ProxiedWorker,
          writable: true,
          configurable: true,
        });
      } catch {
        // Module exports are frozen — try patching via require.cache
        try {
          const cacheKeys = Object.keys(require.cache).filter(
            (k) => k.includes('worker_threads')
          );
          for (const key of cacheKeys) {
            const mod = require.cache[key];
            if (mod?.exports?.Worker) {
              const newExports = Object.create(Object.getPrototypeOf(mod.exports));
              Object.assign(newExports, mod.exports);
              newExports.Worker = ProxiedWorker;
              mod.exports = newExports;
            }
          }
        } catch {
          // Fall through to Module._load hook
        }
      }

      // Also hook Module._load for future requires
      const Module = require('module');
      const originalLoad = Module._load;
      Module._load = function (request: string, parent: any, isMain: boolean) {
        const result = originalLoad.call(this, request, parent, isMain);
        if (
          (request === 'worker_threads' || request === 'node:worker_threads') &&
          result.Worker === OrigWorker
        ) {
          // Return a copy with our proxied Worker
          return { ...result, Worker: ProxiedWorker };
        }
        return result;
      };
    } catch {
      this.patched = false;
    }
  }

  private trackWorker(instance: any): void {
    this.totalCreated++;

    instance.on('online', () => {
      const tracked: TrackedWorker = {
        threadId: instance.threadId,
        worker: instance,
        status: 'online',
        lastELU: null,
      };
      this.tracked.set(instance.threadId, tracked);
    });

    instance.on('exit', () => {
      const tracked = this.tracked.get(instance.threadId);
      if (tracked) {
        tracked.status = 'exited';
        this.totalExited++;
        setTimeout(() => {
          this.tracked.delete(instance.threadId);
        }, 5000);
      }
    });
  }

  async collect(): Promise<WorkerMetrics> {
    const workers: WorkerInfo[] = [];
    let totalELU = 0;
    let eluCount = 0;

    for (const [, tracked] of this.tracked) {
      const info: WorkerInfo = {
        threadId: tracked.threadId,
        utilization: 0,
        heapUsed: 0,
        heapTotal: 0,
        status: tracked.status,
      };

      if (tracked.status === 'online') {
        try {
          const perf = tracked.worker.performance;
          if (perf?.eventLoopUtilization) {
            const elu = tracked.lastELU
              ? perf.eventLoopUtilization(tracked.lastELU)
              : perf.eventLoopUtilization();
            info.utilization = Math.round(elu.utilization * 1000) / 1000;
            tracked.lastELU = perf.eventLoopUtilization();
            totalELU += info.utilization;
            eluCount++;
          }
        } catch {
          // Worker exited
        }

        try {
          if (typeof tracked.worker.getHeapStatistics === 'function') {
            const stats = await tracked.worker.getHeapStatistics();
            info.heapUsed = stats.used_heap_size || 0;
            info.heapTotal = stats.total_heap_size || 0;
          }
        } catch {
          // Not available
        }
      }

      workers.push(info);
    }

    const avgELU = eluCount > 0 ? Math.round((totalELU / eluCount) * 1000) / 1000 : 0;
    this.eluHistory.push(avgELU);
    if (this.eluHistory.length > this.historySize) {
      this.eluHistory.shift();
    }

    return {
      count: [...this.tracked.values()].filter((t) => t.status === 'online').length,
      totalCreated: this.totalCreated,
      totalExited: this.totalExited,
      workers,
      eluHistory: [...this.eluHistory],
    };
  }
}
