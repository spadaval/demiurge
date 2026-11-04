/**
 * Reads a `claude -p --output-format stream-json --verbose` transcript and
 * reports what a step touched outside the directories it was allowed: file
 * tools on paths outside them, shell commands naming such paths (or `~`,
 * `$HOME`, `..`), and web access. It reports; it never blocks or retries.
 */

import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export type Finding = { tool: string; detail: string };

export type TranscriptSummary = {
  /** The model named by the session's init event. */
  initModel: string | undefined;
  /** Every model that answered, from the assistant messages. */
  models: string[];
  skills: unknown;
  mcpServers: unknown;
  plugins: unknown;
  hookEvents: number;
  toolUses: number;
  result:
    | {
        subtype: unknown;
        isError: unknown;
        durationMs: unknown;
        numTurns: unknown;
        costUsd: unknown;
      }
    | undefined;
  outside: Finding[];
  /** Lines that weren't JSON, kept so nothing is silently dropped. */
  unparsed: number;
};

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/** Devices any shell command may name without it being a read elsewhere. */
const HARMLESS = ["/dev/null", "/dev/stdin", "/dev/stdout", "/dev/stderr"];

/** Tools that change files; only the run directory may be written. */
const WRITERS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export type Allowed = {
  /** Where the session may read: its run directory, plus the tool for tool runs. */
  read: readonly string[];
  /** Where it may write: its run directory only. */
  write: readonly string[];
};

/** Checks one step's transcript. `cwd` is the run directory. */
export function checkTranscript(
  jsonl: string,
  cwd: string,
  allowed: Allowed,
): TranscriptSummary {
  const within = (dirs: readonly string[]) => (path: string) => {
    const full = resolve(cwd, path);
    return dirs.some((dir) => {
      const rel = relative(dir, full);
      return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
    });
  };
  const inside = { read: within(allowed.read), write: within(allowed.write) };
  const summary: TranscriptSummary = {
    initModel: undefined,
    models: [],
    skills: undefined,
    mcpServers: undefined,
    plugins: undefined,
    hookEvents: 0,
    toolUses: 0,
    result: undefined,
    outside: [],
    unparsed: 0,
  };
  for (const line of jsonl.split("\n")) {
    if (line.trim() === "") continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      summary.unparsed++;
      continue;
    }
    if (!isObject(event)) continue;
    const type = event.type;
    const subtype = event.subtype;
    if (type === "system" && subtype === "init") {
      summary.initModel = text(event.model);
      summary.skills = event.skills;
      summary.mcpServers = event.mcp_servers;
      summary.plugins = event.plugins;
    } else if (type === "system" && text(subtype)?.startsWith("hook")) {
      summary.hookEvents++;
    } else if (type === "result") {
      summary.result = {
        subtype,
        isError: event.is_error,
        durationMs: event.duration_ms,
        numTurns: event.num_turns,
        costUsd: event.total_cost_usd,
      };
    } else if (type === "assistant" && isObject(event.message)) {
      const model = text(event.message.model);
      if (model !== undefined && !summary.models.includes(model)) {
        summary.models.push(model);
      }
      const content = event.message.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!isObject(part) || part.type !== "tool_use") continue;
        summary.toolUses++;
        const name = text(part.name) ?? "(unnamed tool)";
        const input = isObject(part.input) ? part.input : {};
        summary.outside.push(...toolFindings(name, input, inside));
      }
    }
  }
  return summary;
}

type Inside = Record<"read" | "write", (path: string) => boolean>;

function toolFindings(name: string, input: Json, inside: Inside): Finding[] {
  if (name === "Bash") {
    const command = text(input.command) ?? "";
    const named = shellPaths(command).filter(
      (path) => !HARMLESS.includes(path) && !inside.read(path),
    );
    const vague =
      /(^|[\s'"=:(])~|\$HOME|\$\{HOME\}|(^|[\s/'"=])\.\.(\/|\s|$)/.test(
        command,
      );
    return named.length > 0 || vague ? [{ tool: name, detail: command }] : [];
  }
  if (name === "WebFetch" || name === "WebSearch") {
    return [{ tool: name, detail: JSON.stringify(input) }];
  }
  const paths = ["file_path", "notebook_path", "path"]
    .map((key) => text(input[key]))
    .filter((path): path is string => path !== undefined);
  const pattern = text(input.pattern);
  if (
    pattern !== undefined &&
    (isAbsolute(pattern) || pattern.includes(".."))
  ) {
    paths.push(pattern);
  }
  const ok = WRITERS.has(name) ? inside.write : inside.read;
  return paths
    .filter((path) => path.startsWith("~") || !ok(path))
    .map((path) => ({ tool: name, detail: path }));
}

/**
 * Absolute paths a shell command names. The root itself (`ls /`,
 * `find / ...`, `cd / && ...`) and any path whose first segment is a
 * wildcard (a star, `?`, `[` or `{`) always count. Otherwise a slash-led
 * word counts only if its first segment exists at the filesystem root (`/home`, `/etc`, `/tmp`),
 * so sed addresses such as `/## Events/` aren't taken for paths.
 */
export function shellPaths(command: string): string[] {
  const found = command.matchAll(/(?:^|[\s'"=:(<>|;&])(\/[^\s'"`;|&<>()]*)/g);
  return [...found]
    .map((match) => match[1] ?? "")
    .filter((path) => {
      const first = path.split("/")[1] ?? "";
      return first === "" || /[*?[{]/.test(first) || existsSync(`/${first}`);
    });
}
