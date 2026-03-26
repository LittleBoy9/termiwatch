import { LogEntry } from '../types';

export class ConsolePatcher {
  private logs: LogEntry[] = [];
  private maxLogs: number;
  private patched = false;
  private originalStdoutWrite: typeof process.stdout.write | null = null;
  private originalStderrWrite: typeof process.stderr.write | null = null;
  private errorCount = 0;
  private _suppressOutput = false;

  constructor(maxLogs: number = 200) {
    this.maxLogs = maxLogs;
  }

  set suppressOutput(value: boolean) {
    this._suppressOutput = value;
  }

  patch(): void {
    if (this.patched) return;
    this.patched = true;

    this.originalStdoutWrite = process.stdout.write.bind(process.stdout);
    this.originalStderrWrite = process.stderr.write.bind(process.stderr);

    const self = this;

    process.stdout.write = function (
      chunk: any,
      encodingOrCallback?: any,
      callback?: any
    ): boolean {
      const str = typeof chunk === 'string' ? chunk : chunk.toString();

      // Don't capture our own dashboard output
      if (!str.includes('\x1b[termiwatch]')) {
        self.addLog(str, 'stdout');
      }

      if (self._suppressOutput) {
        // Still call callback if provided
        const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        if (cb) cb();
        return true;
      }

      return self.originalStdoutWrite!(chunk, encodingOrCallback, callback);
    } as any;

    process.stderr.write = function (
      chunk: any,
      encodingOrCallback?: any,
      callback?: any
    ): boolean {
      const str = typeof chunk === 'string' ? chunk : chunk.toString();

      if (!str.includes('\x1b[termiwatch]')) {
        self.addLog(str, 'stderr');
        self.errorCount++;
      }

      if (self._suppressOutput) {
        const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        if (cb) cb();
        return true;
      }

      return self.originalStderrWrite!(chunk, encodingOrCallback, callback);
    } as any;

    // Capture uncaught errors
    process.on('uncaughtException', (err) => {
      self.addLog(`Uncaught Exception: ${err.message}\n${err.stack}`, 'error');
      self.errorCount++;
    });

    process.on('unhandledRejection', (reason) => {
      const msg = reason instanceof Error ? reason.message : String(reason);
      self.addLog(`Unhandled Rejection: ${msg}`, 'error');
      self.errorCount++;
    });
  }

  private addLog(message: string, type: LogEntry['type']): void {
    const trimmed = message.replace(/\n$/, '');
    if (!trimmed) return;

    this.logs.push({
      timestamp: Date.now(),
      message: trimmed,
      type,
    });

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  /** Write directly to stdout, bypassing the patch */
  rawWrite(data: string): void {
    if (this.originalStdoutWrite) {
      this.originalStdoutWrite(data);
    } else {
      process.stdout.write(data);
    }
  }

  restore(): void {
    if (!this.patched) return;
    if (this.originalStdoutWrite) {
      process.stdout.write = this.originalStdoutWrite as any;
    }
    if (this.originalStderrWrite) {
      process.stderr.write = this.originalStderrWrite as any;
    }
    this.patched = false;
  }
}
