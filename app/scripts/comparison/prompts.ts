/**
 * The four step prompts for the blind comparison (worldcrafter-04z5). Both
 * arms get the same task text and the same craft advice, inlined; the tool
 * arm also gets the skill file and the tool, and the notes arm keeps the
 * story as plain Markdown. Nothing here mentions the comparison itself.
 */

export type Arm = "tool" | "notes";
export type Step = 1 | 2 | 3 | 4;
export const STEPS: readonly Step[] = [1, 2, 3, 4];

export type PremiseId = "thukker" | "magical-girl-therapist";

export type Premise = {
  id: PremiseId;
  /** Shown on packets so the reader knows which premise a pair is. */
  title: string;
  text: string;
  /** Thukker was used to build the tool, so its verdict is weighed less. */
  tunedOn: boolean;
};

/** As Sumeet gave them on 2026-10-30 (worldcrafter-04z5, worldcrafter-p4zf). */
export const PREMISES: Record<PremiseId, Premise> = {
  thukker: {
    id: "thukker",
    title: "Thukker",
    tunedOn: true,
    text: "Fanfiction of EVE Online. An orphan is adopted by the Thukker tribe, grows up with them, eventually leaves and ends up in Syndicate space. There he runs into a Caldari girl who is there for similar reasons. Hijinks ensue, they decide to work together, and they track down her sister, who turns out to have been fused into a Titan-class ship (as in Homeworld). They then go gallivanting off, build a small armada and unravel a few conspiracies along the way. The Jovians were involved, somehow. Why he left the Thukker, who the girl's family is, what his background is and what he's looking for are all open.",
  },
  // Held back: no run may use it until the tool is frozen (phase B).
  "magical-girl-therapist": {
    id: "magical-girl-therapist",
    title: "Magical girl therapist",
    tunedOn: false,
    text: 'A story about a "magical girl therapist".',
  },
};

/** Files a session writes, relative to its run directory. */
export const FILES = {
  toolStory: "story.json",
  notesStory: "story.md",
  reworkNote: { 2: "rework-1-note.md", 3: "rework-2-note.md" },
  scene: "scene.md",
  modelGaps: "model-gaps.md",
} as const;

export type PromptInputs = {
  arm: Arm;
  step: Step;
  premise: Premise;
  craft: string;
  /** The skill file's text; required for the tool arm. */
  skill?: string;
};

const LENGTH = "Keep the readable form of the story to about 1,500 words";

function storyLocation(arm: Arm): string {
  return arm === "tool"
    ? `The story is held in \`${FILES.toolStory}\` through a command-line tool, described below; its readable form is what the tool's \`render\` command prints.`
    : `The story is held as plain Markdown notes in \`${FILES.notesStory}\`, organised however you like; that file, as written, is its readable form.`;
}

function task(arm: Arm, step: Step, premise: Premise): string {
  const story = arm === "tool" ? FILES.toolStory : FILES.notesStory;
  const check = arm === "tool" ? " (check it with `render`)" : "";
  switch (step) {
    case 1:
      return [
        "Sketch a story from the premise below, ready to draft from. Make sure it has what it needs to be interesting before drafting, and settle open questions where a satisfying answer has emerged. Don't draft prose scenes yet.",
        `${LENGTH}${check}.`,
        arm === "tool"
          ? `\`${story}\` doesn't exist yet: start it with \`init\` and the premise.`
          : `\`${story}\` doesn't exist yet: start it with the premise.`,
        "",
        `Premise: ${premise.text}`,
      ].join("\n");
    case 2:
      return [
        `The story so far is in \`${story}\`, and the git log shows how it got there.`,
        "Change a core motivation of the main character, or an event behind it, and follow the change through everything it reaches.",
        `${LENGTH}${check}.`,
        `When you're done, write a sentence or two in \`${FILES.reworkNote[2]}\` saying what you changed and why, for someone reading the story before and after.`,
      ].join("\n");
    case 3:
      return [
        `The story so far is in \`${story}\`, and the git log shows how it got there.`,
        "Shift a significant event earlier or later in the story's timeline, and follow the change through everything it reaches.",
        `${LENGTH}${check}.`,
        `When you're done, write a sentence or two in \`${FILES.reworkNote[3]}\` saying what you changed and why, for someone reading the story before and after.`,
      ].join("\n");
    case 4:
      return [
        `The story so far is in \`${story}\`, and the git log and the rework notes (\`${FILES.reworkNote[2]}\`, \`${FILES.reworkNote[3]}\`) show how it got there.`,
        `Draft one scene that the two most recent changes affect, about 800 words of prose, in \`${FILES.scene}\`.`,
        `The draft is scratch: don't add it to \`${story}\`${arm === "tool" ? " or change the story file" : ""}.`,
      ].join("\n");
  }
}

/** The full prompt for one step of one run. */
export function stepPrompt({
  arm,
  step,
  premise,
  craft,
  skill,
}: PromptInputs): string {
  if (arm === "tool" && skill === undefined) {
    throw new Error("The tool arm's prompt needs the skill file's text.");
  }
  const where =
    arm === "tool"
      ? "Work only in the current directory (a git repository), apart from running the tool, whose path is in the `STORY_CLI` environment variable. Don't read files anywhere else."
      : "Work only in the current directory (a git repository). Don't read files anywhere else.";
  const sections = [
    where,
    storyLocation(arm),
    "",
    "## Your task",
    "",
    task(arm, step, premise),
    "",
    "## How to work",
    "",
    "- Commit after each meaningful change, with a message that says what changed in the story.",
    "- Anything else you keep in this directory is working material; only the story, the notes you're asked for and the scene are read.",
    "- Don't name tools, commands or files in anything written for the reader: the story's readable form, the notes you're asked for, or the scene.",
    "",
    "## Advice on finding a story",
    "",
    "Follow this advice.",
    "",
    "<craft>",
    craft.trim(),
    "</craft>",
  ];
  if (arm === "tool" && skill !== undefined) {
    sections.push(
      "",
      "## The tool",
      "",
      "This is the skill file for the tool. Where it says to read `craft.md`, that is the advice above.",
      "",
      "<skill>",
      skill.trim(),
      "</skill>",
    );
  }
  return `${sections.join("\n")}\n`;
}
