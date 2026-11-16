import { describe, expect, it } from 'vitest';
import { FALLBACK_URL, REPO_URL, pickDownload } from './download';

const base = 'https://github.com/arkaslittlemind/token-huddle/releases/download/v0.1.0';

/** A release as the GitHub API returns it, trimmed to the fields the page reads. */
const release = (overrides: Record<string, unknown> = {}) => ({
  tag_name: 'v0.1.0',
  html_url: 'https://github.com/arkaslittlemind/token-huddle/releases/tag/v0.1.0',
  assets: [
    { name: 'Token-Huddle-Setup-0.1.0.exe', browser_download_url: `${base}/Token-Huddle-Setup-0.1.0.exe` },
    {
      name: 'Token-Huddle-Setup-0.1.0.exe.blockmap',
      browser_download_url: `${base}/Token-Huddle-Setup-0.1.0.exe.blockmap`,
    },
    { name: 'Token-Huddle-0.1.0-portable.exe', browser_download_url: `${base}/Token-Huddle-0.1.0-portable.exe` },
    { name: 'latest.yml', browser_download_url: `${base}/latest.yml` },
    { name: 'SHA256SUMS.txt', browser_download_url: `${base}/SHA256SUMS.txt` },
  ],
  ...overrides,
});

describe('pickDownload', () => {
  it('picks the installer, the portable build and the release page from a published release', () => {
    expect(pickDownload(200, release())).toEqual({
      kind: 'release',
      version: '0.1.0',
      installer: `${base}/Token-Huddle-Setup-0.1.0.exe`,
      portable: `${base}/Token-Huddle-0.1.0-portable.exe`,
      page: 'https://github.com/arkaslittlemind/token-huddle/releases/tag/v0.1.0',
    });
  });

  it('never picks the blockmap, even when it is listed first', () => {
    const body = release();
    body.assets = [...body.assets].reverse();
    const pick = pickDownload(200, body);
    expect(pick.kind === 'release' && pick.installer.endsWith('.exe')).toBe(true);
  });

  it('works without a portable build or a release page', () => {
    const body = release({ html_url: undefined });
    body.assets = body.assets.filter((a) => !a.name.includes('portable'));
    expect(pickDownload(200, body)).toMatchObject({ kind: 'release', portable: null, page: null });
  });

  it('says there is no release yet on 404', () => {
    expect(pickDownload(404, { message: 'Not Found' })).toEqual({ kind: 'none' });
  });

  it('falls back on a rate limit or any other status', () => {
    expect(pickDownload(403, { message: 'API rate limit exceeded' })).toEqual({ kind: 'fallback' });
    expect(pickDownload(500, null)).toEqual({ kind: 'fallback' });
  });

  it('falls back when the release has no installer', () => {
    const body = release();
    body.assets = body.assets.filter((a) => !a.name.startsWith('Token-Huddle-Setup-'));
    expect(pickDownload(200, body)).toEqual({ kind: 'fallback' });
  });

  it('falls back on a body it cannot read', () => {
    for (const body of [null, undefined, 'text', 42, [], {}, { tag_name: 1, assets: 'x' }]) {
      expect(pickDownload(200, body)).toEqual({ kind: 'fallback' });
    }
  });

  it('never links outside this repository', () => {
    const body = release();
    body.assets = body.assets.map((a) => ({
      ...a,
      browser_download_url: a.browser_download_url.replace('arkaslittlemind/token-huddle', 'someone/else'),
    }));
    expect(pickDownload(200, body)).toEqual({ kind: 'fallback' });

    const page = pickDownload(200, release({ html_url: 'javascript:alert(1)' }));
    expect(page).toMatchObject({ kind: 'release', page: null });
  });

  it('keeps a version without a leading v and rejects one that is not a version', () => {
    expect(pickDownload(200, release({ tag_name: '0.1.0' }))).toMatchObject({ version: '0.1.0' });
    expect(pickDownload(200, release({ tag_name: '<img src=x>' }))).toEqual({ kind: 'fallback' });
  });
});

describe('links', () => {
  it('point at this repository', () => {
    expect(REPO_URL).toBe('https://github.com/arkaslittlemind/token-huddle');
    expect(FALLBACK_URL).toBe(`${REPO_URL}/releases/latest/download/Token-Huddle-Setup.exe`);
  });
});
