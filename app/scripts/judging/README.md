# Judging panels

Two runners share this directory and the comparison sandbox:

- `scenes.ts`, the **scene panel** for mission worldcrafter-gwx3
  (`docs/strategies/world-demo.md`, decision worldcrafter-jeue): four judges
  each score one scene against `docs/verdicts/world-demo-rubric.md`. Below.
- `panel.ts`, the **comparison panel** of the ended Structure first mission.
  It is kept as it ran; see [Comparison panel](#comparison-panel).

## Scene panel

Four judges, each a fresh session that sees one scene, its story so far and
the judge-facing part of the rubric, and nothing else. Scores are tabulated
per judge and never combined into a vote.

| Judge | Model | CLI |
| --- | --- | --- |
| `opus` | `claude-opus-5-5` | `claude -p`, tool `Read` |
| `sonnet` | `claude-sonnet-5-5` | `claude -p`, tool `Read` |
| `fable` | `claude-fable-5-1` | `claude -p`, tool `Read` |
| `grok` | `grok-4.7` | `~/.grok/bin/grok -p`, tool `read_file` |

### Input layout

The runner reads a round directory (worldcrafter-x2ij writes it):

```
<round>/scenes/<id>.md   the scene, prose only
<round>/so-far/<id>.md   its story so far, plain prose
```

`<id>` is letters, digits, `-` and `_` (`1` to `4` in practice); every scene
needs its story so far. Neither file should name Demiurge, the process, the
round or who wrote it: the judges get them as they are.

### What each judge gets

A fresh `/tmp/judge.XXXXXX` holding exactly `scene.md`, `story-so-far.md`
and `rubric.md`, the rubric from "## What you're judging" up to, not
including, "## Part 2", taken with `git show <commit>:<path>` (never the
working tree). The prompt (`scenePrompt`) names those three files, says to
read nothing else, and asks for the report as the final reply, in the form
the rubric's "Your report" section gives; it says nothing of parts,
sessions, rounds, other judges or the tool. The judge has a read tool only,
so it can't write: the runner saves the final reply as `report.md` (Claude:
the `result` event's text; Grok: the text streamed after its last tool
call). An earlier version asked for a `report.md` file; Sonnet answered in
its reply instead in two of three smoke runs.

### Sandbox

Both CLIs run in bubblewrap from `../comparison/sandbox.ts`
(`systemMounts`, `workdirAndEnv`, `spawnSandboxed`): system directories
read-only, an empty tmpfs `/tmp` and `/home`, the run directory the only
host directory mounted read-write, bwrap's options passed through fd 3 so no
host path is on a command line.

- **Claude judges**: `panel.ts`'s `judgeSession` with the tool `Read`:
  `~/.claude/.credentials.json` mounted read-only, the OAuth token checked
  on the host before each wave and refreshed there by a one-line `claude -p`
  (`ensureToken`).
- **Grok** (`grok.ts`) runs headless in the same sandbox. Its home is a
  fresh tmpfs holding only `~/.grok/auth.json`, mounted read-only, and a
  `config.toml` the runner writes (`auto_update = false`), also read-only.
  None of the host's `~/.grok` memory, sessions, config, skills, plugins or
  logs is mounted. The home itself has to be writable: Grok won't start if it
  can't create its session there ("Read-only file system", seen with
  `--remount-ro /home`); it is a tmpfs, discarded with the sandbox. The
  environment turns off memory, telemetry, feedback, subagents and web fetch,
  and sets `GROK_AUTH_EARLY_INVALIDATION_SECS=0` so the session never tries
  to refresh its token. Flags: `-m grok-4.7 --output-format streaming-json
  --tools read_file --disallowed-tools search_tool,use_tool
  --disable-web-search --no-subagents
  --permission-mode bypassPermissions --max-turns 30`.
  `--tools read_file` alone still offers Grok's MCP discovery tools
  (`search_tool`, and `use_tool`, a gateway to tools behind it), so they are
  removed with `--disallowed-tools`; with it the session is offered
  `read_file` alone (seen in the session's `available_commands`). The
  transcript check fails a run offered, or calling, any tool but
  `read_file`.
- **Grok's token** is refreshed on the host before each wave
  (`ensureGrokToken`): if the earliest `expires_at` in `auth.json` is within
  the wave's time, a one-line `grok -p` runs on the host with
  `GROK_AUTH_EARLY_INVALIDATION_SECS` set past it, which makes Grok refresh
  at once (seen: `expires_at` moved from 10:12Z to 13:10Z). Only the
  `expires_at` fields are read. That host run leaves a session in the host's
  `~/.grok/sessions`, as any host use does.
- run.json records the sha256 of the credentials file the sandbox mounted,
  before and after the session. A change is possible only from the host
  (another session refreshing), never from inside, as the mount is
  read-only. If they differ, STATUS gets a `note: credentials changed during
  the session` line and the tables repeat it under the run; it is a note,
  not a failure.

The T3 `delegate_task` fallback the issue allows for Grok isn't needed:
Grok runs sandboxed headless, so the runner has no fallback path.

### Checks and replacements

A run fails, in `STATUS`, if the CLI exits non-zero or times out
(`TIMEOUT_SECONDS`, 1800), the transcript shows a read or write outside the
run directory or any tool other than the ones given, another model answered
(Claude: `modelProblems`; Grok: the `end` event's `modelUsage` must name only
`grok-4.7` or `grok-4.7-build`, the id the CLI serves `grok-4.7` as, and
`stopReason` must be `end_turn`), a transcript line isn't JSON, an input
changed, the run dir gained any file, or there is no final reply or its
report is malformed. Malformed is the rubric's Part 2: not exactly one
```` ```json ```` block that parses, not exactly the template's keys at both
levels, a score that isn't a whole number from 1 to 10, or an empty string.

A failed run is moved to `<id>/<judge>-failed-<n>/` and a fresh session on
the same model replaces it (decision worldcrafter-zybl), up to `--attempts`
runs (default 3) per judge and scene in one invocation. Running `judge`
again skips runs that are ok and replaces failed ones. A run left `running`
(the runner killed with SIGKILL) is refused until its STATUS is set to
`failed` by hand. SIGINT or SIGTERM stops the sessions under way and records
each as failed.

Every evidence quote and best or worst moment is checked against the scene
after JSON unescaping and normalising quote marks (curly to straight) and
whitespace, and recorded as `verbatim`, `without outer quotes` (only once a
pair of quote marks around the whole quote is dropped), `ignoring emphasis`
(only once `*` and `_` are ignored) or `not in scene`. A quote is never
corrected, and a missing one doesn't fail the run.

### Files a session leaves

The runners never follow a symlink a session leaves: an input replaced by a
link counts as changed, and the comparison panel's report is refused if it
is a link (it could point at the host's credentials and be copied into the
output, or into a later session). The scene panel's judges have only a read
tool and can't leave files; their report comes from the transcript. Copies
of a run dir keep links as links.

### Memory

Judges run in waves. Before each wave the runner reads MemAvailable and
rounds it down to whole GiB, as `free -g` shows it: four at once only if that
is more than 5 (6 GiB or more), two if more than 3, else one
(`concurrencyFor`).

### Output

Under `<round>/judging/`, which no session mounts:

- `<id>/<judge>/`: `prompt.md`, `transcript.jsonl`, `stderr.txt`,
  `run.json` (model, run number, rubric path, commit, text sha256 and cut,
  input hashes, command, bwrap options, credentials hashes, exit, duration,
  transcript summary, problems), `STATUS`, `report.md`, `files/` (the run dir
  afterwards), `scores.json` (the parsed report and quote checks, ok runs
  only), and `grok-config.toml` for Grok;
- `<id>/<judge>-failed-<n>/`: each replaced run, as it was;
- `scores.md` and `scores.json`: per scene, the scores table (criterion ×
  judge), each judge's evidence with its quote check, best and worst moments,
  the quotes not found, the run that counted, and the failed runs replaced
  with their problems. `tabulate` refuses a round scored under more than one
  rubric text.

### Commands

From `app/`:

```sh
# Judge every scene with every judge (rubric at HEAD unless named).
bun scripts/judging/scenes.ts judge <round> --rubric-commit <sha>

# Only some scenes or judges; fewer or more tries per judge.
bun scripts/judging/scenes.ts judge <round> --rubric-commit <sha> --scene 2 --judge grok --attempts 1

# Rewrite scores.md and scores.json from the runs on disk.
bun scripts/judging/scenes.ts tabulate <round>
```

`judge` exits 1 if any judge has no ok run on a scene after its tries.

## Comparison panel

Runs the panel that gives the verdict on a blind comparison (decision
worldcrafter-zybl, strategy `docs/strategies/structure-first.md`, Verdicts):
three judges answer a rubric, Part 1 blind and Part 2 with the key, and the
verdict is the call at least two make, else change. The first panel
(worldcrafter-i2uz) used `docs/verdicts/comparison-rubric.md` on
`/home/supadava/projects/demiurge-comparison`; the second (worldcrafter-iu6l)
uses `docs/verdicts/comparison-2-rubric.md` on
`/home/supadava/projects/demiurge-comparison-2`. Both the rubric path and the
root are arguments.

Isolation reuses the comparison harness (`../comparison/`): `sandboxArgs`
(bubblewrap with a fresh home, read-only OAuth credentials and an empty
`/tmp`), `spawnSession` (bwrap options through fd 3, output through pipes,
bounded by `timeout`), `ensureToken`, and `checkTranscript`.

### Judges

| Judge | Model |
| --- | --- |
| `opus` | `claude-opus-5-5` |
| `sonnet` | `claude-sonnet-5-5` |
| `fable` | `claude-fable-5-1` |

Each session runs with the tools `Bash,Read,Write` only, no tool mount, no
web, `--setting-sources project,local --strict-mcp-config
--disable-slash-commands`, bounded by `TIMEOUT_SECONDS` (3600).

### Layout

`<root>` is the comparison root: `packets/*.md` and `key/` (`key.md`,
`model-gaps/`, `failures.md`, `raw/`). Output goes to
`<root>/judging/<judge>/<part>/`, which no session mounts:

- `prompt.md`, `transcript.jsonl`, `stderr.txt`;
- `run.json`: model, rubric commit, the sha256 of the rubric text the
  session got and where it was cut, the run dir, the sha256 of every file it
  held before the session, the claude flags and bwrap options, exit,
  duration, the transcript summary and problems;
- `STATUS`: `running` during the session, then `ok`, or `failed` and the
  problems. A runner error, SIGINT or SIGTERM writes `failed` with the
  reason;
- `part1.md` or `part2.md`, the report;
- `files/`: everything the run dir held afterwards;
- `RECORDED` (Part 1 only): JSON with the evidence ID and the sha256 of the
  `part1.md` it recorded, written by `mark-recorded`. Part 2 refuses if
  `part1.md` no longer matches it.

Each run dir is a fresh `/tmp/judge.XXXXXX` holding exactly:

- Part 1: `packets/*.md` and `rubric.md`, which holds only the rubric from
  "## What you're judging" up to, not including, "## Part 2". The title and
  preamble name the arms and the strategy; Part 2 names the arms and the
  tuned-on premise;
- Part 2: the packets, the whole rubric as `rubric.md`, plus `my-part1.md` (that judge's own Part 1), `key.md`,
  `model-gaps/` and `failures.md`. Not `key.json`, `raw/`, or any other
  judge's files.

Both rubric copies come from `git show <commit>:<rubric path>`, never the
working tree, and run.json records the path and the commit.

A session may read its run dir, plus the files Claude Code itself saved its
large tool results to, in the sandbox's own fresh home under
`~/.claude/projects/<the run dir's slug>/`, as those tool results name them.
Text that `cat` writes to a file from a heredoc with a quoted delimiter
(`cat > part1.md <<'EOF'`, `<<"EOF"` or `<<\EOF`), on a line of its own or
after a plain `cd <dir>;`, isn't checked as commands or paths, since bash
doesn't expand it. Only a top-level one counts: inside an outer heredoc or a
quoted string, the body is checked. The rest of the command is checked, and
so is the body of an unquoted heredoc. The check also reports `..` however
it's punctuated (`cd ..;`, `(cd ..)`), paths inside braces
(`{/etc/shadow,x}`), and `$IFS`.

A run fails, in `STATUS`, if claude exits non-zero or times out, the
transcript check finds anything outside the run dir, any model other than
the judge's answered, a refusal stopped it (Claude Code's fallback to another
model, safeguards stopping a response, a `refusal` stop, or a `<synthetic>`
message Claude Code writes in the model's place), any transcript line isn't
JSON, an input file changed (so `my-part1.md` must come out
unchanged), the report is missing or empty, or Part 2's last line isn't
`VERDICT: keep|change|drop`. Failed runs aren't rerun: `--replacement`
moves the failed one to `<part>-failed-<n>`, once the OAuth token has been
checked, and runs a fresh session. SIGINT or SIGTERM stops the sessions
under way and records each as failed, in run.json (`interrupted`) and
STATUS, keeping a files/ copy of its run dir. A SIGKILL of the runner leaves
`STATUS` at `running`; edit it to `failed` by hand before replacing that run.

Which Part 2 run counts is a decision, not something `verdict` guesses. Under
the flag rule (decision note d2401a0 on worldcrafter-i2uz), a flag starts a
diagnosis, and a run is replaced only if it produced no complete report or
actually read or wrote outside its material; so a run moved aside by
`--replacement` may still be the one that counts. A judge with one Part 2 run
counts it. One with more needs `--count <judge>=<run>`, and verdict.md
records the choice and the runs not counted.

### Commands

From `app/`:

```sh
# Check each model ID is accepted and answers as itself, in the same sandbox.
bun scripts/judging/panel.ts probe

# Part 1. `all` runs the three concurrently if more than 4 GiB is available.
bun scripts/judging/panel.ts part1 <root> <opus|sonnet|fable|all> --rubric <path> --rubric-commit <sha>

# After recording a judge's Part 1 as evidence:
bun scripts/judging/panel.ts mark-recorded <root> <judge> <evidence-id>

# Part 2: refuses unless that judge's Part 1 is ok, marked recorded, and used
# the same rubric path and commit.
bun scripts/judging/panel.ts part2 <root> <opus|sonnet|fable|all> --rubric <path> --rubric-commit <sha>

# Replace one failed run, keeping the failed one beside it.
bun scripts/judging/panel.ts part1 <root> <judge> --rubric <path> --rubric-commit <sha> --replacement

# Re-run the checks on a finished part's saved transcript and files, after a
# fix to the checks; also on a run moved aside by --replacement, by its
# directory name (part2-failed-1). Keeps the first STATUS as STATUS.original, rewrites STATUS
# with the result and the commit, and writes recheck.json. Refuses with
# uncommitted changes to the runner or the checks, and for a part whose
# runner failed or was interrupted.
bun scripts/judging/panel.ts recheck <root> <judge> <part1|part2|<part>-failed-<n>>

# The verdict, from the Part 2 run that counts for each judge; also writes
# <root>/judging/verdict.md. Refuses if a judge has more than one Part 2 run
# and no --count names one, or the run named isn't ok.
bun scripts/judging/panel.ts verdict <root> [--count <judge>=<run>]...
```
