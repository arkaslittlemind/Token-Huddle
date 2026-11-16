// Loads one of the app's shared renderer files (plain CommonJS-or-global, like
// mark.js and guidance.js) at build time, so the site reuses the app's own rules
// instead of copying them. Astro builds and tests run from site/, so the app sits
// one folder up; an absolute path keeps this working after Astro bundles it.
import { createRequire } from 'node:module';
import path from 'node:path';

export function appModule<T>(file: string): T {
  return createRequire(import.meta.url)(path.resolve(process.cwd(), '..', 'src', 'renderer', file)) as T;
}
