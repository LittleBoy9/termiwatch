export interface RuntimeInfo {
  runner: string;      // 'nodemon' | 'pm2' | 'tsx' | 'ts-node' | 'node --watch' | 'bun' | 'deno' | 'direct'
  detected: boolean;
  details: string;     // extra info like 'watching 3 files' or 'cluster mode'
}

let cachedResult: RuntimeInfo | null = null;

export function detectRuntime(): RuntimeInfo {
  if (cachedResult) return cachedResult;

  // PM2
  if (process.env.PM2_HOME || process.env.pm_id !== undefined) {
    const instanceId = process.env.pm_id || '0';
    const name = process.env.name || process.env.pm_exec_path || '';
    const mode = process.env.exec_mode || '';
    const details = `instance #${instanceId}${mode ? ` (${mode})` : ''}${name ? ` ${name}` : ''}`;
    cachedResult = { runner: 'pm2', detected: true, details };
    return cachedResult;
  }

  // Nodemon
  if (process.env.NODEMON === 'true' || process.env.NODEMON_OPTS !== undefined) {
    cachedResult = { runner: 'nodemon', detected: true, details: '' };
    return cachedResult;
  }

  // tsx
  if (process.env.TSX === '1' || hasInExecArgv('tsx')) {
    cachedResult = { runner: 'tsx', detected: true, details: '' };
    return cachedResult;
  }

  // ts-node
  if (process.env.TS_NODE_DEV !== undefined || hasInRequireCache('ts-node')) {
    cachedResult = { runner: 'ts-node', detected: true, details: '' };
    return cachedResult;
  }

  // Node.js --watch mode (v18.11+)
  if (process.execArgv.some((a) => a === '--watch' || a.startsWith('--watch-path'))) {
    cachedResult = { runner: 'node --watch', detected: true, details: 'built-in watch' };
    return cachedResult;
  }

  // Bun
  if (process.versions.bun) {
    cachedResult = { runner: 'bun', detected: true, details: `v${process.versions.bun}` };
    return cachedResult;
  }

  // Deno
  if ((process as any).versions?.deno) {
    cachedResult = { runner: 'deno', detected: true, details: `v${(process as any).versions.deno}` };
    return cachedResult;
  }

  cachedResult = { runner: 'direct', detected: false, details: '' };
  return cachedResult;
}

function hasInExecArgv(name: string): boolean {
  return process.execArgv.some((a) => a.includes(name));
}

function hasInRequireCache(name: string): boolean {
  const cache = require.cache || {};
  return Object.keys(cache).some(
    (k) => k.includes(`/node_modules/${name}/`) || k.includes(`\\node_modules\\${name}\\`)
  );
}

export function resetRuntimeCache(): void {
  cachedResult = null;
}
