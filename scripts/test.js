// Runs Node's test runner with the given arguments and fails when no test ran.
// `node --test` exits 0 when its pattern matches no files, which would let an
// empty suite pass Verify and CI. A file with zero tests still counts as one
// test in Node's report, so only the no-files case can be caught here.
const { spawn } = require('node:child_process');

const ANSI_COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const terminal = process.stdout.isTTY;
const args = ['--test', ...(terminal ? ['--test-reporter=spec'] : []), ...process.argv.slice(2)];
// The child writes to a pipe, so keep the terminal's colours explicitly.
const env = terminal ? { ...process.env, FORCE_COLOR: '1' } : process.env;
const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'inherit'], env });

let output = '';
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  output += chunk;
});

child.on('close', (code) => {
  // TAP prints "# tests N", the spec reporter "ℹ tests N" (colour codes removed first).
  const plain = output.replace(ANSI_COLOUR, '');
  const tests = Number(plain.match(/^(?:# |ℹ )tests (\d+)$/m)?.[1] ?? 0);
  if (code === 0 && tests === 0) {
    console.error('No tests ran. An empty test suite does not count as a pass.');
    process.exitCode = 1;
    return;
  }
  // exitCode instead of exit(), so piped output finishes writing first.
  process.exitCode = code ?? 1;
});
