# Security

Token Huddle reads data that other tools keep on your machine, so security reports are taken seriously.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting instead: on the repository page, go to **Security → Report a vulnerability**.

Include what you found, how to reproduce it, and the version or commit you tested. You can expect a first reply within a week.

## What the app touches

- It never reads, stores or sends any tool's login token or credential file.
- It makes no network calls of its own, with one exception: the installed and portable app check this project's GitHub Releases for a newer version ("Check for updates" turns this off). That request sends no personal data; GitHub sees an ordinary download request. An update is downloaded and installed only when you click, and checked against the SHA-512 in the release's `latest.yml`. Builds are not code-signed; check a download against the release's `SHA256SUMS.txt` (see [docs/code-signing.md](docs/code-signing.md)).
- For live Codex limits it starts the installed `codex` program and asks it; Codex makes that call with its own login. "Local files only" turns this off.
- It reads Codex's session logs and OpenCode's database, read only.
- When you choose **Connect** for Claude Code, and only then, it adds one `statusLine` entry to Claude Code's `settings.json` after showing you the exact change, and keeps a backup of the file. **Disconnect** removes the entry. The status line script saves your usage percentages and reset times, nothing else.
- There is no telemetry.

A change that breaks any of these is a security bug.
