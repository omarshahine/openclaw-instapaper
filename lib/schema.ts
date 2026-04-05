/**
 * Tool parameter schemas for Instapaper tools.
 *
 * Uses TypeBox for SDK-compliant type-safe schemas.
 */

import { Type } from "@sinclair/typebox";

export const listSchema = Type.Object({
  folder: Type.Optional(
    Type.String({
      description: 'Folder to list: "unread" (default), "starred", "archive", or a folder name',
    })
  ),
  limit: Type.Optional(
    Type.Number({ description: "Maximum number of bookmarks to return (default: 25, max: 500)" })
  ),
  tag: Type.Optional(
    Type.String({ description: "Filter by tag name (overrides folder)" })
  ),
});

export const addSchema = Type.Object({
  url: Type.String({ description: "URL to save to Instapaper" }),
  title: Type.Optional(
    Type.String({ description: "Override the article title (auto-detected if omitted)" })
  ),
  folder: Type.Optional(
    Type.String({ description: "Target folder name or ID" })
  ),
  tags: Type.Optional(
    Type.String({ description: "Comma-separated tags to apply" })
  ),
});

export const importSchema = Type.Object({
  urls: Type.Array(Type.String(), {
    description: "Array of URLs to import into Instapaper",
  }),
  folder: Type.Optional(
    Type.String({ description: "Default folder for all imported URLs" })
  ),
  tags: Type.Optional(
    Type.String({ description: "Default comma-separated tags for all imported URLs" })
  ),
});

export const archiveSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to archive" }),
});

export const unarchiveSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to unarchive" }),
});

export const starSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to star" }),
});

export const unstarSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to unstar" }),
});

export const moveSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to move" }),
  folder: Type.String({ description: "Target folder name or ID" }),
});

export const deleteSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to permanently delete" }),
});

export const textSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to get article text for" }),
});

export const foldersListSchema = Type.Object({});

export const foldersAddSchema = Type.Object({
  title: Type.String({ description: "Name of the new folder" }),
});

export const foldersDeleteSchema = Type.Object({
  title: Type.String({ description: "Name of the folder to delete" }),
});

export const highlightsListSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to list highlights for" }),
});

export const highlightsAddSchema = Type.Object({
  bookmark_id: Type.Number({ description: "Bookmark ID to add highlight to" }),
  text: Type.String({ description: "Text to highlight" }),
});

export const tagsListSchema = Type.Object({});
