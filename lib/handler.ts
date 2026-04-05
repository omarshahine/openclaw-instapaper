/**
 * Handler functions for each Instapaper tool.
 *
 * All tools shell out to instapaper-cli via CLIRunner.
 */

import type { CLIRunner } from "./cli-runner.js";
import type { Bookmark, Folder, Highlight, HandlerResult } from "./types.js";

interface ListArgs {
  folder?: string;
  limit?: number;
  tag?: string;
}

interface AddArgs {
  url: string;
  title?: string;
  folder?: string;
  tags?: string;
}

interface ImportArgs {
  urls: string[];
  folder?: string;
  tags?: string;
}

interface BookmarkIdArgs {
  bookmark_id: number;
}

interface MoveArgs {
  bookmark_id: number;
  folder: string;
}

interface FolderTitleArgs {
  title: string;
}

interface HighlightAddArgs {
  bookmark_id: number;
  text: string;
}

export async function handleList(args: ListArgs, cli: CLIRunner): Promise<HandlerResult> {
  const subArgs: string[] = [];
  if (args.folder) subArgs.push("-folder", args.folder);
  if (args.limit) subArgs.push("-limit", String(args.limit));
  if (args.tag) subArgs.push("-tag", args.tag);

  const result = await cli.runNdjson<Bookmark>("list", subArgs);
  if (!result.success) return { success: false, error: result.error };

  return {
    success: true,
    count: result.data.length,
    bookmarks: result.data.map((b) => ({
      bookmark_id: b.bookmark_id,
      title: b.title,
      url: b.url,
      starred: b.starred || false,
      progress: Math.round((b.progress || 0) * 100),
      saved: new Date(b.time * 1000).toISOString().split("T")[0],
    })),
  };
}

export async function handleAdd(args: AddArgs, cli: CLIRunner): Promise<HandlerResult> {
  const subArgs: string[] = [];
  if (args.title) subArgs.push("-title", args.title);
  if (args.folder) subArgs.push("-folder", args.folder);
  if (args.tags) subArgs.push("-tags", args.tags);

  const result = await cli.run([], "add", [args.url, ...subArgs]);
  if (!result.success) return { success: false, error: result.error };

  return { success: true, message: result.stdout || `Added ${args.url}` };
}

export async function handleImport(args: ImportArgs, cli: CLIRunner): Promise<HandlerResult> {
  const input = args.urls.join("\n");
  const subArgs: string[] = ["-input", "-", "-input-format", "plain"];
  if (args.folder) subArgs.push("-folder", args.folder);
  if (args.tags) subArgs.push("-tags", args.tags);

  // Write URLs to stdin via a temp approach: pipe through echo
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  try {
    const child = execFileAsync("instapaper-cli", ["import", ...subArgs], {
      env: {
        ...process.env,
        INSTAPAPER_CONSUMER_KEY: process.env.INSTAPAPER_CONSUMER_KEY,
        INSTAPAPER_CONSUMER_SECRET: process.env.INSTAPAPER_CONSUMER_SECRET,
      },
      timeout: 60000,
    });
    child.child.stdin?.write(input);
    child.child.stdin?.end();
    const { stdout } = await child;

    return { success: true, message: stdout?.trim() || `Imported ${args.urls.length} URLs`, count: args.urls.length };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return { success: false, error: error.stderr || error.message || "Import failed" };
  }
}

export async function handleArchive(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "archive", [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Archived bookmark ${args.bookmark_id}` };
}

export async function handleUnarchive(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "unarchive", [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Unarchived bookmark ${args.bookmark_id}` };
}

export async function handleStar(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "star", [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Starred bookmark ${args.bookmark_id}` };
}

export async function handleUnstar(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "unstar", [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Unstarred bookmark ${args.bookmark_id}` };
}

export async function handleMove(args: MoveArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "move", [String(args.bookmark_id), "-folder", args.folder]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Moved bookmark ${args.bookmark_id} to ${args.folder}` };
}

export async function handleDelete(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "delete", [String(args.bookmark_id), "-yes-really-delete"]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Deleted bookmark ${args.bookmark_id}` };
}

export async function handleText(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], "text", [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, html: result.stdout };
}

export async function handleFoldersList(cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.runNdjson<Folder>(["folders", "list"]);
  if (!result.success) return { success: false, error: result.error };
  return {
    success: true,
    folders: result.data.map((f) => ({
      folder_id: f.folder_id,
      title: f.title,
    })),
  };
}

export async function handleFoldersAdd(args: FolderTitleArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], ["folders", "add"], [args.title]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Created folder "${args.title}"` };
}

export async function handleFoldersDelete(args: FolderTitleArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], ["folders", "delete"], [args.title, "-yes"]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Deleted folder "${args.title}"` };
}

export async function handleHighlightsList(args: BookmarkIdArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.runNdjson<Highlight>(["highlights", "list"], [String(args.bookmark_id)]);
  if (!result.success) return { success: false, error: result.error };
  return {
    success: true,
    highlights: result.data.map((h) => ({
      highlight_id: h.highlight_id,
      text: h.text,
      note: h.note,
      position: h.position,
    })),
  };
}

export async function handleHighlightsAdd(args: HighlightAddArgs, cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.run([], ["highlights", "add"], [String(args.bookmark_id), "-text", args.text]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, message: result.stdout || `Added highlight to bookmark ${args.bookmark_id}` };
}

export async function handleTagsList(cli: CLIRunner): Promise<HandlerResult> {
  const result = await cli.runNdjson(["tags", "list"]);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, tags: result.data };
}
