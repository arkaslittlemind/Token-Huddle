// The provider registry. Adding an agent means adding one file and one line here.
//
// A provider is a plain object:
//
//   id        unique, lowercase; saved in the user's settings
//   name      shown on the card
//   accent    colour of the card's dot
//   about     one sentence on where the numbers come from; shown as-is in
//             the first-run welcome
//   connect   how it gets access. 'auto' = reads a data file that the tool
//             itself already keeps on this machine. 'bridge' = the tool hands
//             data over once the user connects it (see `connection`). A bridge
//             provider may also supply automatic local stats before connection.
//   connection  bridge only: { status, plan, connect, disconnect, link? }
//             status(context) -> { state, detail }, state one of 'connected' |
//             'linked' | 'disconnected' | 'conflict' | 'unsupported' | 'error'.
//             link(context) is optional -> { prefix, file }: text the user adds
//             to their own tool settings by hand; it changes none of them.
//   detect(options)  -> Promise<boolean>. Is this tool present?
//   read(context)    -> Promise<Reading>. Current usage.
//
// `options` belongs to one account of the provider (for example a non-default
// config folder), so one provider can back several cards.
//
// read() receives { options, cache, localOnly, force, now }:
//   cache      an object kept for this account between reads; providers keep
//              their last good reading and fetch times here, never in module
//              variables, so accounts do not share state
//   localOnly  true = make no network calls
//   force      true = the user pressed refresh; shorten any cache
//
// A Reading is:
//   state      'ok' | 'stale' | 'error' | 'missing'
//   source     'live' (from the vendor just now) | 'local' (from the tool's own
//              files) | 'estimated' (computed here)
//   plan       optional plan name, e.g. 'Pro'
//   updatedAt  ms timestamp of the data
//   windows    [{ id, label, short, windowMs, usedPercent, resetsAt }]
//   quotaUpdatedAt / quotaState  optional separate status-line freshness for mixed Claude readings
//   stats      optional [{ label, value }]
//   spark      optional number[] for a small bar chart
//   message    optional one-line note or error
//
// Providers do not need to be careful about the Reading shape: instances.js
// validates and repairs every reading before it reaches the widget.

const providers = [require('./claude'), require('./codex'), require('./opencode')];

const byId = new Map(providers.map((provider) => [provider.id, provider]));

module.exports = { providers, get: (id) => byId.get(id) };
