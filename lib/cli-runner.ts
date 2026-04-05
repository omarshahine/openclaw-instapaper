/**
 * CLI runner for instapaper-cli.
 *
 * Executes the instapaper-cli binary with proper environment
 * variables and parses ndjson/json output.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CLIResult } from "./types.js";

const execFileAsync = promisify(execFile);

export class CLIRunner {
  private consumerKey: string;
  private consumerSecret: string;
  private binaryPath: string;

  constructor(consumerKey: string, consumerSecret: string, binaryPath = "instapaper-cli") {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.binaryPath = binaryPath;
  }

  /**
   * Run an instapaper-cli command with global and subcommand args.
   *
   * @param globalArgs - Flags before the subcommand (e.g., ["--json"])
   * @param command - The subcommand (e.g., "list", "add", "folders")
   * @param subArgs - Flags after the subcommand (e.g., ["-folder", "unread"])
   */
  async run(globalArgs: string[], command: string | string[], subArgs: string[] = []): Promise<CLIResult> {
    const cmdParts = Array.isArray(command) ? command : [command];
    const args = [...globalArgs, ...cmdParts, ...subArgs];

    try {
      const { stdout, stderr } = await execFileAsync(this.binaryPath, args, {
        env: {
          ...process.env,
          INSTAPAPER_CONSUMER_KEY: this.consumerKey,
          INSTAPAPER_CONSUMER_SECRET: this.consumerSecret,
        },
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024, // 10MB for large exports
      });

      return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err: unknown) {
      const error = err as { code?: string; exitCode?: number; stdout?: string; stderr?: string; message?: string };
      if (error.code === "ENOENT") {
        return {
          success: false,
          error: "instapaper-cli not found. Install: brew tap vburojevic/tap && brew install instapaper-cli",
          exitCode: 127,
        };
      }
      return {
        success: false,
        error: error.stderr || error.message || "Unknown error",
        stdout: error.stdout,
        stderr: error.stderr,
        exitCode: error.exitCode,
      };
    }
  }

  /** Run a command and parse ndjson output into an array of objects. */
  async runNdjson<T = unknown>(command: string | string[], subArgs: string[] = []): Promise<{ success: boolean; data: T[]; error?: string }> {
    const result = await this.run([], command, subArgs);
    if (!result.success) {
      return { success: false, data: [], error: result.error };
    }
    if (!result.stdout) {
      return { success: true, data: [] };
    }
    const lines = result.stdout.split("\n").filter((l) => l.trim());
    const data = lines.map((line) => JSON.parse(line) as T);
    return { success: true, data };
  }

  /** Run a command and parse JSON array output. */
  async runJson<T = unknown>(command: string | string[], subArgs: string[] = []): Promise<{ success: boolean; data: T; error?: string }> {
    const result = await this.run(["--json"], command, subArgs);
    if (!result.success) {
      return { success: false, data: null as T, error: result.error };
    }
    if (!result.stdout || result.stdout === "null") {
      return { success: true, data: [] as T };
    }
    const data = JSON.parse(result.stdout) as T;
    return { success: true, data };
  }
}
