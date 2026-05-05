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

You will receive a **consumer key** and **consumer secret**. Keep these — you'll need them for authentication and plugin configuration.

### Authentication (one-time)

```bash
export INSTAPAPER_CONSUMER_KEY="your-key"
export INSTAPAPER_CONSUMER_SECRET="your-secret"
printf '%s' "your-password" | instapaper-cli auth login -username "you@example.com" -password-stdin
```

This exchanges your credentials for OAuth tokens stored locally. You only need to do this once.

Verify: `instapaper-cli auth status` (should show `logged_in: true`)

Instapaper passwords are optional. If your account has no password, any value will work.

## Install

### From ClawHub

```bash
openclaw plugins install instapaper-cli
```

Or for local development:

```bash
openclaw plugins install -l ~/path/to/openclaw-instapaper
```

Symlink installs stay live with `git pull` updates.

### Security note

This plugin uses Node.js `execFile` (not shell exec) to call the `instapaper-cli` binary. OpenClaw's static analysis scanner flags this at install time. If prompted, review the source code and use:

```bash
openclaw plugins install instapaper-cli --dangerously-force-unsafe-install
```

This is expected for any CLI-wrapper plugin. The plugin never executes arbitrary commands, only calls the `instapaper-cli` binary with structured arguments.

## Configuration

The plugin needs your consumer key and secret at runtime to sign API requests. Choose one method:

### Option A: SecretRef via secrets.json (recommended)

Add your credentials to `~/.openclaw/secrets.json`:

```json
{
  "plugins": {
    "instapaper": {
      "consumerKey": "your-key",
      "consumerSecret": "your-secret"
    }
  }
}
```

Then wire the SecretRefs:

```bash
openclaw config set plugins.entries.instapaper-cli.config.consumerKey \
  --ref-source file --ref-provider secrets --ref-id /plugins/instapaper/consumerKey
openclaw config set plugins.entries.instapaper-cli.config.consumerSecret \
  --ref-source file --ref-provider secrets --ref-id /plugins/instapaper/consumerSecret
```

### Option B: Environment variables

```bash
# Add to your gateway environment or ~/.openclaw/.env
INSTAPAPER_CONSUMER_KEY=your-key
INSTAPAPER_CONSUMER_SECRET=your-secret
```

### Resolution order

The plugin resolves credentials from these sources (first match wins):

| Priority | Source | Details |
|----------|--------|---------|
| 1 | Plugin config (SecretRef) | Resolved via `env` or `file` provider |
| 2 | Plugin config (string) | Direct value or env var interpolation |
| 3 | Environment variable | `INSTAPAPER_CONSUMER_KEY` / `INSTAPAPER_CONSUMER_SECRET` |

### Restart and verify

```bash
openclaw gateway restart
```

Test by asking your agent: "Save https://example.com to Instapaper"

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

All tools shell out to the `instapaper-cli` binary via `execFile`. The plugin:

1. Resolves consumer key/secret from config, env vars, or keychain
2. Passes them as environment variables to the CLI process (never touches shell history)
3. Parses ndjson or JSON output from the CLI
4. Returns structured results to OpenClaw

The CLI handles OAuth 1.0a request signing (HMAC-SHA1) and token management internally. User OAuth tokens persist in `~/.config/ip/` from the one-time `auth login` step.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `instapaper-cli not found` | Run `brew tap vburojevic/tap && brew install instapaper-cli` |
| `No Instapaper credentials configured` | Configure consumer key/secret via one of the methods above |
| `HTTP 401` | Consumer key/secret may be swapped, or OAuth token expired. Re-run `auth login` with the correct consumer credentials set. |
| Exit code 10 (rate limited) | Wait a few minutes. Instapaper enforces per-endpoint rate limits. |
| Exit code 11 (premium required) | Some features require Instapaper Premium. |
| Empty results from `instapaper_list` | Try `folder: "archive"` or `folder: "starred"`. |

## License

MIT
