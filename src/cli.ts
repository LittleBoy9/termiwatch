#!/usr/bin/env node

/**
 * CLI wrapper: npx nodewatcher app.js [args...]
 *
 * Spawns the target script with nodewatcher/auto preloaded via --require.
 * Zero code changes needed in the target app.
 */

import { spawn } from 'child_process';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  printUsage();
  process.exit(0);
}

if (args[0] === '--version' || args[0] === '-v') {
  console.log('nodewatcher v1.0.0');
  process.exit(0);
}

const targetScript = args[0];
const targetArgs = args.slice(1);

// Resolve the auto-preload script path
const autoPreload = path.resolve(__dirname, 'auto.js');

// Build node args: preload nodewatcher, then run the target
const nodeArgs = [
  '--require', autoPreload,
  targetScript,
  ...targetArgs,
];

// Spawn with inherited stdio for full terminal passthrough
const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  env: { ...process.env, NODEWATCHER_CLI: '1' },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});

child.on('error', (err) => {
  console.error(`nodewatcher: failed to start "${targetScript}": ${err.message}`);
  process.exit(1);
});

// Forward signals to child
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(sig, () => {
    child.kill(sig);
  });
}

function printUsage(): void {
  console.log(`
  ${'\x1b[1m\x1b[96m'}⚡ nodewatcher${'\x1b[0m'} — Zero-config terminal dashboard for Node.js

  ${'\x1b[1m'}Usage:${'\x1b[0m'}
    nodewatcher <script.js> [args...]    Run with dashboard overlay
    nodewatcher --help                   Show this help
    nodewatcher --version                Show version

  ${'\x1b[1m'}Examples:${'\x1b[0m'}
    nodewatcher server.js
    nodewatcher app.js --port 3000
    npx nodewatcher ./dist/index.js

  ${'\x1b[1m'}Programmatic:${'\x1b[0m'}
    import "nodewatcher/auto"            One-line auto-start
    import { startNodewatch } from "nodewatcher"

  ${'\x1b[1m'}In dashboard:${'\x1b[0m'}
    Tab    Switch views (Overview / Memory / HTTP / Logs)
    q      Quit
`);
}
