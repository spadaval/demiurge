# Judging panel (worldcrafter-i2uz)

Runs the panel that gives the verdict on the blind comparison (decision
worldcrafter-zybl, strategy `docs/strategies/structure-first.md`, Verdicts):
three judges answer `docs/verdicts/comparison-rubric.md`, Part 1 blind and
Part 2 with the key, and the verdict is the call at least two make, else
change.

Isolation reuses the comparison harness (`../comparison/`): `sandboxArgs`
(bubblewrap with a fresh home, read-only OAuth credentials and an empty
`/tmp`), `spawnSession` (bwrap options through fd 3, output through pipes,
bounded by `timeout`), `ensureToken`, and `checkTranscript`.

## Judges

| Judge | Model |
| --- | --- |
| `opus` | `claude-opus-5-5` |
| `sonnet` | `claude-sonnet-5-5` |
| `fable` | `claude-fable-5-1` |

Each session runs with the tools `Bash,Read,Write` only, no tool mount, no
web, `--setting-sources project,local --strict-mcp-config
--disable-slash-commands`, bounded by `TIMEOUT_SECONDS` (3600).

## Layout

`<root>` is the comparison root: `packets/*.md` and `key/` (`key.md`,
`model-gaps/`, `failures.md`, `raw/`). Output goes to
`<root>/judging/<judge>/<part>/`, which no session mounts:

- `prompt.md`, `transcript.jsonl`, `stderr.txt`;
- `run.json`: model, rubric commit, the run dir, the sha256 of every file it
  held before the session, the claude flags and bwrap options, exit,
  duration, the transcript summary and problems;
- `STATUS`: `ok`, or `failed` and the problems;
- `part1.md` or `part2.md`, the report;
- `files/`: everything the run dir held afterwards;
- `RECORDED` (Part 1 only): the evidence ID, written by `mark-recorded`.

Each run dir is a fresh `/tmp/judge.XXXXXX` holding exactly:

- Part 1: `packets/*.md` and `rubric.md`;
- Part 2: those, plus `my-part1.md` (that judge's own Part 1), `key.md`,
  `model-gaps/` and `failures.md`. Not `key.json`, `raw/`, or any other
  judge's files.

The rubric comes from `git show <commit>:docs/verdicts/comparison-rubric.md`,
never the working tree.

A run fails, in `STATUS`, if claude exits non-zero or times out, the
transcript check finds anything outside the run dir, any model other than
the judge's answered (including Claude Code's fallback when a model's
safeguards refuse), an input file changed (so `my-part1.md` must come out
unchanged), the report is missing or empty, or Part 2's last line isn't
`VERDICT: keep|change|drop`. Failed runs aren't rerun: `--replacement`
moves the failed one to `<part>-failed-<n>` and runs a fresh session.

## Commands

From `app/`:

```sh
# Check each model ID is accepted and answers as itself, in the same sandbox.
bun scripts/judging/panel.ts probe

# Part 1. `all` runs the three concurrently if more than 4 GiB is available.
bun scripts/judging/panel.ts part1 <root> <opus|sonnet|fable|all> --rubric-commit <sha>

# After recording a judge's Part 1 as evidence:
bun scripts/judging/panel.ts mark-recorded <root> <judge> <evidence-id>

# Part 2: refuses unless that judge's Part 1 is ok, marked recorded, and used
# the same rubric commit.
bun scripts/judging/panel.ts part2 <root> <opus|sonnet|fable|all> --rubric-commit <sha>

# Replace one failed run, keeping the failed one beside it.
bun scripts/judging/panel.ts part1 <root> <judge> --rubric-commit <sha> --replacement

# The verdict, from the three Part 2 reports; also writes <root>/judging/verdict.md.
bun scripts/judging/panel.ts verdict <root>
```
