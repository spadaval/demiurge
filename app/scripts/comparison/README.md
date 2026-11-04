# Blind comparison harness (worldcrafter-04z5)

Runs the comparison of the story tool against plain Markdown notes, and
writes it up as blind packets for Sumeet to read (worldcrafter-i2uz). Both
arms get the same task text and the same craft advice, so the tool is the
only difference. Blinding is partial: format may give an arm away, and
that's accepted.

Files: `prompts.ts` (the four step prompts and the two premises),
`comparison.ts` (freeze, runs, snapshots, packets, key), `sandbox.ts` (the
bubblewrap sandbox each session runs in), `transcript.ts` (the check for
reads and writes outside a run), `packet.ts` (the packet layout).

## Layout

The root is `/home/supadava/projects/demiurge-comparison/`, outside this
repository.

- `frozen/`: `tool/` holds the frozen tool: `story.js` (the CLI built with
  `bun build --target=bun`) and `story-sketch/SKILL.md` and `craft.md`.
  Beside it, `FROZEN.json` holds the commit, the Claude Code version, the
  model and the sha256 of every file in `tool/`. Freezing makes all of it
  read-only (`chmod -R a-w`). Only `tool/` is ever mounted into a session.
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

Each run works in its own new git repository, `/tmp/story.XXXXXX` on the
host, never in this repository. The harness removes it when the run ends, so later runs
can't find it; every step's snapshot in `key/raw/` holds a full copy.

## Commands

From `app/`:

```sh
# Freeze: refuses if the tool, skill or harness has uncommitted changes, or
# the directory exists. Run it after the last commit to the harness.
bun scripts/comparison/comparison.ts freeze /home/supadava/projects/demiurge-comparison/frozen

# Phase B: the eight runs in a random order, one at a time, then the packets.
# Refuses if a key or packets already exist, if the tool, skill or harness
# differs from the frozen commit or has uncommitted changes, or if the frozen
# tool's hashes don't match.
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
the frozen tool mounted read-only at `/opt/story-tool`, `STORY_CLI` set to
`/opt/story-tool/story.js`, and `--add-dir /opt/story-tool`. The notes arm
gets none of these, and keeps the story in `story.md`. Sessions are told to
work only in their directory and not to name tools or commands in anything
written for the reader; the sandbox enforces the first.

Steps run one at a time. Before each, the harness waits until at least 3 GiB
of memory is available, and makes sure the OAuth access token outlives the
step (see Auth below). After each, it checks the frozen tool's hashes and
stops the whole run with an error if they've changed. Each step is bounded by `timeout 2700` (there's no
`--max-turns` in this Claude Code). A run stops early only if step 1 leaves no
readable story.

### The sandbox

Each session runs under bubblewrap (`/usr/bin/bwrap`, `sandbox.ts`), so the
isolation doesn't rest on the prompt. The session sees:

- `/usr` and `/etc` read-only (with the `/bin`, `/lib`, `/lib64`, `/sbin`
  links), `/run/systemd/resolve` for DNS, and its own `/proc` and `/dev`;
- an empty tmpfs at `/tmp`, holding only its own run directory, bound
  read-write at the same path;
- an empty tmpfs at `/home`, with its home at `/home/writer`, holding only
  `~/.claude/.credentials.json`, bound read-only: the T3 server on this host
  depends on that file, so no session may write it (see Auth below). Nothing
  else from `~/.claude` (memory, `CLAUDE.md`,
  settings, transcripts) is there, and the host's `~/.claude.json` isn't
  either (claude writes a fresh one into the tmpfs);
- `claude` and `bun` bound read-only into `/opt/bin`;
- for tool runs only, the frozen `tool/` read-only at `/opt/story-tool`.
  `FROZEN.json` and the commit are never mounted.

So this repository, `/home/supadava/projects`, the rest of `/tmp`, other
runs, `key/` and `smoke/` aren't visible. Every namespace but the network
is unshared. The network stays open because the session needs the API, so
network use from Bash (`curl`, `git clone`, `pip install` and so on) is
detected by the transcript check, not prevented. bwrap can only share or cut
the network as a whole; allowing just the API would need a filtering proxy
or firewall rules in a separate network namespace, which isn't worth
building here.

bwrap gets its options through `--args 3` from a file that's deleted as soon
as it's open, so its command line, which a session could see with `ps`,
names no host paths.

### Session flags and environment

```sh
timeout --kill-after=60 2700 bwrap --args 3 [fd 3: the mounts above, --chdir <run dir>, --clearenv, \
  --setenv PATH /opt/bin:/usr/bin:/bin --setenv HOME /home/writer --setenv USER writer \
  --setenv LANG C.UTF-8 --setenv CLAUDE_CODE_DISABLE_AUTO_MEMORY 1 --setenv DISABLE_AUTOUPDATER 1 \
  --setenv GIT_AUTHOR_NAME Writer --setenv GIT_AUTHOR_EMAIL writer@example.invalid (and committer) \
  [--setenv STORY_CLI /opt/story-tool/story.js]] \
  claude -p "<prompt>" \
  --model claude-opus-5-5 --setting-sources project,local --strict-mcp-config \
  --disable-slash-commands --tools Bash,Read,Edit,Write \
  --permission-mode bypassPermissions --no-session-persistence \
  --output-format stream-json --verbose --include-hook-events [--add-dir /opt/story-tool]
```

Each run's exact sandbox and flags are in its `run.json`.

- The fresh home keeps user settings, hooks, `CLAUDE.md`, memory, skills and
  MCP configuration out. `--setting-sources project,local`,
  `--disable-slash-commands`, `--strict-mcp-config` and
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` keep them out as well.
- `--tools` limits the session to four built-ins. Left out: subagents, whose
  reads would be harder to check; the web, because this repository is public
  and a search could find the comparison and the held-back premise; and
  anything that messages other sessions, schedules work or makes worktrees.
- `--clearenv` keeps the harness's environment out. Commits are made as a
  neutral "Writer".
- Built-in plugins still load. Each step's init event (skills, MCP servers,
  plugins, model) is in its transcript, and `failures.md` lists every
  answering model.
- Auth: OAuth, through the read-only `.credentials.json`. `--bare` would
  need an API key. A session can't write the file, so it must never need to
  refresh the token: before each step the harness checks that the access
  token outlives the step by ten minutes. If it doesn't, the
  harness waits for the token to lapse, then runs a one-line `claude -p` on
  the host to refresh it, and stops if it's still not fresh.
- `bypassPermissions` is acceptable because each session runs unattended in
  a sandbox over its own throwaway repository.

### The transcript check

The sandbox prevents access; the check records any attempt. For every tool
call in a step's transcript, it reports:

- file reads outside the run directory (plus `/opt/story-tool`, for tool
  runs only);
- `Edit` or `Write` anywhere outside the run directory;
- shell commands that name the root (`ls /`, `find / ...`, `cd / && ...`), a
  path whose first segment is a wildcard, or an absolute path outside the
  allowed directories, or that use `~`, `$HOME` or `..`. A slash-led word
  counts as a path when its first segment exists at `/`, so sed addresses
  like `/## Events/` don't;
- shell commands that use the network: a URL (`scheme://`), a network
  client in command position (`curl`, `wget`, `ssh`, `nc`, `npx` and so
  on), `git clone`/`fetch`/`pull`/`push`/`ls-remote`/`remote`, a package
  install (`pip`, `npm`, `bun add`, ...), `/dev/tcp`, or `urllib`;
- anything naming `.credentials.json`;
- process listings (`ps`, `pgrep`, `top`, ...) and anything under `/proc/`;
- any web tool, though none is offered.

It reports and never blocks; a reported item may be harmless, and the
reader of `failures.md` judges.

## Packets

Each packet, the same shape for both arms:

1. The sketch: the readable text after step 1 (tool runs: `render`, without
   its own word-count line; notes runs: `story.md` as written), headings
   pushed down two levels, and a word count.
2. First rework: the session's note, then a line diff (`git diff --no-index
   -U3`) of the readable text from step 1 to step 2, and the length after.
   Before diffing, both arms' text is put one sentence per line, so the diff
   shows the sentences that changed with a little context, not whole
   paragraphs.
3. Second rework: the same, step 2 to step 3.
4. The scene, `scene.md` as written, with a word count.

Nothing is truncated. A step that produced nothing is marked missing. Each
premise's tool runs and notes runs are shuffled and paired one of each, and
within a pair the letters A and B are assigned at random.

## Failures

A step fails if `claude` exits non-zero or times out, an expected file is
missing, the readable text can't be produced, another model answered, or
step 4 changed the story. `failures.md` re-runs the transcript check on the
saved transcripts, which are the source of truth for what a step read.
Failed runs are counted in `failures.md` and flagged in the key; they are
never rerun, and phase B refuses to start over a root that already has a key.
If phase B stops partway, what to do is the human's call.

## Tuned-on

The Thukker premise was used to build the tool, so its pairs are marked
tuned-on in the key and weigh less in the verdict. The magical girl therapist
premise is run only by `phase-b`, after the freeze; `run` refuses it.
