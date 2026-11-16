// Stands in for `codex app-server` in tests: speaks the same line-delimited
// JSON protocol and answers the rate-limit request with a recorded response.
//   (no argument)  answer normally
//   fail           exit before answering
//   error          answer the request with an error
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const mode = process.argv[2] || '';
if (mode === 'fail') process.exit(1);

const result = JSON.parse(fs.readFileSync(path.join(__dirname, 'codex-app-server.json'), 'utf8'));
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: { userAgent: 'fake-codex', platformOs: 'test' } });
    send({ method: 'account/updated', params: { authMode: 'chatgpt', planType: 'plus' } });
  } else if (message.method === 'account/rateLimits/read') {
    if (mode === 'error') send({ id: message.id, error: { code: -32000, message: 'not signed in' } });
    else send({ id: message.id, result });
  }
});
