// Which download the page offers, from GitHub's "latest release" answer.
// Pure, so it is tested without a network; the page script does the request.

const REPO = 'arkaslittlemind/token-huddle';
export const REPO_URL = `https://github.com/${REPO}`;
export const FALLBACK_URL = `${REPO_URL}/releases/latest/download/Token-Huddle-Setup.exe`;
export const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

/** What the Download links become. */
export type Pick =
  | { kind: 'release'; version: string; installer: string; portable: string | null; page: string | null }
  /** Anything else: keep the direct latest installer link. */
  | { kind: 'fallback' };

const RELEASES = `${REPO_URL}/releases/`;
const INSTALLER = /^Token-Huddle-Setup-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.exe$/;
const PORTABLE = /^Token-Huddle-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?-portable\.exe$/;
const VERSION = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A link only if it stays inside this repository's releases. */
const ownLink = (value: unknown): string | null =>
  typeof value === 'string' && value.startsWith(RELEASES) ? value : null;

function assetUrl(assets: unknown[], name: RegExp): string | null {
  for (const asset of assets) {
    if (isRecord(asset) && typeof asset['name'] === 'string' && name.test(asset['name'])) {
      return ownLink(asset['browser_download_url']);
    }
  }
  return null;
}

/**
 * @param status HTTP status of GET /repos/{owner}/{repo}/releases/latest
 * @param body   the parsed JSON body, untrusted
 */
export function pickDownload(status: number, body: unknown): Pick {
  if (status !== 200 || !isRecord(body)) return { kind: 'fallback' };

  const tag = body['tag_name'];
  const assets = body['assets'];
  const version = typeof tag === 'string' ? VERSION.exec(tag)?.[1] : undefined;
  if (!version || !Array.isArray(assets)) return { kind: 'fallback' };

  const installer = assetUrl(assets, INSTALLER);
  if (!installer) return { kind: 'fallback' };

  return {
    kind: 'release',
    version,
    installer,
    portable: assetUrl(assets, PORTABLE),
    page: ownLink(body['html_url']),
  };
}
