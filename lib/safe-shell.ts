/**
 * Shell wrapper.
 *
 * Centralizes child_process invocations behind a small, auditable surface:
 *   - runCli(cli, argv, opts): invokes a binary with an argv array. No
 *     shell, no string interpolation — args cannot inject shell
 *     metacharacters. Optional `env` lets callers pass an explicit env
 *     instead of inheriting the parent process env wholesale.
 *   - whichBinary(name): cross-platform PATH lookup (`which` on POSIX,
 *     `where.exe` on Windows).
 *
 * The rest of the codebase imports only these wrappers; no other module
 * touches child_process directly. Concentrating shell-outs in one file
 * makes them easy to audit.
 */

import {
	execFile as _runFile,
	execFileSync as _runFileSync,
	spawn as _spawn,
} from "node:child_process";
import { promisify } from "node:util";

const _runFileAsync = promisify(_runFile);

export interface RunOptions {
	timeout?: number;
	maxBuffer?: number;
	env?: NodeJS.ProcessEnv;
}

/** Run a binary with arguments and return stdout/stderr. No shell, no injection. */
export async function runCli(
	cli: string,
	args: string[],
	opts: RunOptions = {}
): Promise<{ stdout: string; stderr: string }> {
	const { stdout, stderr } = await _runFileAsync(cli, args, {
		encoding: "utf8",
		timeout: opts.timeout ?? 30_000,
		maxBuffer: opts.maxBuffer ?? 10 * 1024 * 1024,
		...(opts.env ? { env: opts.env } : {}),
	});
	return { stdout, stderr };
}

/**
 * Run a binary with arguments, piping `stdin` text into the process.
 * Returns stdout on success.
 */
export function runCliWithStdin(
	cli: string,
	args: string[],
	stdin: string,
	opts: RunOptions = {}
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = _spawn(cli, args, {
			stdio: ["pipe", "pipe", "pipe"],
			...(opts.env ? { env: opts.env } : {}),
		});
		const timer = opts.timeout
			? setTimeout(() => {
					child.kill("SIGTERM");
					reject(new Error(`${cli} timed out after ${opts.timeout}ms`));
				}, opts.timeout)
			: null;
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d.toString()));
		child.stderr.on("data", (d) => (stderr += d.toString()));
		child.on("error", (e) => {
			if (timer) clearTimeout(timer);
			reject(e);
		});
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			if (code === 0) resolve({ stdout, stderr });
			else reject(Object.assign(new Error(stderr || `${cli} exited ${code}`), { stdout, stderr, code }));
		});
		child.stdin.write(stdin);
		child.stdin.end();
	});
}

/** Cross-platform binary lookup using `which` / `where.exe`. */
export function whichBinary(name: string): string | null {
	const cmd = process.platform === "win32" ? "where.exe" : "which";
	try {
		const result = _runFileSync(cmd, [name], { encoding: "utf8" }).trim();
		const first = result.split("\n")[0]?.trim();
		return first || null;
	} catch {
		return null;
	}
}
