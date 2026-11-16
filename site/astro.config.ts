import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// The app's repository root: the site reads the brand (tokens.css, fonts,
// mark.js) from ../src/renderer instead of keeping copies.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  site: 'https://tokenhuddle.arkaslittlemind.com',
  output: 'static',
  security: {
    // A <meta> policy with hashes for Astro's own scripts and styles.
    // Works in build and preview only, not in the dev server.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        'connect-src https://api.github.com',
        "base-uri 'self'",
        "form-action 'none'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: { fs: { allow: [repoRoot] } },
  },
});
