import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freeze, lineDiff, main, phaseB, writePackets } from "./comparison";
import {
  diffHunks,
  packetMarkdown,
  SECTION_TITLES,
  sentenceLines,
} from "./packet";
import { PREMISES, STEPS, stepPrompt } from "./prompts";
import { checkTranscript } from "./transcript";

const tool = (name: string, input: Record<string, unknown>) =>
  JSON.stringify({
    type: "assistant",
    message: {
      model: "claude-opus-5-5",
      content: [{ type: "tool_use", name, input }],
    },
  });

describe("transcript check", () => {
  const run = "/tmp/story.abc";
  const frozen = "/opt/story-tool";
  const jsonl = [
    JSON.stringify({
      type: "system",
      subtype: "init",
      model: "claude-opus-5-5",
      skills: [],
    }),
    tool("Read", { file_path: "story.md" }),
    tool("Read", { file_path: "/tmp/story.abc/scene.md" }),
    tool("Read", { file_path: "/opt/story-tool/story-sketch/SKILL.md" }),
    tool("Read", { file_path: "/home/someone/projects/demiurge/AGENTS.md" }),
    tool("Bash", { command: 'bun "$STORY_CLI" story.json render 2>/dev/null' }),
    tool("Bash", {
      command:
        "bun $STORY_CLI story.json render | sed -n '/## People/,/## Events/p'",
    }),
    tool("Bash", {
      command: "bun $STORY_CLI story.json show x | sed -n 's/^touches: //p'",
    }),
    tool("Bash", {
      command: "cat >> model-gaps.md <<'EOF'\n- About ~1,500 words.\nEOF",
    }),
    tool("Bash", { command: "cat ../other/story.md" }),
    tool("Bash", { command: "ls ~/.claude" }),
    tool("Bash", { command: "cat /etc/passwd" }),
    tool("Bash", { command: "find / -name story.md" }),
    tool("Bash", { command: "grep -rl Thukker /" }),
    tool("Bash", { command: "ls /" }),
    tool("Bash", { command: "cat /*/supadava/x" }),
    tool("Bash", { command: "cd / && cat home/someone/AGENTS.md" }),
    tool("Write", { file_path: "/opt/story-tool/story.js", content: "" }),
    tool("Edit", { file_path: "/tmp/story.abc/story.md" }),
    tool("WebSearch", { query: "Thukker tribe" }),
    "not json",
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 5,
    }),
  ].join("\n");

  test("reports reads outside the allowed directories, and nothing inside them", () => {
    const summary = checkTranscript(jsonl, run, {
      read: [run, frozen],
      write: [run],
    });
    expect(summary.outside.map((f) => f.detail)).toEqual([
      "/home/someone/projects/demiurge/AGENTS.md",
      "cat ../other/story.md",
      "ls ~/.claude",
      "cat /etc/passwd",
      "find / -name story.md",
      "grep -rl Thukker /",
      "ls /",
      "cat /*/supadava/x",
      "cd / && cat home/someone/AGENTS.md",
      // Readable for a tool run, but never writable.
      "/opt/story-tool/story.js",
      JSON.stringify({ query: "Thukker tribe" }),
    ]);
    expect(summary.initModel).toBe("claude-opus-5-5");
    expect(summary.models).toEqual(["claude-opus-5-5"]);
    expect(summary.unparsed).toBe(1);
    expect(summary.toolUses).toBe(19);
  });

  test("the frozen directory counts as outside for a notes run", () => {
    const summary = checkTranscript(jsonl, run, { read: [run], write: [run] });
    expect(summary.outside.map((f) => f.detail)).toContain(
      "/opt/story-tool/story-sketch/SKILL.md",
    );
  });
});

describe("prompts", () => {
  const craft = "CRAFT ADVICE";
  const skill = "SKILL TEXT";
  test("both arms get the craft; only the tool arm gets the skill and tool", () => {
    for (const step of STEPS) {
      const t = stepPrompt({
        arm: "tool",
        step,
        premise: PREMISES.thukker,
        craft,
        skill,
      });
      const n = stepPrompt({
        arm: "notes",
        step,
        premise: PREMISES.thukker,
        craft,
      });
      expect(t).toContain(craft);
      expect(n).toContain(craft);
      expect(t).toContain(skill);
      expect(t).toContain("STORY_CLI");
      expect(n).not.toContain(skill);
      expect(n).not.toContain("STORY_CLI");
      expect(n).not.toContain("render");
      expect(t.includes(PREMISES.thukker.text)).toBe(step === 1);
      expect(n.includes(PREMISES.thukker.text)).toBe(step === 1);
    }
  });
});

describe("packet", () => {
  const inputs = {
    premiseTitle: "Thukker",
    label: "Thukker, pair 1, packet A",
    readable: {
      1: "## Premise\n\nA story.\n",
      2: "## Premise\n\nA story, changed.\n",
      3: undefined,
    },
    diffs: { 2: "@@ -1 +1 @@\n-A story.\n+A story, changed.\n", 3: undefined },
    notes: { 2: "I changed it.", 3: undefined },
    scene: "She ran.",
  };

  test("has every section in order, with missing steps marked and nothing dropped", () => {
    const md = packetMarkdown(inputs);
    const positions = SECTION_TITLES.map((t) => md.indexOf(`## ${t}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(md).toContain("#### Premise");
    expect(md).toContain("> I changed it.");
    expect(md).toContain("```diff\n@@ -1 +1 @@");
    expect(md.match(/Missing: this step didn't produce it/g)?.length).toBe(2);
    expect(md).toContain("She ran.");
  });

  test("diff hunks drop the header that names the files", () => {
    const git =
      "diff --git a/before b/after\nindex 1..2 100644\n--- a/before\n+++ b/after\n@@ -1 +1 @@\n-x\n+y\n";
    expect(diffHunks(git)).toBe("@@ -1 +1 @@\n-x\n+y\n");
    expect(diffHunks("@@ -2,7 +2,7 @@ A.\n-x\n")).toBe("@@ -2,7 +2,7 @@\n-x\n");
    expect(diffHunks("")).toBe("");
  });
});

describe("sentence diff", () => {
  test("puts each sentence on its own line, the same for any text", () => {
    expect(sentenceLines('One. Two! Three? "Four." Five\n\nSix.')).toBe(
      'One.\nTwo!\nThree?\n"Four."\nFive\n\nSix.',
    );
  });

  test("a changed sentence shows alone, not its whole paragraph", () => {
    const para = (middle: string) =>
      `A. B. C. D. ${middle} E. F. G. H.\n\nNext paragraph.\n`;
    const diff = lineDiff(para("Old."), para("New."));
    expect(diff).toContain("-Old.");
    expect(diff).toContain("+New.");
    expect(diff).not.toContain("A.");
    expect(diff).not.toContain("Next paragraph.");
  });
});

// ---------------------------------------------------------------------------
// Packets, the key and the harness's refusals, against files on disk.

const temps: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "comparison-test."));
  temps.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** A finished run in `<out>/key/raw/<id>`, as runOne leaves it. */
function fakeRun(out: string, id: string, arm: "tool" | "notes"): void {
  const raw = join(out, "key", "raw", id);
  const story = arm === "tool" ? "story.json" : "story.md";
  for (const step of [1, 2, 3, 4]) {
    const files = join(raw, `step-${step}`, "files");
    mkdirSync(files, { recursive: true });
    writeFileSync(join(files, story), "{}");
    if (step < 4) {
      writeFileSync(
        join(raw, `step-${step}`, "readable.md"),
        `## Premise\n\nA ship. Version ${step}.\n`,
      );
    }
    if (step >= 2)
      writeFileSync(join(files, "rework-1-note.md"), "Changed a want.");
    if (step >= 3)
      writeFileSync(join(files, "rework-2-note.md"), "Moved an event.");
    if (step === 4) writeFileSync(join(files, "scene.md"), "She ran.");
    writeFileSync(join(raw, `step-${step}`, "transcript.jsonl"), "");
  }
  writeFileSync(
    join(raw, "run.json"),
    JSON.stringify({
      runId: id,
      arm,
      premise: "thukker",
      workdir: `/tmp/story.${id}`,
      frozenCommit: "abc",
      model: "claude-opus-5-5",
      claudeArgs: arm === "tool" ? ["--add-dir", "/opt/story-tool"] : [],
      sandbox: [],
      steps: [],
      failed: false,
    }),
  );
}

type KeyEntry = { packet: string; runId: string; arm: string };

describe("writePackets", () => {
  test("pairs one run of each arm, letters at random, with nothing in a packet naming its run or arm", () => {
    const letterOfTool = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const out = temp();
      const ids = { tool: ["t0001", "t0002"], notes: ["n0001", "n0002"] };
      for (const id of ids.tool) fakeRun(out, id, "tool");
      for (const id of ids.notes) fakeRun(out, id, "notes");
      writePackets(out);

      const names = readdirSync(join(out, "packets")).sort();
      expect(names).toEqual([
        "thukker-pair-1-A.md",
        "thukker-pair-1-B.md",
        "thukker-pair-2-A.md",
        "thukker-pair-2-B.md",
      ]);
      const key = JSON.parse(
        readFileSync(join(out, "key", "key.json"), "utf8"),
      ) as KeyEntry[];
      for (const pair of [1, 2]) {
        const arms = key
          .filter((k) => k.packet.startsWith(`thukker-pair-${pair}-`))
          .map((k) => k.arm)
          .sort();
        expect(arms).toEqual(["notes", "tool"]);
      }
      for (const k of key) {
        if (k.arm === "tool") letterOfTool.add(k.packet.slice(-4, -3));
      }
      for (const name of names) {
        const text = readFileSync(join(out, "packets", name), "utf8");
        for (const id of [...ids.tool, ...ids.notes]) {
          expect(text).not.toContain(id);
        }
        expect(text).not.toMatch(/\b(tool|notes)\b/i);
        expect(text).not.toContain("story.json");
        expect(text).not.toContain("story.md");
      }
      expect(() => writePackets(out)).toThrow("packets are written once");
    }
    // Over 16 pairs, the tool run landed on both letters.
    expect([...letterOfTool].sort()).toEqual(["A", "B"]);
  });
});

describe("refusals", () => {
  test("freeze refuses an existing directory and uncommitted changes", () => {
    const existing = temp();
    expect(() => freeze(existing)).toThrow("never redone in place");

    const repo = temp();
    const git = (...args: string[]) =>
      Bun.spawnSync(["git", ...args], { cwd: repo, stdout: "ignore" });
    git("init", "-q");
    mkdirSync(join(repo, "app/scripts"), { recursive: true });
    writeFileSync(join(repo, "app/scripts/story.ts"), "// v1\n");
    git("add", ".");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "v1");
    writeFileSync(join(repo, "app/scripts/story.ts"), "// v2\n");
    const target = join(temp(), "frozen");
    expect(() => freeze(target, repo)).toThrow("Commit these before freezing");
    expect(existsSync(target)).toBe(false);
  });

  test("phase-b refuses a root that already has a key", async () => {
    const root = temp();
    mkdirSync(join(root, "key"));
    await expect(phaseB(root)).rejects.toThrow("aren't quietly rerun");
  });

  test("run refuses the held-back premise", async () => {
    const out = temp();
    await expect(
      main(["run", out, join(out, "frozen"), "tool", "magical-girl-therapist"]),
    ).rejects.toThrow("only the thukker premise");
    expect(readdirSync(out)).toEqual([]);
  });
});
