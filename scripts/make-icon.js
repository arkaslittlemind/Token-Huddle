// Writes build/icon.ico from the code-drawn mark, for the installer and the
// .exe. Run by `npm run dist`; the file is generated, not tracked.
const fs = require('node:fs');
const path = require('node:path');
const { iconPixels } = require('../src/main/icon');
const { encodeIco } = require('./ico');

const SIZES = [16, 24, 32, 48, 64, 128, 256];
const out = path.join(__dirname, '..', 'build', 'icon.ico');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, encodeIco(SIZES.map((size) => iconPixels(size, 'tile'))));
console.log(`Wrote ${path.relative(process.cwd(), out)} (${SIZES.join(', ')} px)`);
