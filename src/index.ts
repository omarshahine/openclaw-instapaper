/**
 * OpenClaw plugin entry for Instapaper.
 *
 * Wraps the instapaper-cli binary to provide reading list management
 * as OpenClaw tools: list, add, import, archive, star, move, delete,
 * text, folders, highlights, and tags.
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { type Static } from "@sinclair/typebox";
import { execFileSync } from "child_process";
import { CLIRunner } from "../lib/cli-runner.js";
import {
  listSchema,
  addSchema,
  importSchema,
  archiveSchema,
  unarchiveSchema,
  starSchema,
  unstarSchema,
  moveSchema,
  deleteSchema,
  textSchema,
  foldersListSchema,
  foldersAddSchema,
  foldersDeleteSchema,
  highlightsListSchema,
  highlightsAddSchema,
  tagsListSchema,
} from "../lib/schema.js";
import {
  handleList,
  handleAdd,
  handleImport,
  handleArchive,
  handleUnarchive,
  handleStar,
  handleUnstar,
  handleMove,
  handleDelete,
  handleText,
  handleFoldersList,
  handleFoldersAdd,
  handleFoldersDelete,
  handleHighlightsList,
  handleHighlightsAdd,
  handleTagsList,
} from "../lib/handler.js";

type ListParams = Static<typeof listSchema>;
type AddParams = Static<typeof addSchema>;
type ImportParams = Static<typeof importSchema>;
type ArchiveParams = Static<typeof archiveSchema>;
type MoveParams = Static<typeof moveSchema>;
type TextParams = Static<typeof textSchema>;
type FoldersAddParams = Static<typeof foldersAddSchema>;
type FoldersDeleteParams = Static<typeof foldersDeleteSchema>;
type HighlightsListParams = Static<typeof highlightsListSchema>;
type HighlightsAddParams = Static<typeof highlightsAddSchema>;

interface SecretRef {
  source: "env" | "file" | "exec";
  provider: string;
  id: string;
}

interface PluginConfig {
  consumerKey?: string | SecretRef;
  consumerSecret?: string | SecretRef;
}

function keychainLookup(service: string): string | undefined {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", service, "-w"],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim() || undefined;
  } catch {
    return undefined;
  }
}

function isSecretRef(value: unknown): value is SecretRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    "provider" in value &&
    "id" in value
  );
}

function resolveSecretRef(ref: SecretRef): string | undefined {
  switch (ref.source) {
    case "env":
      return process.env[ref.id] || undefined;
    case "exec":
      if (ref.provider === "keychain" || ref.provider === "security") {
        return keychainLookup(ref.id);
      }
      return undefined;
    default:
      return undefined;
  }
}

function resolveConfigValue(configValue: string | SecretRef | undefined, envFallback: string): string | undefined {
  if (isSecretRef(configValue)) {
    const resolved = resolveSecretRef(configValue);
    if (resolved) return resolved;
  }
  if (typeof configValue === "string" && configValue) return configValue;
  if (process.env[envFallback]) return process.env[envFallback];
  return keychainLookup(`env/${envFallback}`);
}

/** Helper to wrap a handler result as tool output. */
function toolResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    details: null,
  };
}

function toToolResult(result: Record<string, unknown>) {
  return toolResult(JSON.stringify(result, null, 2));
}

function errorResult(message: string) {
  return toToolResult({ success: false, error: message });
}

export default definePluginEntry({
  id: "instapaper-cli",
  name: "Instapaper",
  description: "Manage your Instapaper reading list: bookmarks, folders, highlights, tags, and article export",

  register(api) {
    const config = api.pluginConfig as PluginConfig | undefined;

    function getCLI(): CLIRunner | null {
      const consumerKey = resolveConfigValue(config?.consumerKey, "INSTAPAPER_CONSUMER_KEY");
      const consumerSecret = resolveConfigValue(config?.consumerSecret, "INSTAPAPER_CONSUMER_SECRET");
      if (!consumerKey || !consumerSecret) return null;
      return new CLIRunner(consumerKey, consumerSecret);
    }

    // -- Bookmark tools --

    api.registerTool({
      name: "instapaper_list",
      label: "Instapaper List",
      description: "List Instapaper bookmarks. Default: unread folder, 25 items.",
      parameters: listSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleList(params as ListParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_add",
      label: "Instapaper Add",
      description: "Save a URL to Instapaper with optional title, folder, and tags.",
      parameters: addSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleAdd(params as AddParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_import",
      label: "Instapaper Import",
      description: "Bulk import multiple URLs into Instapaper.",
      parameters: importSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleImport(params as ImportParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_archive",
      label: "Instapaper Archive",
      description: "Archive a bookmark by ID.",
      parameters: archiveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleArchive(params as ArchiveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_unarchive",
      label: "Instapaper Unarchive",
      description: "Unarchive a bookmark by ID.",
      parameters: unarchiveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleUnarchive(params as ArchiveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_star",
      label: "Instapaper Star",
      description: "Star a bookmark by ID.",
      parameters: starSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleStar(params as ArchiveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_unstar",
      label: "Instapaper Unstar",
      description: "Unstar a bookmark by ID.",
      parameters: unstarSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleUnstar(params as ArchiveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_move",
      label: "Instapaper Move",
      description: "Move a bookmark to a different folder.",
      parameters: moveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleMove(params as MoveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_delete",
      label: "Instapaper Delete",
      description: "Permanently delete a bookmark. This cannot be undone.",
      parameters: deleteSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleDelete(params as ArchiveParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_text",
      label: "Instapaper Text",
      description: "Get the full article text/HTML for a bookmark.",
      parameters: textSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleText(params as TextParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    // -- Folder tools --

    api.registerTool({
      name: "instapaper_folders_list",
      label: "Instapaper Folders List",
      description: "List all Instapaper folders.",
      parameters: foldersListSchema,
      async execute() {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleFoldersList(cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_folders_add",
      label: "Instapaper Folders Add",
      description: "Create a new Instapaper folder.",
      parameters: foldersAddSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleFoldersAdd(params as FoldersAddParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_folders_delete",
      label: "Instapaper Folders Delete",
      description: "Delete an Instapaper folder. Articles are moved to Archive.",
      parameters: foldersDeleteSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleFoldersDelete(params as FoldersDeleteParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    // -- Highlight tools --

    api.registerTool({
      name: "instapaper_highlights_list",
      label: "Instapaper Highlights List",
      description: "List highlights for a bookmark.",
      parameters: highlightsListSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleHighlightsList(params as HighlightsListParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    api.registerTool({
      name: "instapaper_highlights_add",
      label: "Instapaper Highlights Add",
      description: "Add a highlight to a bookmark.",
      parameters: highlightsAddSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleHighlightsAdd(params as HighlightsAddParams, cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });

    // -- Tags --

    api.registerTool({
      name: "instapaper_tags_list",
      label: "Instapaper Tags List",
      description: "List all tags across your Instapaper bookmarks.",
      parameters: tagsListSchema,
      async execute() {
        const cli = getCLI();
        if (!cli) return errorResult("No Instapaper credentials configured.");
        try {
          return toToolResult(await handleTagsList(cli));
        } catch (e: unknown) {
          return errorResult(e instanceof Error ? e.message : String(e));
        }
      },
    });
  },
});
