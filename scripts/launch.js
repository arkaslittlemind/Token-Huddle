// Starts Electron with a clean environment.
// VS Code terminals can set ELECTRON_RUN_AS_NODE=1, which makes Electron behave
// like plain Node and fail to open a window.
const { spawn } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const [target = '.', ...rest] = process.argv.slice(2);
const child = spawn(electron, [path.resolve(__dirname, '..', target), ...rest], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
