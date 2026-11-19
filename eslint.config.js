const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    // Same paths Prettier skips: managed by other tooling or recorded as-is.
    // site/ is checked by its own tools (astro check, Prettier with the Astro plugin).
    ignores: [
      'blueprint/',
      '.agents/',
      '.claude/',
      '.impeccable/',
      'docs/',
      'test/fixtures/',
      'dist/',
      'coverage/',
      'site/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
    // `const { dropped, ...rest } = obj` is how this code removes a key.
    rules: { 'no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
  {
    files: ['src/main/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // The renderer is sandboxed: browser globals only, so a stray require() fails lint.
    files: ['src/renderer/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    // Shared files: the page loads them with <script>, main with require().
    files: [
      'src/renderer/mark.js',
      'src/renderer/agent-marks.js',
      'src/renderer/duration.js',
      'src/renderer/guidance.js',
    ],
    languageOptions: { globals: { ...globals.browser, module: 'readonly' } },
  },
];
