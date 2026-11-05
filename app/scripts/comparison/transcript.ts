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

const CREDENTIALS = /\.credentials\.json/;

/**
 * A word in command position: at the start of a line, or after `|`, `;`,
 * `&`, `(` or a backtick, optionally behind `sudo`, `env` or `exec`. Keeps
 * prose in heredocs ("dig into", "at the top") from counting.
 */
const COMMAND = "(?:^|[|;&(`])\\s*(?:(?:sudo|env|exec|command)\\s+)*";

/**
 * Shell commands worth reporting whatever paths they name. The sandbox keeps
 * the network open for the API, so network use is detected, not blocked.
 */
const SHELL_PATTERNS: readonly (readonly [string, RegExp])[] = [
  [
    "network",
    new RegExp(
      [
        "[a-z][a-z0-9+.-]*://",
        `${COMMAND}(curl|wget|ssh|scp|sftp|rsync|nc|ncat|netcat|socat|telnet|ftp|dig|nslookup|aria2c|http|https|lynx|w3m|npx|bunx|pipx)\\b`,
        "\\bgit\\s+(?:-\\S+\\s+(?:[^-\\s]\\S*\\s+)?)*(clone|fetch|pull|push|ls-remote|remote|submodule)\\b",
        "\\b(pip3?|npm|pnpm|yarn|bun|cargo|gem|apt|apt-get|uv)\\s+(install|add|i|x|download)\\b",
        "/dev/(tcp|udp)/",
        "\\b(urllib|http\\.client)\\b|\\bfetch\\(",
      ].join("|"),
      "m",
    ),
  ],
  ["credentials", CREDENTIALS],
  [
    "process list",
    new RegExp(
      `${COMMAND}(ps|pgrep|pkill|pstree|top|htop|pidof)\\b|/proc/`,
      "m",
    ),
  ],
];

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

/** Every Bash command a transcript ran, in order. */
function bashCommands(jsonl: string): string[] {
  const commands: string[] = [];
  for (const line of jsonl.split("\n")) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject(event) || event.type !== "assistant") continue;
    const content = isObject(event.message) ? event.message.content : [];
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!isObject(part) || part.type !== "tool_use" || part.name !== "Bash") {
        continue;
      }
      const command = isObject(part.input)
        ? text(part.input.command)
        : undefined;
      if (command !== undefined) commands.push(command);
    }
  }
  return commands;
}

/**
 * The Bash commands that ran the story CLI's `mentions`. A call names a ref
 * (`mentions event:wreck`), so this holds however the session spells the
 * CLI, and a word like "mentions" in other text doesn't count.
 */
export function mentionsCalls(jsonl: string): string[] {
  return bashCommands(jsonl).filter((command) =>
    /\bmentions\s+["']?[a-z-]+:/.test(command),
  );
}

type Inside = Record<"read" | "write", (path: string) => boolean>;

function toolFindings(name: string, input: Json, inside: Inside): Finding[] {
  if (name === "Bash") {
    const full = text(input.command) ?? "";
    const command = withoutFileHeredocs(full);
    const named = shellPaths(command).filter(
      (path) => !HARMLESS.includes(path) && !inside.read(path),
    );
    const vague =
      // `~` as a home (`~`, `~/x`, `~user`), not "~1,500 words".
      /(^|[\s'"=:(])~(?![\d.,])|\$HOME|\$\{HOME\}/.test(command) ||
      // `..` as a path segment, however the command around it is punctuated.
      /(^|[\s/'"=;&|(`{,])\.\.(\/|[\s;&|)`},]|$)/.test(command) ||
      // `$IFS`, which can stand in for the spaces and slashes the check reads.
      /\$\{?IFS\b|(^|[\s;&|(`])IFS=/.test(command);
    const findings: Finding[] =
      named.length > 0 || vague ? [{ tool: name, detail: full }] : [];
    for (const [label, pattern] of SHELL_PATTERNS) {
      if (pattern.test(command)) {
        findings.push({ tool: `${name} (${label})`, detail: full });
      }
    }
    return findings;
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
    .filter(
      (path) => path.startsWith("~") || !ok(path) || CREDENTIALS.test(path),
    )
    .map((path) => ({ tool: name, detail: path }));
}

/**
 * A heredoc whose delimiter is quoted (`'EOF'`, `"EOF"` or `\EOF`), which
 * bash leaves unexpanded: `$(...)`, backticks and `$VAR` in its body are
 * plain text.
 */
const QUOTED_HEREDOC = String.raw`<<(-?)\s*(?:'(\w+)'|"(\w+)"|\\(\w+))`;
const TARGET = String.raw`>>?\s*[^\s<>|;&]+`;
/**
 * An optional leading `cd <dir>;` or `cd <dir> &&`, with a plain directory:
 * no quotes, `$` or backticks. The line is kept, so the directory is still
 * checked.
 */
const LEADING_CD = String.raw`(?:cd\s+[^\s;&|<>()\`$'"]+\s*(?:;|&&)\s*)?`;
/**
 * A line that is only `cat` writing a quoted heredoc to a file, either
 * order, after at most a leading `cd`.
 */
const CAT_HEREDOC_TO_FILE = new RegExp(
  String.raw`^\s*${LEADING_CD}cat\s+(?:${TARGET}\s+${QUOTED_HEREDOC}|${QUOTED_HEREDOC}\s+${TARGET})\s*$`,
);

/**
 * The command without the bodies of quoted heredocs that `cat` writes
 * straight to a file (`cat > f <<'EOF'`, `cat <<"EOF" >> f`, also after a
 * leading `cd <dir>;` or `cd <dir> &&`). That text is
 * only written, never run or expanded, so prose in a report isn't taken for
 * paths or commands. The `cat` line itself, the terminator and everything
 * around them are kept. Any other heredoc is kept whole: unquoted (bash
 * expands `$(...)` and backticks in its body), fed to an interpreter, piped
 * on, after any command but a plain `cd` on its line, or not at the top
 * level: inside an outer heredoc or a quoted string.
 */
export function withoutFileHeredocs(command: string): string {
  const lines = command.split("\n");
  const kept: string[] = [];
  // Where a line starts: inside a quoted string, or inside an outer heredoc
  // that hasn't ended. A cat line is top-level, and skipped, only outside
  // both, since an outer unquoted heredoc or a string run by a shell would
  // expand what it holds.
  let quote: Quote;
  const outer: Heredoc[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    kept.push(line);
    const inside = outer[0];
    if (inside !== undefined) {
      if ((inside.dash ? line.replace(/^\t+/, "") : line) === inside.word) {
        outer.shift();
      }
      continue;
    }
    const match = quote === undefined ? CAT_HEREDOC_TO_FILE.exec(line) : null;
    quote = quoteAfter(line, quote);
    if (match === null) {
      if (quote === undefined) outer.push(...heredocsOpened(line));
      continue;
    }
    const dash = (match[1] ?? match[5]) === "-";
    const word = [2, 3, 4, 6, 7, 8]
      .map((group) => match[group])
      .find((w) => w !== undefined);
    const ends = (next: string) =>
      (dash ? next.replace(/^\t+/, "") : next) === word;
    let end = i + 1;
    while (end < lines.length && !ends(lines[end] ?? "")) end++;
    // An unterminated heredoc runs to the end of the command, as in bash.
    i = end - 1;
  }
  return kept.join("\n");
}

type Quote = "'" | '"' | undefined;
type Heredoc = { word: string; dash: boolean };

/**
 * The quote a line leaves open, given the one open at its start. Backslash
 * escapes outside single quotes, and a `#` comment outside quotes, are
 * followed; `$(...)` and backticks aren't, which errs toward not skipping.
 */
function quoteAfter(line: string, start: Quote): Quote {
  let quote = start;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote === "'") {
      if (c === "'") quote = undefined;
    } else if (c === "\\") {
      i++;
    } else if (quote === '"') {
      if (c === '"') quote = undefined;
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(line[i - 1] ?? ""))) {
      break;
    }
  }
  return quote;
}

/** The heredocs a line opens, in order, leaving out `<<<` here-strings. */
function heredocsOpened(line: string): Heredoc[] {
  return [
    ...line.matchAll(/(?<!<)<<(?!<)(-?)\s*(?:'(\w+)'|"(\w+)"|\\?(\w+))/g),
  ].map((m) => ({ word: m[2] ?? m[3] ?? m[4] ?? "", dash: m[1] === "-" }));
}

/**
 * The command with each inline sed or perl script blanked (`''`), so its
 * substitutions and addresses (`s/a,//`, `/re/p`, `y/a/b/`) aren't read as
 * paths. Narrow, by each tool's grammar: sed's first operand is the script
 * unless `-e`/`--expression` (or `-f`/`--file`, a script file) gives it;
 * perl's script follows a flag ending in `e` (`-e`, `-pe`, `-ne`). Option
 * arguments such as `-f <file>`, and every operand after the script, the
 * files it reads, stay as they were.
 */
export function withoutInlineScripts(command: string): string {
  const spans: [number, number][] = [];
  for (const match of command.matchAll(/(^|[\s;&|(`])(sed|perl)(?=[ \t])/g)) {
    const tool = match[2];
    let i = (match.index ?? 0) + match[0].length;
    let scriptNext = false;
    // The next word is an option's argument, such as `-f <file>`: kept.
    let argumentNext = false;
    let explicit = false;
    let scriptTaken = false;
    while (i < command.length) {
      while (command[i] === " " || command[i] === "\t") i++;
      if (i >= command.length || /[;&|)`\n]/.test(command[i] ?? "")) break;
      const start = i;
      i = wordEnd(command, i);
      const word = command.slice(start, i);
      if (scriptNext) {
        spans.push([start, i]);
        scriptNext = false;
        scriptTaken = true;
      } else if (argumentNext) {
        argumentNext = false;
      } else if (word.startsWith("-")) {
        if (
          tool === "sed" &&
          (/^-[A-Za-z]*e$/.test(word) || word === "--expression")
        ) {
          scriptNext = explicit = true;
        } else if (tool === "sed" && word.startsWith("--expression=")) {
          spans.push([start + "--expression=".length, i]);
          explicit = true;
        } else if (
          tool === "sed" &&
          (/^-[A-Za-z]*f$/.test(word) || word === "--file")
        ) {
          // The script is in a file, which stays checked.
          argumentNext = explicit = true;
        } else if (
          tool === "sed" &&
          (word.startsWith("--file=") || /^-[A-Za-z]*f./.test(word))
        ) {
          explicit = true;
        } else if (
          tool === "sed" &&
          (word === "-l" || word === "--line-length")
        ) {
          argumentNext = true;
        } else if (tool === "perl" && /^-[A-Za-z]*[eE]$/.test(word)) {
          scriptNext = explicit = true;
        }
      } else if (tool === "sed" && !explicit && !scriptTaken) {
        spans.push([start, i]);
        scriptTaken = true;
      } else {
        // The first operand: the files follow, and stay checked.
        break;
      }
    }
  }
  let out = command;
  for (const [start, end] of spans.reverse()) {
    out = `${out.slice(0, start)}''${out.slice(end)}`;
  }
  return out;
}

/** Where a shell word starting at `start` ends, through any quotes in it. */
function wordEnd(command: string, start: number): number {
  let i = start;
  while (i < command.length) {
    const c = command[i];
    if (c === "'") {
      const close = command.indexOf("'", i + 1);
      i = close === -1 ? command.length : close + 1;
    } else if (c === '"') {
      i++;
      while (i < command.length && command[i] !== '"') {
        i += command[i] === "\\" ? 2 : 1;
      }
      i++;
    } else if (c === "\\") {
      i += 2;
    } else if (/[\s;&|)`]/.test(c ?? "")) {
      break;
    } else {
      i++;
    }
  }
  return Math.min(i, command.length);
}

/**
 * Absolute paths a shell command names, bounded by whitespace, quotes,
 * shell punctuation, braces or commas. The root itself (`ls /`,
 * `find / ...`, `cd / && ...`) and any path whose first segment is a
 * wildcard (a star, `?`, `[` or `{`) always count. Otherwise a slash-led
 * word counts only if its first segment exists at the filesystem root (`/home`, `/etc`, `/tmp`),
 * so sed addresses such as `/## Events/` aren't taken for paths.
 */
export function shellPaths(command: string): string[] {
  // Braces and commas bound a path too, as in `{/etc/shadow,x}`, and so
  // does the `}` of `${IFS}`.
  const found = withoutInlineScripts(command).matchAll(
    /(?:^|[\s'"=:(<>|;&{},])(\/[^\s'"`;|&<>(){},]*)/g,
  );
  return [...found]
    .map((match) => match[1] ?? "")
    .filter((path) => {
      if (/^\/+$/.test(path)) return true;
      const first = path.split("/").find((part) => part !== "") ?? "";
      return /[*?[{]/.test(first) || existsSync(`/${first}`);
    });
}
