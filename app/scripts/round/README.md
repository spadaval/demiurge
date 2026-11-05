# Round runner

Runs one round of mission worldcrafter-gwx3 (`docs/strategies/world-demo.md`,
"The exercise"; decision worldcrafter-jeue; issue worldcrafter-x2ij). Its
output is what the scene panel (`../judging/scenes.ts`) judges.

1. **Outline.** A fresh, sandboxed `claude-opus-5-5` writer gets the
   premise, `craft.md` and the story-sketch `SKILL.md` inlined, and the story
   CLI as `STORY_CLI`, and builds a rich world and a novel-scale outline
   (roughly 25 to 40 chapters' worth of beats) as scenes in telling order in
   `story.json`, keeping `model-gaps.md`. The prompt says nothing about the
   story's content beyond the premise, sets no length on the bible and
   never treats `render` as the story (finding 8och: the comparison's
   prompts and packets are not reused).
2. **Points.** The orchestrator, not the runner, picks up to four scenes
   from the outline, by hand or at random with a seed, and the runner
   records each choice and how it was made.
3. **Scenes.** The same writer session is resumed, once per point, in
   telling order, and asked for that scene's prose (about 1,200 to 2,000
   words) in `scenes/<scene-id>.md`, linked in the story file to what it
   reveals, implies and withholds.
4. **Story so far.** A fresh agent per scene gets only the premise and the
   outline's beats before that scene, as plain text with no IDs, and writes
   300 to 500 words of plain prose as its final reply. The outline's first scene
   has nothing before it, so its story so far is the fixed line "Nothing yet:
   this scene opens the story.", with no agent.

   **Length (worldcrafter-zevg).** The prompt says the text must be 300 to
   500 words, never more than 500, giving the main lines rather than every
   event (Round 2's came out at 797, 741, 662 and 556 words). If the reply is
   under 250 or over 550 words, the same agent is resumed once, still with
   Read only, told its count and asked to revise to length (phase
   `so-far-<n>-revise`). Its session is saved in a home kept on the host
   only for the phase, with the credentials read-only over it, then removed.
   The revision, if it gives a reply, is what `so-far/<n>.md` holds. Both
   replies are kept as `reply.md` in their phase directories. A text still
   outside 300 to 500 words is a note, not a failure. In a smoke on Round 2's
   outline (its first scene, which came out at 797 words then), the first
   reply was 671 words and the revision 511. The judge prompt and rubric
   are unchanged.
5. **Vocabulary check.** Every scene and story so far is checked for the
   tool's vocabulary, and any hit is reported before judging.

## The writer's sandbox and resuming

The writer runs in the comparison's bubblewrap sandbox (`systemMounts`,
`spawnSandboxed`), except that its home is not a tmpfs: it is
`<round>/writer-home/`, bound read-write, so the session Claude Code saves
there (`.claude/projects/-story/<session-id>.jsonl`) is still there for the
scenes. `~/.claude/.credentials.json` is bound read-only over the home's copy
(bwrap leaves an empty placeholder file at
`writer-home/.claude/.credentials.json`; the real file is never copied), and
the OAuth token is checked and refreshed on the host before every session
(`ensureToken`). The host's `~/.claude` is never mounted.

The story repository is `<round>/work/`, mounted at `/story`, the writer's
working directory, so a resumed session finds the same project. The CLI and
skill are built from the repository's working tree when the outline phase
starts (`buildTool`: `bun build` of `app/scripts/story.ts`, plus `SKILL.md`
and `craft.md`) into `<round>/tool/`, made read-only and mounted at
`/opt/story-tool`. `run.json` records the commit, `git status` of the tool's
sources at that moment, and the sha256 of every built file.

The outline runs with `--session-id <uuid>`; every scene runs with
`--resume <uuid>`, and fails if its transcript names any other session.
Resuming works in the sandbox (checked before building this: a resumed
session recalled a word given in the first). The fallback the issue allows,
fresh scene sessions, isn't implemented.

The writer has `Bash,Read,Edit,Write`, no web and no subagents. Its
transcripts are checked like the comparison's: it may read `/story`, the
tool and the files its own large tool results were saved to, and write only
`/story`.

## What the host never does with the writer's files

The writer controls everything in `<round>/work/` and `<round>/writer-home/`,
including `.git/config`, so no host process runs anything there that could
execute their content (worldcrafter-f9l3):

- **No host git in the story repository.** A writer's `.git/config` can make
  `git log` run a program (`log.showSignature` with a `gpg.program`, a
  textconv, an fsmonitor). The snapshot's git log runs in its own sandbox
  (`sandboxedGitLog`): the repository read-only, empty tmpfs `/tmp` and
  `/home`, no network, no credentials, `GIT_CONFIG_GLOBAL=/dev/null`.
  A test plants the reviewer's trick in a scratch repository, shows host
  `git log` runs it, and shows the sandboxed one doesn't reach the host. The
  only host git in `work/` is `git init`, before the writer exists.
- **No symlink is followed.** `story.json` and each `scenes/<id>.md` are read
  only if they are plain files at their own real path (`readRepoFile`), so a
  link to the host's credentials can't be copied into what the judges read.
  The snapshot copies links as links.
- **No writer file is run.** The host runs only the CLI it built into
  `tool/` (made read-only, mounted read-only), on its own `--help`.
- `writer-home/` is only ever mounted; the host reads nothing in it.

The ended comparison harness (`../comparison/comparison.ts`, `runOne`) still
runs host `git log` in its writer's repository; it has the same hole, and
must not be reused as it stands.

## Timeouts

| Phase | Seconds | Why |
| --- | --- | --- |
| outline | 7200 | The comparison gave a 1,500-word sketch 2700; a novel-scale world and outline is several times that. |
| each scene | 3600 | One scene's prose, links and commits, with the whole outline in context. |
| each story so far | 900 | One short reply. |

## Layout

`<round>` is `/home/supadava/projects/demiurge-world/round-<n>/`:

- `run.json`: premise, outline size, model, `claude --version`, commit,
  uncommitted tool sources, tool hashes, session ID, and every session's
  record;
- `tool/`, `writer-home/`, `work/` (the story repository: `story.json`,
  `scenes/`, `model-gaps.md`, its git history);
- `beats.md`: the outline's scenes in telling order (`beats` rewrites it);
- `points.json`: each chosen point: scene ID, title, place in the telling
  order and how many beats there were, `chosen` or `random`, the reason,
  the seed for a random one, and when;
- `scene-order.json`: which scene ID each `scenes/<n>.md` is;
- `phases/<phase>/` for `outline`, `scene-<n>`, `so-far-<n>` and
  `so-far-<n>-revise`: `prompt.md`,
  `transcript.jsonl`, `stderr.txt`, `record.json` (command, bwrap options,
  exit, duration, credentials hash before and after, transcript summary,
  `checkProblems` from the exit, transcript and credentials, and all
  `problems`), and for the writer `work/` and `git-log.txt` as the session
  left them; for a story so far, the `outline.md` it got and its
  `reply.md`;
- `scenes/<n>.md` and `so-far/<n>.md`, `n` from 1 in telling order: what
  the judges read, as `scenes.ts judge` expects;
- `vocabulary.md`: the vocabulary check.

## Commands

From `app/`, with `R=/home/supadava/projects/demiurge-world/round-<n>`:

```sh
# 1. The world and outline (the warlock premise unless --premise is given).
bun scripts/round/round.ts outline $R

# 2. List the beats, then record four points.
bun scripts/round/round.ts beats $R
bun scripts/round/round.ts choose $R <scene-id> --reason "the reveal of ..."
bun scripts/round/round.ts choose-random $R --seed <n> [--range <a>-<b>]

# 3. The scenes, by the resumed writer, in telling order.
bun scripts/round/round.ts scenes $R

# 4. The story so far for each scene.
bun scripts/round/round.ts so-far $R

# 5. The vocabulary check (also run after phases 3 and 4); exits 1 on a hit.
bun scripts/round/round.ts vocab $R

# Then judge.
bun scripts/judging/scenes.ts judge $R --rubric-commit <sha>
```

A transcript check finding that turns out to be a false positive is fixed in
the check, committed, and the phase rechecked:

```sh
bun scripts/round/round.ts recheck $R <phase>   # outline, scene-<n>, so-far-<n>[-revise]
```

It redoes the exit, model, transcript and credentials checks on the saved
transcript as the check stands now, keeps `record.json` as it was, and writes
`recheck.json` (commit, new transcript summary, the problems with the new
check's in place of the old). It refuses uncommitted changes to the runners
or the checks. (The first smoke found one: a writer's
`sed 's/...//; s/it'"'"'s//'` read as naming `//`, now handled in
`../comparison/transcript.ts`.)

`scenes` and `so-far` skip a scene whose output exists. A phase whose
directory exists is refused; move a failed one aside to rerun it. `scenes`
stops at a failed scene, so later ones keep their order.

`choose-random` draws uniformly, with mulberry32 seeded by `--seed`, among
the beats not yet chosen, so the same seed and choices give the same point. With `--range <a>-<b>` it draws only among
beats `a` to `b` (1-based positions in telling order, inclusive, as `beats`
numbers them), so a round can draw one point from each half of the arc
(`--range 1-15`, then `--range 16-30`). `points.json` records the range
beside the seed. A range past the last beat, or with every beat in it
already chosen, is refused.
