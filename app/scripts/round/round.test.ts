import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newStory, REF_KINDS, type Story } from "../../src/story/story";
import {
  credentialsPath,
  SANDBOX_HOME,
  TOOL_MOUNT,
} from "../comparison/sandbox";
import { checkTranscript } from "../comparison/transcript";
import { KIND_NAMES } from "../story";
import {
  beatsOf,
  beatsText,
  checkProblems,
  choosePoint,
  commandNames,
  GIT_LOG_CAP,
  MAX_POINTS,
  OPENING_SO_FAR,
  outlineBefore,
  outlinePrompt,
  type Point,
  paths,
  pointsInOrder,
  readRepoFile,
  recheck,
  resultText,
  type SessionRecord,
  STORY_MOUNT,
  sandboxedGitLog,
  scenePrompt,
  seeded,
  sessionIds,
  soFarPrompt,
  VOCAB_KINDS,
  vocabHits,
  WARLOCK_PREMISE,
  writerArgs,
  writerSandbox,
} from "./round";

function story(ids: string[]): Story {
  const s = newStory("A keeper and an inspector.");
  s.scenes = ids.map((id, i) => ({
    id,
    title: `Title ${id}`,
    summary: i % 2 === 0 ? `Summary of ${id}.` : "",
    actors: [],
    depicts: [],
    pressures: [],
    reveals: [],
    implies: [],
    withholds: [],
  }));
  return s;
}

const NOW = new Date("2026-11-05T00:00:00Z");

describe("prompts", () => {
  const outline = outlinePrompt({
    premise: WARLOCK_PREMISE,
    outlineSize: "roughly 25 to 40 chapters' worth of",
    craft: "CRAFT TEXT",
    skill: "SKILL TEXT",
  });

  test("the outline prompt holds the premise, the craft advice and the skill", () => {
    expect(outline).toContain(`Premise: ${WARLOCK_PREMISE}`);
    expect(outline).toContain("<craft>\nCRAFT TEXT\n</craft>");
    expect(outline).toContain("<skill>\nSKILL TEXT\n</skill>");
    expect(outline).toContain("roughly 25 to 40 chapters' worth of beats");
    expect(outline).toContain("model-gaps.md");
  });

  test("nothing bounds the bible or treats render as the story (8och)", () => {
    expect(outline).not.toMatch(/1,500|readable form|render/i);
  });

  test("the scene prompt names the scene file, the length and the links", () => {
    const text = scenePrompt({
      point: { sceneId: "storm", title: "The storm" },
      index: 2,
      count: 4,
      sceneWords: "1,200 to 2,000",
    });
    expect(text).toContain("scenes/storm.md");
    expect(text).toContain("second of the 4 scenes");
    expect(text).toContain("about 1,200 to 2,000 words");
    expect(text).toContain("reveals, implies and withholds");
  });

  test("the story-so-far prompt names only the outline and asks for a reply", () => {
    const text = soFarPrompt();
    expect(text).toContain("outline.md");
    expect(text).toContain("300 to 500 words");
    expect(text).toContain("final reply");
    expect(text).not.toMatch(/story\.json|STORY_CLI|tool|judge|Demiurge/);
  });
});

describe("the outline", () => {
  const s = story(["a", "b", "c", "d"]);

  test("beats list the scenes in telling order", () => {
    expect(beatsOf(s).map((b) => `${b.position}${b.id}`)).toEqual([
      "1a",
      "2b",
      "3c",
      "4d",
    ]);
    expect(beatsText(s)).toBe(
      "1. a: Title a\n   Summary of a.\n2. b: Title b\n3. c: Title c\n   Summary of c.\n4. d: Title d\n",
    );
  });

  test("the story so far's outline stops before its scene, with no IDs", () => {
    const text = outlineBefore(s, "c");
    expect(text).toContain("Premise: A keeper and an inspector.");
    expect(text).toContain("1. Title a. Summary of a.");
    expect(text).toContain("2. Title b.");
    expect(text).not.toContain("Title c");
    expect(text).not.toContain("Title d");
    expect(text).not.toMatch(/\b[a-d]:/);
    expect(outlineBefore(s, "a")).not.toContain("Title");
    expect(() => outlineBefore(s, "zz")).toThrow("no scene zz");
  });

  test("points come in the outline's current telling order", () => {
    const points = [
      choosePoint(s, [], { sceneId: "d", reason: "a reversal" }, NOW),
      choosePoint(s, [], { sceneId: "b", reason: "a reveal" }, NOW),
    ];
    expect(pointsInOrder(s, points).map((p) => [p.index, p.sceneId])).toEqual([
      [1, "b"],
      [2, "d"],
    ]);
    const moved = story(["d", "a", "b", "c"]);
    expect(pointsInOrder(moved, points).map((p) => p.sceneId)).toEqual([
      "d",
      "b",
    ]);
    expect(() => pointsInOrder(story(["a"]), points)).toThrow(
      "no longer has chosen scene",
    );
  });
});

describe("choosing points", () => {
  const s = story(["a", "b", "c", "d", "e", "f"]);

  test("a chosen point records its place and why", () => {
    expect(
      choosePoint(s, [], { sceneId: "c", reason: "the reveal" }, NOW),
    ).toEqual({
      sceneId: "c",
      title: "Title c",
      position: 3,
      beats: 6,
      how: "chosen",
      reason: "the reveal",
      chosenAt: NOW.toISOString(),
    });
    expect(() =>
      choosePoint(s, [], { sceneId: "c", reason: " " }, NOW),
    ).toThrow("--reason");
    expect(() =>
      choosePoint(s, [], { sceneId: "zz", reason: "x" }, NOW),
    ).toThrow("no scene zz");
  });

  test("a random point is drawn from the seed, never one already chosen", () => {
    const first = choosePoint(s, [], { seed: 42 }, NOW);
    expect(choosePoint(s, [], { seed: 42 }, NOW)).toEqual(first);
    expect(first.how).toBe("random");
    expect(first.seed).toBe(42);
    expect(first.reason).toContain("seed 42");
    const taken: Point[] = [];
    for (let seed = 1; seed <= MAX_POINTS; seed++) {
      const p = choosePoint(s, taken, { seed: 7 }, NOW);
      expect(taken.map((t) => t.sceneId)).not.toContain(p.sceneId);
      taken.push(p);
    }
    expect(() => choosePoint(s, taken, { seed: 1 }, NOW)).toThrow(
      "4 points are chosen",
    );
    expect(() =>
      choosePoint(
        s,
        taken.slice(0, 1),
        { sceneId: taken[0]?.sceneId ?? "", reason: "x" },
        NOW,
      ),
    ).toThrow("chosen already");
  });

  test("the generator is mulberry32", () => {
    const next = seeded(1);
    expect([next(), next()].map((x) => x.toFixed(6))).toEqual([
      "0.627074",
      "0.002736",
    ]);
  });
});

describe("the vocabulary check", () => {
  const help = `Start and read:
  init <premise>
  reader-order
      The order the reader learns things in.
  add-actor <id> <name>
  set-scene-links <id> <how> [<ref>...]
  mark-gap-deliberate <gap> <ref>`;

  test("commandNames takes the CLI's hyphenated commands from its help", () => {
    expect(commandNames(help)).toEqual([
      "add-actor",
      "mark-gap-deliberate",
      "reader-order",
      "set-scene-links",
    ]);
  });

  test("refs, command names and tool terms are hits; ordinary words aren't", () => {
    const commands = commandNames(help);
    const text = [
      "She opened the scene with a question.",
      "The actor:mara drive was clear.",
      "Run set-scene-links after.",
      "It was in story.json, the open-question of it.",
      "The reader ordered tea; an open question hung there.",
    ].join("\n");
    expect(
      vocabHits("scenes/1.md", text, commands).map(
        (h) => `${h.line} ${h.term}`,
      ),
    ).toEqual([
      "2 actor:mara",
      "3 set-scene-links",
      "4 story.json",
      "4 open-question",
    ]);
  });
});

describe("the writer's session", () => {
  test("the home is kept in the round, with the credentials read-only over it", () => {
    const round = "/r/round-1";
    const args = writerSandbox(round, process.execPath, process.execPath);
    const joined = args.join(" ");
    const home = joined.indexOf(`--bind ${paths(round).home} ${SANDBOX_HOME}`);
    const creds = joined.indexOf(
      `--ro-bind ${credentialsPath()} ${SANDBOX_HOME}/.claude/.credentials.json`,
    );
    expect(home).toBeGreaterThan(-1);
    // Mounted after the home, so it covers the home's copy.
    expect(creds).toBeGreaterThan(home);
    expect(joined).toContain(`--ro-bind ${paths(round).tool} ${TOOL_MOUNT}`);
    expect(joined).toContain(`--bind ${paths(round).work} ${STORY_MOUNT}`);
    expect(joined).toContain(`--setenv STORY_CLI ${TOOL_MOUNT}/story.js`);
    expect(joined).toContain("--setenv CLAUDE_CODE_DISABLE_AUTO_MEMORY 1");
  });

  test("the outline names the session and every scene resumes it", () => {
    const first = writerArgs("id-1", false);
    const later = writerArgs("id-1", true);
    expect(first.join(" ")).toContain("--session-id id-1");
    expect(first).not.toContain("--resume");
    expect(later.join(" ")).toContain("--resume id-1");
    expect(later).not.toContain("--session-id");
    for (const args of [first, later])
      expect(args).not.toContain("--no-session-persistence");
  });

  test("sessionIds and resultText read the transcript", () => {
    const jsonl = [
      JSON.stringify({ type: "system", subtype: "init", session_id: "s1" }),
      "not json",
      JSON.stringify({
        type: "result",
        session_id: "s1",
        result: "The story so far.",
      }),
    ].join("\n");
    expect(sessionIds(jsonl)).toEqual(["s1"]);
    expect(resultText(jsonl)).toBe("The story so far.");
    expect(resultText("")).toBeUndefined();
  });
});

describe("recheck", () => {
  const assistant = (content: unknown[]) =>
    JSON.stringify({
      type: "assistant",
      message: { model: "claude-opus-5-5", content },
    });
  const jsonl = [
    JSON.stringify({
      type: "system",
      subtype: "init",
      model: "claude-opus-5-5",
      session_id: "s",
    }),
    assistant([
      {
        type: "tool_use",
        name: "Bash",
        input: { command: `sed -i 's/a,//; s/it'"'"'s//' scenes/x.md` },
      },
    ]),
  ].join("\n");

  const summary = () =>
    checkTranscript(jsonl, STORY_MOUNT, {
      read: [STORY_MOUNT],
      write: [STORY_MOUNT],
    });

  test("checkProblems reads the exit, the model and the credentials", () => {
    const base = {
      exitCode: 0,
      timeoutSeconds: 60,
      credentials: { before: "a", after: "a" },
    };
    expect(checkProblems(base, jsonl, summary())).toEqual([]);
    expect(
      checkProblems(
        { ...base, exitCode: 124, credentials: { before: "a", after: "b" } },
        jsonl,
        summary(),
      ),
    ).toEqual([
      "timed out after 60s",
      "note: the credentials changed during the session (mounted read-only, so on the host)",
    ]);
  });

  test("redoes the transcript check and keeps the phase's own problems", () => {
    const round = mkdtempSync(join(tmpdir(), "round-test."));
    try {
      const dir = join(round, "phases", "scene-2");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "transcript.jsonl"), jsonl);
      const stale = "outside its directory: Bash: sed ...";
      const record: Partial<SessionRecord> = {
        exitCode: 0,
        timeoutSeconds: 60,
        cwd: STORY_MOUNT,
        credentials: { before: "a", after: "a" },
        checkProblems: [stale],
        problems: [stale, "scenes/x.md is missing or empty"],
      };
      writeFileSync(join(dir, "record.json"), JSON.stringify(record));
      expect(recheck(round, "scene-2", "abc")).toEqual([
        "scenes/x.md is missing or empty",
      ]);
      const saved = JSON.parse(
        readFileSync(join(dir, "recheck.json"), "utf8"),
      ) as { commit: string; checkProblems: string[] };
      expect(saved.commit).toBe("abc");
      expect(saved.checkProblems).toEqual([]);
      // record.json is kept as it was.
      expect(
        JSON.parse(readFileSync(join(dir, "record.json"), "utf8")),
      ).toEqual(record);
    } finally {
      rmSync(round, { recursive: true });
    }
  });

  test("the opening scene's story so far is a fixed line", () => {
    expect(OPENING_SO_FAR).toBe("Nothing yet: this scene opens the story.");
  });
});

describe("host processes never run what the writer controls (worldcrafter-f9l3)", () => {
  const git = (cwd: string, ...args: string[]) => {
    const r = Bun.spawnSync(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    return r.stdout.toString().trim();
  };

  test("the git log is read in a sandbox, so a planted gpg.program doesn't run on the host", () => {
    const repo = mkdtempSync(join(tmpdir(), "round-git."));
    const elsewhere = mkdtempSync(join(tmpdir(), "round-marker."));
    try {
      const marker = join(elsewhere, "ran");
      git(repo, "init", "-q", "-b", "main");
      // The reviewer's trick: a signed-looking commit, log.showSignature and
      // a gpg.program that is the writer's own script.
      const evil = join(repo, ".git", "evil.sh");
      writeFileSync(evil, `#!/bin/sh\necho ran > ${marker}\nexit 1\n`, {
        mode: 0o755,
      });
      git(repo, "config", "log.showSignature", "true");
      git(repo, "config", "gpg.program", evil);
      const tree = git(repo, "write-tree");
      const commit = [
        `tree ${tree}`,
        "author b <b@b> 1700000000 +0000",
        "committer b <b@b> 1700000000 +0000",
        "gpgsig -----BEGIN PGP SIGNATURE-----",
        " ",
        " iQEzBAABCAAdFiEE",
        " -----END PGP SIGNATURE-----",
        "",
        "The ferryman wrote the letter",
        "",
      ].join("\n");
      const object = Bun.spawnSync(
        ["git", "hash-object", "-t", "commit", "-w", "--stdin"],
        {
          cwd: repo,
          stdin: new TextEncoder().encode(commit),
          stdout: "pipe",
        },
      )
        .stdout.toString()
        .trim();
      git(repo, "update-ref", "refs/heads/main", object);

      // On the host, git log runs the script: the trick works.
      Bun.spawnSync(["git", "log"], {
        cwd: repo,
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(existsSync(marker)).toBe(true);
      rmSync(marker);

      const log = sandboxedGitLog(repo);
      expect(log).toContain("The ferryman wrote the letter");
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  test("the git log's output is capped, so a writer's repo can't flood host memory", () => {
    const repo = mkdtempSync(join(tmpdir(), "round-git."));
    try {
      git(repo, "init", "-q", "-b", "main");
      // A writer can make git print as much as it likes, for example with a
      // huge commit message (finding worldcrafter-rkqy).
      const tree = git(repo, "write-tree");
      const commit = [
        `tree ${tree}`,
        "author b <b@b> 1700000000 +0000",
        "committer b <b@b> 1700000000 +0000",
        "",
        "flood ".repeat(1_500_000),
        "",
      ].join("\n");
      const object = Bun.spawnSync(
        ["git", "hash-object", "-t", "commit", "-w", "--stdin"],
        { cwd: repo, stdin: new TextEncoder().encode(commit), stdout: "pipe" },
      )
        .stdout.toString()
        .trim();
      git(repo, "update-ref", "refs/heads/main", object);
      const log = sandboxedGitLog(repo);
      expect(log).toContain(`cut at ${GIT_LOG_CAP} bytes`);
      expect(log.length).toBeLessThan(GIT_LOG_CAP + 200);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("readRepoFile never follows a symlink out of the repository", () => {
    const repo = mkdtempSync(join(tmpdir(), "round-repo."));
    const outside = mkdtempSync(join(tmpdir(), "round-outside."));
    try {
      writeFileSync(join(outside, "credentials.json"), "secret");
      mkdirSync(join(repo, "scenes"));
      writeFileSync(join(repo, "scenes", "plain.md"), "Prose.");
      symlinkSync(
        join(outside, "credentials.json"),
        join(repo, "scenes", "link.md"),
      );
      symlinkSync(outside, join(repo, "linked-dir"));
      symlinkSync("plain.md", join(repo, "scenes", "inside-link.md"));
      expect(readRepoFile(repo, "scenes/plain.md")).toBe("Prose.");
      expect(readRepoFile(repo, "scenes/link.md")).toBeUndefined();
      expect(readRepoFile(repo, "scenes/inside-link.md")).toBeUndefined();
      expect(readRepoFile(repo, "linked-dir/credentials.json")).toBeUndefined();
      expect(readRepoFile(repo, "scenes/none.md")).toBeUndefined();
      expect(readRepoFile(repo, "scenes")).toBeUndefined();
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("the vocabulary check's kinds (worldcrafter-ts64)", () => {
  test("cover every record kind the story model has, as the CLI spells it", () => {
    for (const kind of [...REF_KINDS, "candidate" as const]) {
      const name = KIND_NAMES[kind];
      expect(VOCAB_KINDS).toContain(name);
      expect(
        vocabHits("f", `see ${name}:x-1 here`, []).map((h) => h.term),
      ).toContain(`${name}:x-1`);
    }
    expect(VOCAB_KINDS).toContain("constraint");
    expect(vocabHits("f", "candidate:who/ferryman", [])[0]?.term).toBe(
      "candidate:who/ferryman",
    );
  });
});
