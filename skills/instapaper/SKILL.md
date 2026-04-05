---
name: instapaper
description: |
  Knowledge about Instapaper reading list management.
  Use when:
  - User asks about their reading list, bookmarks, or saved articles
  - User wants to save a URL to read later
  - User wants to list, archive, star, or organize bookmarks
  - User asks about highlights or article annotations
  - User says "save to Instapaper", "add to reading list", "what's in my reading list"
---

# Instapaper

Manage your Instapaper reading list: bookmarks, folders, highlights, tags, and article text.

## Tools

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
| `instapaper_folders_list` | List folders | (none) |
| `instapaper_folders_add` | Create folder | `title` |
| `instapaper_folders_delete` | Delete folder | `title` |
| `instapaper_highlights_list` | List highlights | `bookmark_id` |
| `instapaper_highlights_add` | Add highlight | `bookmark_id`, `text` |
| `instapaper_tags_list` | List all tags | (none) |

## Folder Names

Built-in folders: `unread` (default), `starred`, `archive`.

Custom folders are referenced by name (e.g., `"Work"`, `"Travel"`).

## Common Workflows

**Browse reading list:** `instapaper_list` with default settings shows unread items.

**Save an article:** `instapaper_add` with the URL. Title is auto-detected if omitted.

**Bulk save:** `instapaper_import` with an array of URLs.

**Review starred:** `instapaper_list` with `folder: "starred"`.

**Get article content:** `instapaper_text` returns HTML for the full article.

**Export highlights:** Call `instapaper_list` to get bookmark IDs, then `instapaper_highlights_list` for each.

## Prerequisites

Requires the `instapaper-cli` binary: `brew tap vburojevic/tap && brew install instapaper-cli`

Authentication must be set up: `instapaper-cli auth login -username EMAIL -password-stdin`

Consumer key/secret configured via plugin settings or environment variables.
