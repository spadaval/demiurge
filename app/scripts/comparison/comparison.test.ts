import { describe, expect, test } from "bun:test";
import { diffHunks, packetMarkdown, SECTION_TITLES } from "./packet";
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
  const frozen = "/srv/frozen";
  const jsonl = [
    JSON.stringify({
      type: "system",
      subtype: "init",
      model: "claude-opus-5-5",
      skills: [],
    }),
    tool("Read", { file_path: "story.md" }),
    tool("Read", { file_path: "/tmp/story.abc/scene.md" }),
    tool("Read", { file_path: "/srv/frozen/story-sketch/SKILL.md" }),
    tool("Read", { file_path: "/home/someone/projects/demiurge/AGENTS.md" }),
    tool("Bash", { command: 'bun "$STORY_CLI" story.json render 2>/dev/null' }),
    tool("Bash", {
      command:
        "bun $STORY_CLI story.json render | sed -n '/## People/,/## Events/p'",
    }),
    tool("Bash", { command: "cat ../other/story.md" }),
    tool("Bash", { command: "ls ~/.claude" }),
    tool("Bash", { command: "cat /etc/passwd" }),
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
    const summary = checkTranscript(jsonl, run, [run, frozen]);
    expect(summary.outside.map((f) => f.detail)).toEqual([
      "/home/someone/projects/demiurge/AGENTS.md",
      "cat ../other/story.md",
      "ls ~/.claude",
      "cat /etc/passwd",
      JSON.stringify({ query: "Thukker tribe" }),
    ]);
    expect(summary.initModel).toBe("claude-opus-5-5");
    expect(summary.models).toEqual(["claude-opus-5-5"]);
    expect(summary.unparsed).toBe(1);
    expect(summary.toolUses).toBe(10);
  });

  test("the frozen directory counts as outside for a notes run", () => {
    const summary = checkTranscript(jsonl, run, [run]);
    expect(summary.outside.map((f) => f.detail)).toContain(
      "/srv/frozen/story-sketch/SKILL.md",
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
    expect(diffHunks("")).toBe("");
  });
});
