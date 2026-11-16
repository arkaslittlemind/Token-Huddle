// Asks GitHub for the latest published release and points every Download link
// at it. Without JavaScript, or if anything goes wrong, the links keep their
// direct latest installer target.
import { LATEST_API, REPO_URL, pickDownload, type Pick } from '../lib/download';

const TIMEOUT_MS = 8000;

/** Updates the page for a pick. Values only reach href and textContent. */
export function apply(pick: Pick): void {
  if (pick.kind === 'fallback') return;

  const links = document.querySelectorAll<HTMLAnchorElement>('a[data-download]');
  const note = document.querySelector<HTMLElement>('[data-release-note]');
  const chip = document.querySelector<HTMLElement>('[data-release-chip]');

  if (pick.kind === 'none') {
    links.forEach((a) => (a.href = REPO_URL));
    if (note) note.textContent = 'The first release is coming soon. Follow the project on GitHub.';
    return;
  }

  links.forEach((a) => (a.href = pick.installer));
  if (chip) chip.textContent = `v${pick.version} is out · free and open source`;

  const extra = document.querySelector<HTMLElement>('[data-release-extra]');
  const portable = document.querySelector<HTMLAnchorElement>('a[data-download-portable]');
  const page = document.querySelector<HTMLAnchorElement>('a[data-release-page]');
  if (portable && pick.portable) {
    portable.href = pick.portable;
    portable.hidden = false;
  }
  if (page && pick.page) {
    page.href = pick.page;
    page.hidden = false;
  }
  if (extra && (pick.portable || pick.page)) extra.hidden = false;
  if (note) note.textContent = `Version ${pick.version} for Windows 10 and 11.`;
}

export async function init(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(LATEST_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    const body: unknown = response.status === 200 ? await response.json() : null;
    apply(pickDownload(response.status, body));
  } catch {
    // Network error, timeout or bad JSON: keep the direct installer links.
  } finally {
    clearTimeout(timer);
  }
}
