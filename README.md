# openclaw-instapaper

OpenClaw plugin for [Instapaper](https://www.instapaper.com) reading list management. Provides 16 tools for managing bookmarks, folders, highlights, tags, and article text through OpenClaw.

Built on [`instapaper-cli`](https://github.com/vburojevic/instapaper-cli), a full-featured Go CLI for the Instapaper API.

## Quick Start

```bash
# 1. Install the CLI
brew tap vburojevic/tap && brew install instapaper-cli

# 2. Set credentials (get yours at https://www.instapaper.com/main/request_oauth_consumer_token)
export INSTAPAPER_CONSUMER_KEY="your-key"
export INSTAPAPER_CONSUMER_SECRET="your-secret"

# 3. Log in (one-time)
printf '%s' "your-password" | instapaper-cli auth login -username "you@example.com" -password-stdin

# 4. Install the plugin
openclaw plugins install instapaper-cli
```

## Prerequisites

### instapaper-cli binary

The plugin wraps the `instapaper-cli` Go binary. Install via Homebrew:

```bash
brew tap vburojevic/tap && brew install instapaper-cli
```

Verify: `instapaper-cli version`

The binary installs to `/opt/homebrew/bin/instapaper-cli` on Apple Silicon Macs. Ensure this is in your PATH.

### Instapaper API credentials

Request an OAuth consumer token at https://www.instapaper.com/main/request_oauth_consumer_token

You will receive a **consumer key** and **consumer secret**. These are app-level credentials required for every API call.

### Authentication (one-time)

```bash
export INSTAPAPER_CONSUMER_KEY="your-key"
export INSTAPAPER_CONSUMER_SECRET="your-secret"
printf '%s' "your-password" | instapaper-cli auth login -username "you@example.com" -password-stdin
```

This exchanges your credentials for OAuth tokens stored locally in `~/.config/ip/`. You only need to do this once.

Verify: `instapaper-cli auth status` (should show `logged_in: true`)

Instapaper passwords are optional. If your account has no password, any value will work.

## Install

### From ClawHub

```bash
openclaw plugins install instapaper-cli
```

### Local development (symlink)

```bash
openclaw plugins install -l ~/path/to/openclaw-instapaper
```

Symlink installs stay live with `git pull` updates.

### Security note

This plugin uses Node.js `child_process.execFile` to call the `instapaper-cli` binary. OpenClaw's static analysis scanner flags this at install time. If prompted, review the source code and use:

```bash
openclaw plugins install instapaper-cli --dangerously-force-unsafe-install
```

This is expected for any CLI-wrapper plugin. The plugin never executes arbitrary commands, only calls the `instapaper-cli` binary with structured arguments.

## Configuration

The plugin needs your consumer key and secret at runtime. Configure through one of these methods:

### Option A: Environment variable (recommended)

```bash
# Add to ~/.openclaw/.env (chmod 600)
INSTAPAPER_CONSUMER_KEY=your-key
INSTAPAPER_CONSUMER_SECRET=your-secret

# Reference via env interpolation in plugin config
openclaw config set plugins.entries.instapaper-cli.config.consumerKey '${INSTAPAPER_CONSUMER_KEY}'
openclaw config set plugins.entries.instapaper-cli.config.consumerSecret '${INSTAPAPER_CONSUMER_SECRET}'
```

### Option B: SecretRef (env source)

```bash
openclaw config set plugins.entries.instapaper-cli.config.consumerKey \
  '{"source":"env","provider":"env","id":"INSTAPAPER_CONSUMER_KEY"}' --strict-json
openclaw config set plugins.entries.instapaper-cli.config.consumerSecret \
  '{"source":"env","provider":"env","id":"INSTAPAPER_CONSUMER_SECRET"}' --strict-json
```

### Option C: SecretRef (macOS Keychain)

```bash
# Store in Keychain
security add-generic-password -s 'env/INSTAPAPER_CONSUMER_KEY' -a "$USER" -w 'your-key'
security add-generic-password -s 'env/INSTAPAPER_CONSUMER_SECRET' -a "$USER" -w 'your-secret'

# Configure SecretRef
openclaw config set plugins.entries.instapaper-cli.config.consumerKey \
  '{"source":"exec","provider":"keychain","id":"env/INSTAPAPER_CONSUMER_KEY"}' --strict-json
openclaw config set plugins.entries.instapaper-cli.config.consumerSecret \
  '{"source":"exec","provider":"keychain","id":"env/INSTAPAPER_CONSUMER_SECRET"}' --strict-json
```

### Resolution order

The plugin resolves credentials from these sources (first match wins):

| Source | Details |
|--------|---------|
| Plugin config (SecretRef) | Resolved via env, file, or exec provider |
| Plugin config (string) | Direct value or `${ENV_VAR}` interpolation |
| Environment variable | `INSTAPAPER_CONSUMER_KEY` / `INSTAPAPER_CONSUMER_SECRET` |
| macOS Keychain | `env/INSTAPAPER_CONSUMER_KEY` / `env/INSTAPAPER_CONSUMER_SECRET` |

## Tools

### Bookmarks

| Tool | Description | Parameters |
|------|-------------|-----------|
| `instapaper_list` | List bookmarks | `folder`, `limit`, `tag` |
| `instapaper_add` | Save a URL | `url`, `title`, `folder`, `tags` |
| `instapaper_import` | Bulk import URLs | `urls[]`, `folder`, `tags` |
| `instapaper_archive` | Archive a bookmark | `bookmark_id` |
| `instapaper_unarchive` | Unarchive a bookmark | `bookmark_id` |
| `instapaper_star` | Star a bookmark | `bookmark_id` |
| `instapaper_unstar` | Unstar a bookmark | `bookmark_id` |
| `instapaper_move` | Move to folder | `bookmark_id`, `folder` |
| `instapaper_delete` | Permanently delete | `bookmark_id` |
| `instapaper_text` | Get article HTML | `bookmark_id` |

### Folders

| Tool | Description | Parameters |
|------|-------------|-----------|
| `instapaper_folders_list` | List all folders | (none) |
| `instapaper_folders_add` | Create a folder | `title` |
| `instapaper_folders_delete` | Delete a folder | `title` |

### Highlights & Tags

| Tool | Description | Parameters |
|------|-------------|-----------|
| `instapaper_highlights_list` | List highlights for a bookmark | `bookmark_id` |
| `instapaper_highlights_add` | Add a highlight | `bookmark_id`, `text` |
| `instapaper_tags_list` | List all tags | (none) |

### Examples

```
instapaper_list { folder: "starred", limit: 10 }
instapaper_add { url: "https://example.com/article", tags: "tech,ai" }
instapaper_import { urls: ["https://a.com", "https://b.com"], folder: "Work" }
instapaper_text { bookmark_id: 12345678 }
instapaper_highlights_list { bookmark_id: 12345678 }
```

## Architecture

```
User → OpenClaw tool call → Plugin (src/index.ts)
  → resolves consumer key/secret from config/env/keychain
  → execFile("instapaper-cli", args, { env: { KEY, SECRET } })
  → parses ndjson/json output
  → returns structured result to OpenClaw
```

The `instapaper-cli` binary handles OAuth 1.0a request signing (HMAC-SHA1) and token management internally. User OAuth tokens persist in `~/.config/ip/` from the one-time `auth login` step.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `instapaper-cli not found` | `brew tap vburojevic/tap && brew install instapaper-cli` |
| `No Instapaper credentials configured` | Configure consumer key/secret (see Configuration above) |
| `auth_error` or 403 | Re-run `instapaper-cli auth login`. Tokens may have expired. |
| Blocked by dangerous-code detector | Use `--dangerously-force-unsafe-install` (see Security note) |
| Exit code 10 (rate limited) | Wait a few minutes. Instapaper enforces per-endpoint rate limits. |
| Exit code 11 (premium required) | Some features require [Instapaper Premium](https://www.instapaper.com/premium). |
| Empty results from `instapaper_list` | Unread folder may be empty. Try `folder: "archive"` or `folder: "starred"`. |

## License

MIT
