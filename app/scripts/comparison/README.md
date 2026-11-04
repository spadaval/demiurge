# Blind comparison harness (worldcrafter-04z5)

Runs the comparison of the story tool against plain Markdown notes, and
writes it up as blind packets for Sumeet to read (worldcrafter-i2uz). Both
arms get the same task text and the same craft advice, so the tool is the
only difference. Blinding is partial: format may give an arm away, and
that's accepted.

Files: `prompts.ts` (the four step prompts and the two premises),
`comparison.ts` (freeze, runs, snapshots, packets, key), `transcript.ts`
(the check for reads outside a run), `packet.ts` (the packet layout).

## Layout

The root is `/home/supadava/projects/demiurge-comparison/`, outside this
repository.

- `frozen/`: the frozen tool. `story.js` (the CLI built with
  `bun build --target=bun`), `story-sketch/SKILL.md` and `craft.md`, and
  `FROZEN.json` with the commit, the Claude Code version and the model.
- `packets/`: one Markdown file per run, `<premise>-pair-<n>-<A|B>.md`.
  Nothing in here says which arm a packet is.
- `key/`: open only after the packets are judged. `key.md` and `key.json`
  map packets to arms; `failures.md` lists every step's exit, duration,
  problems and the transcript check's findings; `model-gaps/<run>.md` holds
  the tool runs' model-gaps logs; `raw/<run>/` holds `run.json` and, per
  step, the prompt, the transcript (`transcript.jsonl`), stderr, the git log,
  the readable text and a full copy of the run's directory (`files/`, with
  its `.git`).
- `smoke/`: the phase A smoke test, with its own `frozen/`, `key/` and
  `packets/`. Not part of the comparison.

Each run works in its own new git repository, `/tmp/story.XXXXXX`, never in
this repository.

## Commands

From `app/`:

```sh
# Freeze: refuses if the tool, skill or harness has uncommitted changes, or
# the directory exists.
bun scripts/comparison/comparison.ts freeze /home/supadava/projects/demiurge-comparison/frozen

# Phase B: the eight runs in a random order, one at a time, then the packets.
# Refuses if the harness differs from the frozen commit, or a key or packets
# already exist.
bun scripts/comparison/comparison.ts phase-b /home/supadava/projects/demiurge-comparison

# Smoke tests: one run (Thukker only), then packets for what's in <out>/key.
bun scripts/comparison/comparison.ts run <out> <frozen> <tool|notes> thukker
bun scripts/comparison/comparison.ts packets <out>
```

## The runs

Two premises (Thukker; magical girl therapist), two tool runs and two notes
runs each: eight runs, all on `claude-opus-5-5`. Each run has four steps, and
each step is a fresh `claude -p` session that sees only its prompt and what
the run has saved so far:

1. Sketch the story from the premise, about 1,500 words readable (tool runs
   check with `render`).
2. Change a core motivation of the main character, or an event behind it;
   write a sentence or two in `rework-1-note.md`.
3. Shift a significant event earlier or later; note in `rework-2-note.md`.
4. Draft one scene of about 800 words in `scene.md`, scratch, not stored in
   the story.

Both arms get `craft.md` inlined. The tool arm also gets `SKILL.md` inlined,
`STORY_CLI` pointing at the frozen `story.js`, and `--add-dir` for the frozen
directory; the notes arm gets none of these, and keeps the story in
`story.md`. Sessions are told to work only in their directory and not to name
tools or commands in anything written for the reader.

Steps run one at a time; before each, the harness waits until at least 3 GiB
of memory is available. Each step is bounded by `timeout 2700` (there's no
`--max-turns` in this Claude Code). A run stops early only if step 1 leaves no
readable story.

### Session flags and environment

```sh
env -i PATH=<bun dir>:<claude dir>:/usr/local/bin:/usr/bin:/bin HOME=$HOME USER=$USER \
  LANG=C.UTF-8 CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 [STORY_CLI=<frozen>/story.js] \
  timeout --kill-after=60 2700 claude -p "<prompt>" \
  --model claude-opus-5-5 --setting-sources project,local --strict-mcp-config \
  --disable-slash-commands --tools Bash,Read,Edit,Write,ToolSearch,WebFetch,WebSearch \
  --permission-mode bypassPermissions --no-session-persistence \
  --output-format stream-json --verbose --include-hook-events [--add-dir <frozen>]
```

- `--setting-sources project,local` leaves out user settings, so user hooks
  and `~/.claude/CLAUDE.md` don't load; the run directory has no project or
  local settings. `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` turns off auto memory.
- `--disable-slash-commands` turns off user skills and commands;
  `--strict-mcp-config` with no `--mcp-config` loads no MCP servers.
- `--tools` limits the session to the listed built-ins: no subagents (whose
  reads would be harder to check) and nothing that messages other sessions,
  schedules work or makes worktrees. Web access is allowed for both arms and
  reported by the transcript check.
- `env -i` keeps the harness's own environment out.
- Built-in plugins still load, and git uses the user's identity. Each step's
  init event (skills, MCP servers, plugins, model) is in its transcript, and
  `failures.md` lists every answering model.
- Auth: OAuth from `~/.claude` (`HOME` is passed). `--bare` would need an API
  key.
- `bypassPermissions` is acceptable because each session runs unattended in
  its own throwaway repository.

### The transcript check

For every tool call in a step's transcript, it reports file tools on paths
outside the run directory (plus the frozen directory, for tool runs only),
shell commands that name an absolute path outside them or use `~`, `$HOME` or
`..`, and any web access. It reports and never blocks; a reported item may be
harmless, and the reader of `failures.md` judges.

## Packets

Each packet, the same shape for both arms:

1. The sketch: the readable text after step 1 (tool runs: `render`, without
   its own word-count line; notes runs: `story.md` as written), headings
   pushed down two levels, and a word count.
2. First rework: the session's note, then a line diff (`git diff --no-index
   -U3`) of the readable text from step 1 to step 2, and the length after.
3. Second rework: the same, step 2 to step 3.
4. The scene, `scene.md` as written, with a word count.

Nothing is truncated. A step that produced nothing is marked missing. Each
premise's tool runs and notes runs are shuffled and paired one of each, and
within a pair the letters A and B are assigned at random.

## Failures

A step fails if `claude` exits non-zero or times out, an expected file is
missing, the readable text can't be produced, or another model answered.
Failed runs are counted in `failures.md` and flagged in the key; they are
never rerun, and phase B refuses to start over a root that already has a key.
If phase B stops partway, what to do is the human's call.

## Tuned-on

The Thukker premise was used to build the tool, so its pairs are marked
tuned-on in the key and weigh less in the verdict. The magical girl therapist
premise is run only by `phase-b`, after the freeze; `run` refuses it.
