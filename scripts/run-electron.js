'use strict';

const { spawn } = require('child_process');
const electron = require('electron');

// Extract optional overrides while preserving passthrough args for Electron.
const rawArgs = process.argv.slice(2);
let nodeEnvOverride;
const electronArgs = [];

for (const arg of rawArgs) {
  if (arg.startsWith('--node-env=')) {
    nodeEnvOverride = arg.split('=')[1];
  } else if (arg.length > 0) {
    electronArgs.push(arg);
  }
}

const env = { ...process.env };

if (nodeEnvOverride) {
  env.NODE_ENV = nodeEnvOverride;
}

// Ensure Electron does not start in bare Node mode.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, electronArgs.length ? electronArgs : ['.'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('Failed to launch Electron:', error);
  process.exit(1);
});
