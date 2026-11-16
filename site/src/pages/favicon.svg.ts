import { tileSvg } from '../lib/mark';

// The app icon (navy tile with the mark), drawn from src/renderer/mark.js.
export function GET(): Response {
  return new Response(tileSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
}
