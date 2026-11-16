# Records the raw JSON that Claude Code passes to a status line command, to
# refresh test/fixtures/claude-statusline-input.json. Used by hand only; see
# test/fixtures/README.md. The file can hold your username in paths and a real
# session id: redact it before it goes anywhere near the repository.
param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
try {
  # Claude Code sends UTF-8; read it as such so non-ASCII paths survive unchanged.
  [Console]::InputEncoding = [Text.Encoding]::UTF8
  [IO.File]::WriteAllText($OutputPath, [Console]::In.ReadToEnd())
  Write-Output 'recording'
} catch {
  # Shown in Claude Code's status line, so a bad path does not fail silently.
  Write-Output 'recording failed'
}
