/**
 * OpenClaw plugin entry for Instapaper.
 *
 * Wraps the instapaper-cli binary to provide reading list management
 * as OpenClaw tools: list, add, import, archive, star, move, delete,
 * text, folders, highlights, and tags.
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { type Static } from "@sinclair/typebox";
import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { CLIRunner } from "../lib/cli-runner.js";
import { whichBinary } from "../lib/safe-shell.js";
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
  source: "env" | "file";
  provider: string;
  id: string;
}

interface PluginConfig {
  consumerKey?: string | SecretRef;
  consumerSecret?: string | SecretRef;
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

/**
 * Look up a file-based secret provider from openclaw.json, then resolve
 * the id as a JSON pointer (mode=json) or return the whole file (mode=singleValue).
 */
function resolveFileRef(provider: string, id: string): string | undefined {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const configPath = pathResolve(home, ".openclaw", "openclaw.json");
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const providerDef = config?.secrets?.providers?.[provider];
    if (!providerDef || providerDef.source !== "file") return undefined;

    const rawPath: string = providerDef.path || "";
    const filePath = rawPath.startsWith("~")
      ? pathResolve(home, rawPath.slice(2))
      : rawPath;
    const contents = readFileSync(filePath, "utf8");

    if (providerDef.mode === "singleValue") {
      return id === "value" ? contents.trim() : undefined;
    }

    // mode=json: resolve id as JSON pointer (RFC 6901)
    let current: unknown = JSON.parse(contents);
    for (const raw of id.replace(/^\//, "").split("/")) {
      const part = raw.replace(/~1/g, "/").replace(/~0/g, "~");
      if (typeof current !== "object" || current === null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === "string" ? current : undefined;
  } catch {
    return undefined;
  }
}

function resolveSecretRef(ref: SecretRef): string | undefined {
  switch (ref.source) {
    case "env":
      return process.env[ref.id] || undefined;
    case "file":
      return resolveFileRef(ref.provider, ref.id);
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
  return undefined;
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

    // -- Preflight: check binary and auth on plugin load --
    let binaryPath: string | null = null;
    let preflightError: string | null = null;

    binaryPath = whichBinary("instapaper-cli");

    if (!binaryPath) {
      preflightError =
        "instapaper-cli binary not found. Install it:\n" +
        "  brew tap vburojevic/tap && brew install instapaper-cli\n\n" +
        "Then authenticate (one-time):\n" +
        "  export INSTAPAPER_CONSUMER_KEY=\"your-key\"\n" +
        "  export INSTAPAPER_CONSUMER_SECRET=\"your-secret\"\n" +
        "  printf '%s' \"password\" | instapaper-cli auth login -username \"you@example.com\" -password-stdin\n\n" +
        "Get consumer credentials at: https://www.instapaper.com/main/request_oauth_consumer_token";
    }

    function getCLI(): CLIRunner | null {
      if (preflightError) return null;
      const consumerKey = resolveConfigValue(config?.consumerKey, "INSTAPAPER_CONSUMER_KEY");
      const consumerSecret = resolveConfigValue(config?.consumerSecret, "INSTAPAPER_CONSUMER_SECRET");
      if (!consumerKey || !consumerSecret) return null;
      return new CLIRunner(consumerKey, consumerSecret, binaryPath || "instapaper-cli");
    }

    function getCliOrError(): { cli: CLIRunner | null; error: string | null } {
      if (preflightError) return { cli: null, error: preflightError };
      const cli = getCLI();
      if (!cli) {
        return {
          cli: null,
          error:
            "Instapaper consumer key and secret not configured.\n\n" +
            "Configure via environment variables:\n" +
            "  INSTAPAPER_CONSUMER_KEY=your-key\n" +
            "  INSTAPAPER_CONSUMER_SECRET=your-secret\n\n" +
            "Or via plugin config:\n" +
            "  openclaw config set plugins.entries.instapaper-cli.config.consumerKey '${INSTAPAPER_CONSUMER_KEY}'\n" +
            "  openclaw config set plugins.entries.instapaper-cli.config.consumerSecret '${INSTAPAPER_CONSUMER_SECRET}'\n\n" +
            "Get consumer credentials at: https://www.instapaper.com/main/request_oauth_consumer_token",
        };
      }
      return { cli, error: null };
    }

    /** Wrap a handler call with CLI resolution and error handling. */
    async function withCli<T extends Record<string, unknown>>(
      handler: (cli: CLIRunner) => Promise<T>
    ) {
      const { cli, error } = getCliOrError();
      if (!cli) return errorResult(error!);
      try {
        return toToolResult(await handler(cli));
      } catch (e: unknown) {
        return errorResult(e instanceof Error ? e.message : String(e));
      }
    }

    // -- Bookmark tools --

    api.registerTool({
      name: "instapaper_list",
      label: "Instapaper List",
      description: "List Instapaper bookmarks. Default: unread folder, 25 items.",
      parameters: listSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleList(params as ListParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_add",
      label: "Instapaper Add",
      description: "Save a URL to Instapaper with optional title, folder, and tags.",
      parameters: addSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleAdd(params as AddParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_import",
      label: "Instapaper Import",
      description: "Bulk import multiple URLs into Instapaper.",
      parameters: importSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleImport(params as ImportParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_archive",
      label: "Instapaper Archive",
      description: "Archive a bookmark by ID.",
      parameters: archiveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleArchive(params as ArchiveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_unarchive",
      label: "Instapaper Unarchive",
      description: "Unarchive a bookmark by ID.",
      parameters: unarchiveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleUnarchive(params as ArchiveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_star",
      label: "Instapaper Star",
      description: "Star a bookmark by ID.",
      parameters: starSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleStar(params as ArchiveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_unstar",
      label: "Instapaper Unstar",
      description: "Unstar a bookmark by ID.",
      parameters: unstarSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleUnstar(params as ArchiveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_move",
      label: "Instapaper Move",
      description: "Move a bookmark to a different folder.",
      parameters: moveSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleMove(params as MoveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_delete",
      label: "Instapaper Delete",
      description: "Permanently delete a bookmark. This cannot be undone.",
      parameters: deleteSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleDelete(params as ArchiveParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_text",
      label: "Instapaper Text",
      description: "Get the full article text/HTML for a bookmark.",
      parameters: textSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleText(params as TextParams, cli));
      },
    });

    // -- Folder tools --

    api.registerTool({
      name: "instapaper_folders_list",
      label: "Instapaper Folders List",
      description: "List all Instapaper folders.",
      parameters: foldersListSchema,
      async execute() {
        return withCli((cli) => handleFoldersList(cli));
      },
    });

    api.registerTool({
      name: "instapaper_folders_add",
      label: "Instapaper Folders Add",
      description: "Create a new Instapaper folder.",
      parameters: foldersAddSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleFoldersAdd(params as FoldersAddParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_folders_delete",
      label: "Instapaper Folders Delete",
      description: "Delete an Instapaper folder. Articles are moved to Archive.",
      parameters: foldersDeleteSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleFoldersDelete(params as FoldersDeleteParams, cli));
      },
    });

    // -- Highlight tools --

    api.registerTool({
      name: "instapaper_highlights_list",
      label: "Instapaper Highlights List",
      description: "List highlights for a bookmark.",
      parameters: highlightsListSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleHighlightsList(params as HighlightsListParams, cli));
      },
    });

    api.registerTool({
      name: "instapaper_highlights_add",
      label: "Instapaper Highlights Add",
      description: "Add a highlight to a bookmark.",
      parameters: highlightsAddSchema,
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        return withCli((cli) => handleHighlightsAdd(params as HighlightsAddParams, cli));
      },
    });

    // -- Tags --

    api.registerTool({
      name: "instapaper_tags_list",
      label: "Instapaper Tags List",
      description: "List all tags across your Instapaper bookmarks.",
      parameters: tagsListSchema,
      async execute() {
        return withCli((cli) => handleTagsList(cli));
      },
    });
  },
});
