/**
 * Instapaper CLI response types.
 *
 * Based on the ndjson output of instapaper-cli.
 */

export interface Bookmark {
  type: "bookmark";
  bookmark_id: number;
  url: string;
  title: string;
  description?: string;
  hash: string;
  progress: number;
  progress_timestamp: number;
  starred?: boolean;
  time: number;
  private_source?: string;
}

export interface Folder {
  type: "folder";
  folder_id: number;
  title: string;
  position: number;
}

export interface Highlight {
  type: "highlight";
  highlight_id: number;
  text: string;
  note?: string;
  time: number;
  position: number;
  bookmark_id: number;
}

export interface Tag {
  name: string;
  count?: number;
}

export interface CLIResult {
  success: boolean;
  error?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

/** Result shape returned by all handler actions. */
export interface HandlerResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}
