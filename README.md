# openclaw-instapaper

OpenClaw plugin for [Instapaper](https://www.instapaper.com) reading list management.

## Install

```bash
openclaw plugins install instapaper-cli
```

## Prerequisites

Requires the `instapaper-cli` binary:

```bash
brew tap vburojevic/tap && brew install instapaper-cli
```

Then authenticate (one-time):

```bash
export INSTAPAPER_CONSUMER_KEY="your-key"
export INSTAPAPER_CONSUMER_SECRET="your-secret"
printf '%s' "password" | instapaper-cli auth login -username "you@example.com" -password-stdin
```

Get your consumer key/secret from https://www.instapaper.com/main/request_oauth_consumer_token

## Configuration

### Option A: Environment variables (recommended)

```bash
# Add to ~/.openclaw/.env (chmod 600)
INSTAPAPER_CONSUMER_KEY=your-key
INSTAPAPER_CONSUMER_SECRET=your-secret
```

### Option B: Plugin config with env interpolation

```bash
openclaw config set plugins.entries.instapaper-cli.config.consumerKey '${INSTAPAPER_CONSUMER_KEY}'
openclaw config set plugins.entries.instapaper-cli.config.consumerSecret '${INSTAPAPER_CONSUMER_SECRET}'
```

## Tools

| Tool | Description |
|------|-------------|
| `instapaper_list` | List bookmarks (unread, starred, archive, or folder) |
| `instapaper_add` | Save a URL to Instapaper |
| `instapaper_import` | Bulk import multiple URLs |
| `instapaper_archive` | Archive a bookmark |
| `instapaper_unarchive` | Unarchive a bookmark |
| `instapaper_star` | Star a bookmark |
| `instapaper_unstar` | Unstar a bookmark |
| `instapaper_move` | Move bookmark to folder |
| `instapaper_delete` | Permanently delete a bookmark |
| `instapaper_text` | Get full article HTML |
| `instapaper_folders_list` | List all folders |
| `instapaper_folders_add` | Create a folder |
| `instapaper_folders_delete` | Delete a folder |
| `instapaper_highlights_list` | List highlights for a bookmark |
| `instapaper_highlights_add` | Add a highlight |
| `instapaper_tags_list` | List all tags |

## License

MIT
