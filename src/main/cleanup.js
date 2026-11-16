// Uninstall cleanup: leave other tools' settings as they were before Connect.
// No Electron, so it is testable under plain Node. main.js runs it when the
// uninstaller starts the app with --uninstall-cleanup.
const { sanitize } = require('./instances');

/**
 * Disconnects every saved card whose provider has a connection, using each
 * provider's own disconnect (which only removes what Token Huddle added).
 * The saved list is sanitized first, as on every normal start: card keys
 * become file names. Cards run one at a time, so two cards sharing a settings
 * file never race. One failure never stops the others.
 *
 * @param {{ instances: unknown, registry: { providers: object[], get: Function }, dataDir: string }} input
 * @returns {Promise<Array<{ key: string, ok: boolean, error?: string }>>} one entry per card tried
 */
async function disconnectAll({ instances, registry, dataDir }) {
  const results = [];
  for (const instance of sanitize(instances, registry.providers)) {
    const connection = registry.get(instance.provider)?.connection;
    if (!connection) continue;
    try {
      await connection.disconnect({ options: instance.options, key: instance.key, dataDir });
      results.push({ key: instance.key, ok: true });
    } catch (error) {
      results.push({ key: instance.key, ok: false, error: String(error?.message || error) });
    }
  }
  return results;
}

module.exports = { disconnectAll };
