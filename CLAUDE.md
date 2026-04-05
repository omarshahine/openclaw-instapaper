# openclaw-instapaper

OpenClaw plugin for Instapaper reading list management. Wraps the `instapaper-cli` Go binary.

## Project Structure

- `src/index.ts` — Plugin entry using `definePluginEntry` from OpenClaw SDK
- `lib/schema.ts` — TypeBox parameter schemas for 16 tools
- `lib/handler.ts` — Tool handler implementations (all CLI-based)
- `lib/cli-runner.ts` — `execFile` wrapper for instapaper-cli binary
- `lib/types.ts` — TypeScript interfaces for CLI output
- `skills/instapaper/SKILL.md` — Skill definition for OpenClaw discovery
- `openclaw.plugin.json` — Plugin manifest (id: `instapaper-cli`)
- `marketplace.json` — ClawHub marketplace metadata

## External Dependency

This plugin requires the `instapaper-cli` binary (Go):
- Install: `brew tap vburojevic/tap && brew install instapaper-cli`
- Binary path: `/opt/homebrew/bin/instapaper-cli` (Apple Silicon)
- Auth tokens stored in: `~/.config/ip/`
- Source: https://github.com/vburojevic/instapaper-cli

## CLI Flag Syntax

The CLI uses Go's `flag` package with mixed syntax:
- **Global flags** (before subcommand): `--json`, `--ndjson`, `--plain`, `--format`, `--verbose`, `--dry-run`
- **Subcommand flags** (after subcommand): `-folder`, `-limit`, `-tags`, `-input`, `-out`, `-select`

Example: `instapaper-cli --json list -folder unread -limit 10`

## Publishing to ClawHub

### Prerequisites

- `clawhub` CLI installed: `npm install -g clawhub`
- Authenticated: `clawhub login` (browser OAuth flow)
- Verify: `clawhub whoami`

### Publish Script (preferred)

```bash
./publish-clawhub.sh --changelog "summary of changes"
```

### Manual Publish Command

```bash
clawhub package publish . \
  --family code-plugin \
  --name instapaper-cli \
  --display-name Instapaper \
  --version <version from package.json> \
  --changelog "<summary of changes>" \
  --tags "latest" \
  --source-repo omarshahine/openclaw-instapaper \
  --source-commit $(git rev-parse HEAD) \
  --source-ref main
```

### Verify Publication

```bash
clawhub package inspect instapaper-cli
```

### Install (end user)

```bash
openclaw plugins install instapaper-cli
```

### Install (local dev, symlink)

```bash
openclaw plugins install -l ~/GitHub/openclaw-instapaper
```

## SDK Patterns

- Entry point uses `definePluginEntry` from `openclaw/plugin-sdk/plugin-entry`
- Parameter schemas use `@sinclair/typebox` `Type.Object()` (not plain JSON Schema)
- Tool results must include `details: null` (not `undefined`, which `JSON.stringify` drops)
- `openclaw` is a `peerDependency` (provided by host runtime), not a regular dependency
- Tool `label` field should be human-readable (e.g. "Instapaper List", not "instapaper_list")
- Manifest `configSchema` must include `additionalProperties: false`
- All tools shell out to `instapaper-cli` via `execFile` with env vars injected

## Authentication Flow

Two layers, both required:

1. **Consumer credentials** (app-level): `INSTAPAPER_CONSUMER_KEY` + `INSTAPAPER_CONSUMER_SECRET`
   - Configured via plugin config, env vars, or macOS Keychain
   - Passed to CLI via `execFile` env option (never in shell history)

2. **OAuth tokens** (user-level): Stored in `~/.config/ip/`
   - Created by one-time `instapaper-cli auth login -username EMAIL -password-stdin`
   - Persists indefinitely, shared across all consumers of the CLI
