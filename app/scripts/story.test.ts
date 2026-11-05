/**
 * Runs the story CLI as a subprocess, as an agent or a person would, against
 * a file in a temporary directory.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStory, type Story } from "../src/story/story";
import { EDITS, READS } from "./story";

const SCRIPT = fileURLToPath(new URL("./story.ts", import.meta.url));

type Run = { code: number; stdout: string; stderr: string };

function cli(...args: string[]): Run {
  const result = Bun.spawnSync(["bun", SCRIPT, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

let dir = "";
let file = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "story-cli-"));
  file = join(dir, "story.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Runs a command on `file` and expects it to succeed. */
function ok(...args: string[]): string {
  const run = cli(file, ...args);
  expect({ args, stderr: run.stderr, code: run.code }).toEqual({
    args,
    stderr: "",
    code: 0,
  });
  return run.stdout;
}

const saved = (): Story =>
  parseStory(readFileSync(file, "utf8"))._unsafeUnwrap();

describe("story CLI", () => {
  test("sketches a story, tries a candidate, reworks a drive and keeps a conflicting move", () => {
    ok("init", "An orphan raised by a nomad tribe leaves it.");
    expect(saved().premise).toBe(
      "An orphan raised by a nomad tribe leaves it.",
    );

    // A sketch: actors, a drive, events in order, a scene and an open question.
    ok("add-actor", "joel", "Joel", "--notes", "Raised on the caravans");
    ok("add-actor", "tribe", "The tribe", "--kind", "organization");
    ok("add-drive", "belong", "Find where he belongs", "--actor", "joel");
    ok(
      "add-drive",
      "secret",
      "Keep what they carry hidden",
      "--actor",
      "tribe",
    );
    ok("relate-drives", "belong", "opposes", "secret");
    ok("add-event", "exile", "Joel leaves the tribe");
    ok("add-event", "titan", "He finds the Titan", "--summary", "Years later");
    ok("set-position", "exile", "17");
    ok("set-position", "titan", "22");
    ok("constrain", "exile-first", "exile", "before", "titan");
    ok("set-drive-origins", "belong", "exile");
    ok("add-scene", "docks", "The docks");
    ok("set-scene-actors", "docks", "joel");
    ok("set-scene-pressures", "docks", "belong");
    ok(
      "add-open-question",
      "why-leave",
      "Why did Joel leave?",
      "--about",
      "actor:joel,event:exile",
    );
    expect(ok("gaps")).toContain("has no candidate answers yet");

    // Try two candidates; see what one touches.
    ok("add-candidate", "why-leave", "adventure", "He wanted adventure");
    ok(
      "add-candidate",
      "why-leave",
      "cargo",
      "He found what the caravans carried",
      "--touches",
      "drive:secret,event:titan",
    );
    const touches = ok("touches", "candidate:why-leave/cargo");
    expect(touches).toContain("drive:secret");
    expect(touches).toContain("event:titan");
    // One step further: the drive opposed to the one it touches.
    expect(touches.split("One step further:")[1]).toContain("drive:belong");
    ok("answer-open-question", "why-leave", "cargo");

    // Rework the drive.
    ok("update-drive", "belong", "--want", "Expose what the tribe carried");
    ok("set-drive-origins", "belong", "exile", "titan");

    // A lone "none" clears a list.
    ok("set-scene-actors", "docks", "none");
    expect(saved().scenes[0]?.actors).toEqual([]);
    ok("set-scene-actors", "docks", "joel");
    ok("set-drive-origins", "secret", "titan");
    ok("set-drive-origins", "secret", "none");
    expect(saved().drives.find(({ id }) => id === "secret")?.origins).toEqual(
      [],
    );

    // Move an event against the constraint: kept, reported, exit zero.
    const moved = ok("set-position", "exile", "30");
    expect(moved).toContain("Timeline problem");
    expect(ok("contradictions")).toContain("cannot be ordered");

    // Everything reads back from the file.
    const story = saved();
    expect(story.actors.map(({ id }) => id)).toEqual(["joel", "tribe"]);
    expect(story.drives.find(({ id }) => id === "belong")).toMatchObject({
      actorId: "joel",
      want: "Expose what the tribe carried",
      origins: ["exile", "titan"],
      relations: [{ to: "secret", type: "opposes" }],
    });
    expect(story.timeline.positions).toContainEqual(
      expect.objectContaining({ event: "exile", start: 30, end: 30 }),
    );
    expect(story.timeline.constraints.map(({ id }) => id)).toEqual([
      "exile-first",
    ]);
    const question = story.openQuestions[0];
    expect(question?.answer).toBe("cargo");
    expect(question?.candidates.map(({ id }) => id)).toEqual([
      "adventure",
      "cargo",
    ]);
    expect(story.scenes[0]).toMatchObject({
      id: "docks",
      actors: ["joel"],
      pressures: ["belong"],
    });

    const rendered = ok("render");
    expect(rendered).toContain("Expose what the tribe carried");
    expect(rendered).toContain(
      "## Decided\n\n- Why did Joel leave? He found what the caravans carried. Not revealed yet.\n",
    );
    expect(rendered).not.toContain("He wanted adventure");
    // The bible carries no word budget.
    expect(rendered).not.toMatch(/words\)/);
    for (const id of ["joel", "belong", "exile", "why-leave", "cargo"]) {
      expect(rendered).not.toContain(id);
    }
  });

  test("an open question is undecided, decided, left open or revealed, and keeps what was ruled out", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-open-question", "who", "Who wrote it?");
    ok("add-candidate", "who", "ferry", "The ferryman, who saw the wreck");
    ok("add-candidate", "who", "keeper", "The old keeper, before he died");
    ok("add-scene", "docks", "The docks");
    const state = () =>
      ok("show", "open-question:who")
        .split("\n")
        .find((line) => line.startsWith("state: "));
    expect(state()).toBe("state: undecided");

    ok("reject-candidate", "who", "keeper", "--reason", "He died first");
    expect(ok("show", "open-question:who")).toContain(
      "candidate:who/keeper (ruled out: He died first): The old keeper",
    );
    expect(ok("show", "candidate:who/keeper")).toContain(
      "ruled out: He died first\n",
    );
    expect(ok("render")).toContain(
      "  - Ruled out: The old keeper, before he died. He died first.\n",
    );
    const both = cli(file, "reject-candidate", "who", "ferry");
    expect(both.code).toBe(2);
    expect(both.stderr).toContain("give --reason <text> or --undo");

    ok("answer-open-question", "who", "ferry");
    expect(state()).toBe("state: decided, not revealed yet");
    const chosen = cli(
      file,
      "reject-candidate",
      "who",
      "ferry",
      "--reason",
      "x",
    );
    expect(chosen.code).toBe(1);
    expect(chosen.stderr).toContain("is the chosen answer");

    ok("leave-for-reader", "who", "--reason", "The reader should wonder");
    expect(state()).toBe("state: left open for the reader");
    expect(ok("list", "open-question")).toContain("(left open for the reader)");
    expect(ok("render")).toContain("## Left open for the reader\n");
    expect(ok("gaps")).not.toContain("open-question:who");

    ok("set-scene-links", "docks", "reveals", "candidate:who/ferry");
    expect(state()).toBe("state: revealed in scene:docks");
    expect(ok("render")).toContain(
      '- Who wrote it? The ferryman, who saw the wreck. Revealed in "The docks".\n',
    );
    ok("leave-for-reader", "who", "--undo");
    ok("set-scene-links", "docks", "reveals", "none");
    expect(state()).toBe("state: decided, not revealed yet");
    ok("reject-candidate", "who", "keeper", "--undo");
    expect(saved().openQuestions[0]?.candidates.map((c) => c.rejected)).toEqual(
      [undefined, undefined],
    );
  });

  test("records causes, renders them, and reports a move that puts an effect first", () => {
    ok("init", "A storm wrecks a boat.");
    ok("add-event", "storm", "The storm");
    ok("add-event", "wreck", "The wreck");
    ok("set-position", "storm", "10");
    ok("set-position", "wreck", "12");
    expect(ok("add-cause", "storm", "wreck")).toBe("Saved.\n");
    expect(saved().causes).toEqual([{ cause: "storm", effect: "wreck" }]);
    expect(ok("show", "event:wreck")).toContain(
      'because of: event:storm ("The storm")',
    );
    expect(ok("show", "event:storm")).toContain(
      'caused: event:wreck ("The wreck")',
    );
    expect(ok("render")).toContain(
      "- **The wreck** (year 12), because of The storm.",
    );
    expect(ok("touches", "event:storm")).toContain(
      'event:wreck ("The wreck"): an event it caused',
    );

    const moved = ok("set-position", "storm", "14");
    expect(moved).toContain(
      'Cause problem (kept; see contradictions): "The wreck" happens before "The storm", which is recorded as its cause.',
    );
    expect(ok("contradictions")).toContain("recorded as its cause");
    // Reported once, by the edit that made it.
    expect(ok("set-position", "storm", "15")).toBe("Saved.\n");
    expect(ok("set-position", "storm", "12")).toBe("Saved.\n");
    expect(ok("contradictions")).toBe("No contradictions.\n");

    const self = cli(file, "add-cause", "storm", "storm");
    expect(self.code).toBe(1);
    expect(self.stderr).toContain("cannot cause itself");
    expect(cli(file, "add-cause", "storm", "wreck").code).toBe(1);
    expect(cli(file, "add-cause", "storm", "nothing").code).toBe(1);
    expect(ok("add-cause", "wreck", "storm")).toContain("in a circle");
    ok("remove-cause", "wreck", "storm");
    ok("remove-cause", "storm", "wreck");
    expect(readFileSync(file, "utf8")).not.toContain("causes");
  });

  test("mentions finds free text, and edits that change a record prompt with it", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-actor", "mara", "Mara");
    ok("add-event", "wreck", "The wreck");
    ok("set-position", "wreck", "1203");
    ok("add-drive", "avenge", "Avenge her brother", "--actor", "mara");
    ok(
      "add-scene",
      "harbour",
      "The harbour",
      "--summary",
      "Twenty years ago the boat went down; Mara watches the reef",
    );
    ok("set-scene-events", "harbour", "wreck");
    ok("add-fact", "charted", "The reef was charted in 1203");
    ok("add-scene", "market", "Market day", "--summary", "Fish in spring");

    const found = ok("mentions", "event:wreck");
    expect(found).toBe(
      [
        '- fact:charted ("The reef was charted in 1203") text: "1203" (states its year 1203)',
        '- scene:harbour ("The harbour") summary: "Twenty years ago" (may state when this happened)',
        "",
      ].join("\n"),
    );
    expect(ok("mentions", "scene:market")).toBe("No free text mentions it.\n");
    expect(cli(file, "mentions", "event:nope").code).toBe(1);

    const before = readFileSync(file, "utf8");
    const moved = ok("set-position", "wreck", "1213");
    expect(moved).toContain(
      "Free text that mentions event:wreck and may still state the old version (nothing was rewritten):",
    );
    expect(moved).toContain('text: "1203" (states its year 1203)');
    expect(saved().facts[0]?.text).toBe("The reef was charted in 1203");
    expect(readFileSync(file, "utf8")).not.toBe(before);

    expect(ok("update-drive", "avenge", "--want", "Forgive")).toContain(
      'summary: "Mara" (names its holder Mara)',
    );
    expect(ok("update-actor", "mara", "--name", "Maren")).toContain(
      'summary: "Mara" (names it)',
    );
    expect(ok("describe-event", "wreck", "--label", "The sinking")).toContain(
      "may state when this happened",
    );
    // Other edits don't prompt.
    expect(ok("update-scene", "market", "--title", "Market")).toBe("Saved.\n");
  });

  test("an edit prompts only when it changes what text can state, and at most five lines", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-actor", "mara", "Mara");
    ok("add-drive", "calm", "Stay calm", "--actor", "mara");
    ok("add-event", "wreck", "The wreck");
    ok("set-position", "wreck", "10");
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      ok("add-fact", `f${i}`, `Mara saw the wreck, fact ${i}`);
    }
    const prompt = "Free text that mentions";

    // No-op and kind-only edits change nothing text states.
    expect(ok("update-actor", "mara", "--name", "Mara")).toBe("Saved.\n");
    expect(ok("update-actor", "mara", "--kind", "person")).toBe("Saved.\n");
    expect(ok("update-actor", "mara", "--notes", "Keeps the light")).toBe(
      "Saved.\n",
    );
    expect(ok("update-drive", "calm", "--stakes", "Her post")).toBe("Saved.\n");
    expect(ok("update-drive", "calm", "--want", "Stay calm")).toBe("Saved.\n");
    expect(ok("describe-event", "wreck", "--summary", "It sinks")).toBe(
      "Saved.\n",
    );
    expect(ok("set-position", "wreck", "10")).toBe("Saved.\n");

    // A rename prompts, five lines at most, then points at mentions.
    const renamed = ok("update-actor", "mara", "--name", "Maren");
    const lines = renamed.trimEnd().split("\n");
    expect(lines[0]).toBe("Saved.");
    expect(lines[1]).toContain(`${prompt} actor:mara`);
    expect(lines.slice(2, 7).every((line) => line.includes('"Mara"'))).toBe(
      true,
    );
    expect(lines[7]).toBe(
      "...and 2 more (7 in all): run mentions actor:mara for all.",
    );
    expect(lines).toHaveLength(8);
    // A new holder prompts for the old one's name.
    ok("add-actor", "ivo", "Ivo");
    ok("update-actor", "mara", "--name", "Mara");
    expect(ok("update-drive", "calm", "--actor", "ivo")).toContain(
      "(names its holder Mara)",
    );
  });

  test("a cut-short prompt keeps the text stating the old want ahead of the holder's name", () => {
    ok("init", "A keeper holds the light.");
    ok("add-actor", "mara", "Mara");
    ok("add-drive", "d", "keep the light", "--actor", "mara");
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      ok("add-scene", `s${i}`, `Scene ${i}`, "--summary", `Mara climbs, ${i}`);
    }
    ok("add-fact", "vow", "Her vow to keep the light binds her");
    // mentions lists the same order.
    expect(ok("mentions", "drive:d").split("\n")[0]).toContain("fact:vow");
    const lines = ok("update-drive", "d", "--want", "Leave the island")
      .trimEnd()
      .split("\n");
    expect(lines[2]).toBe(
      '- fact:vow ("Her vow to keep the light binds her") text: "keep the light" (names it)',
    );
    expect(lines.slice(3, 7).every((l) => l.includes("names its holder"))).toBe(
      true,
    );
    expect(lines[7]).toBe(
      "...and 8 more (13 in all): run mentions drive:d for all.",
    );
  });

  test("show lists a reworked answer's history, and render doesn't", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-open-question", "who", "Who wrote it?");
    ok("add-candidate", "who", "ferry", "The ferryman");
    ok("add-candidate", "who", "keeper", "The old keeper");
    ok("answer-open-question", "who", "ferry");
    ok("answer-open-question", "who", "keeper");
    ok("unanswer-open-question", "who");
    ok("answer-open-question", "who", "keeper");
    expect(ok("show", "open-question:who")).toContain(
      [
        "superseded answers, oldest first:",
        "  ferry: The ferryman (replaced by candidate:who/keeper)",
        "  keeper: The old keeper (unanswered)",
      ].join("\n"),
    );
    const rendered = ok("render");
    expect(rendered).toContain("- Who wrote it? The old keeper.");
    expect(rendered).not.toContain("ferryman");
  });

  test("a gap marked deliberate stops being listed until it is unmarked", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-actor", "velan", "Velan");
    ok("add-drive", "calm", "Stay calm", "--actor", "velan");
    expect(cli("--help").stdout).toContain(
      "\n  mark-gap-deliberate <gap> <ref> --reason <text>\n",
    );
    const gap = "[drive-without-origin drive:calm]";
    expect(ok("gaps")).toContain(
      `- The drive "Stay calm" doesn't come from any event yet. ${gap}\n`,
    );
    expect(ok("gaps")).toStartWith(
      "Optional prompts, not problems: places you could add a link or a record. None is a reason to cut or merge anything true; a record can stay unlinked.\n- ",
    );
    // A person with no drive isn't a gap.
    ok("add-actor", "oro", "Oro");
    expect(ok("gaps")).not.toContain("actor:oro");
    expect(cli("--help").stdout).not.toContain("person-without-drive");
    const noReason = cli(
      file,
      "mark-gap-deliberate",
      "drive-without-origin",
      "drive:calm",
    );
    expect(noReason.code).toBe(1);
    expect(noReason.stderr).toContain("needs a reason");
    expect(
      cli(file, "mark-gap-deliberate", "drive-bored", "drive:calm").code,
    ).toBe(2);

    ok(
      "mark-gap-deliberate",
      "drive-without-origin",
      "drive:calm",
      "--reason",
      "Temperament, not an event",
    );
    const gaps = ok("gaps");
    expect(gaps).not.toContain("doesn't come from any event");
    expect(gaps).toContain(`Marked deliberate, so not listed (1): ${gap}\n`);
    expect(ok("show", "drive:calm")).toContain(
      "deliberate gap: drive-without-origin (Temperament, not an event)",
    );
    expect(saved().deliberateGaps).toEqual([
      {
        gap: "drive_without_origin",
        ref: { kind: "drive", id: "calm" },
        reason: "Temperament, not an event",
      },
    ]);

    ok("mark-gap-deliberate", "no-reader-question", "story", "--reason", "x");
    expect(saved().deliberateGaps).toHaveLength(2);
    ok("unmark-gap-deliberate", "no-reader-question", "story");

    ok("unmark-gap-deliberate", "drive-without-origin", "drive:calm");
    expect(ok("gaps")).toContain("doesn't come from any event");
    expect(readFileSync(file, "utf8")).not.toContain("deliberateGaps");
  });

  test("a refused edit leaves the file alone and exits non-zero", () => {
    ok("init", "A premise.");
    ok("add-actor", "joel", "Joel");
    const before = readFileSync(file, "utf8");

    const duplicate = cli(file, "add-actor", "joel", "Joel again");
    expect(duplicate.code).toBe(1);
    expect(duplicate.stderr).toContain("actor joel already exists");
    const dangling = cli(file, "add-drive", "d", "Want", "--actor", "nobody");
    expect(dangling.code).toBe(1);
    expect(dangling.stderr).toContain("actor nobody does not exist");
    const malformed = cli(file, "set-position", "x", "soon");
    expect(malformed.code).toBe(2);
    expect(malformed.stderr).toContain("<start> must be a number");
    const badRef = cli(file, "add-fact", "f", "Text", "--about", "joel");
    expect(badRef.code).toBe(2);
    expect(badRef.stderr).toContain("is not a ref");
    expect(cli(file, "no-such-command").code).toBe(2);
    expect(cli(file, "add-actor", "x", "X", "--colour", "red").code).toBe(2);

    expect(readFileSync(file, "utf8")).toBe(before);
    expect(cli(file, "init", "Again").code).toBe(1);
    expect(readFileSync(file, "utf8")).toBe(before);
  });

  test("a missing or invalid file is an error", () => {
    const missing = cli(file, "render");
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("cannot read");
    expect(existsSync(file)).toBe(false);
  });

  test("keeps a scene's prose in its own file and lists its links both ways", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-fact", "lamp", "The lamp was out that night");
    ok("add-event", "wreck", "The wreck");
    ok("add-open-question", "who", "Who wrote it?");
    ok("add-candidate", "who", "ferry", "The ferryman");
    ok("add-scene", "storm", "The storm");
    ok("add-scene", "docks", "The docks");
    const prose = join(dir, "scenes", "storm.md");
    expect(ok("show", "scene:storm")).toContain(
      `prose: ${prose} (not written yet)\n`,
    );
    mkdirSync(join(dir, "scenes"));
    writeFileSync(prose, "Rain on the glass. She did not light it.\n");
    expect(ok("show", "scene:storm")).toContain(`prose: ${prose} (9 words)\n`);
    expect(readFileSync(file, "utf8")).not.toContain("Rain on the glass");

    ok("set-scene-links", "storm", "withholds", "fact:lamp");
    ok("set-scene-links", "storm", "implies", "event:wreck");
    ok(
      "set-scene-links",
      "docks",
      "reveals",
      "fact:lamp",
      "candidate:who/ferry",
    );
    const storm = ok("show", "scene:storm");
    expect(storm).toContain(
      'withholds: fact:lamp ("The lamp was out that night")\n',
    );
    expect(storm).toContain('implies: event:wreck ("The wreck")\n');
    expect(ok("scenes", "fact:lamp")).toBe(
      '1. scene:storm ("The storm"): withholds it\n2. scene:docks ("The docks"): reveals it\n',
    );
    expect(ok("scenes", "open-question:who")).toBe(
      '2. scene:docks ("The docks"): reveals its candidate ferry\n',
    );
    expect(ok("scenes", "event:wreck")).toBe(
      '1. scene:storm ("The storm"): implies it\n',
    );
    ok("add-actor", "mara", "Mara");
    expect(ok("scenes", "actor:mara")).toBe("No scene touches it.\n");

    const missing = cli(
      file,
      "set-scene-links",
      "storm",
      "reveals",
      "fact:nope",
    );
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("fact nope does not exist");
    const badHow = cli(file, "set-scene-links", "storm", "hints", "fact:lamp");
    expect(badHow.code).toBe(2);
    expect(badHow.stderr).toContain(
      "<how> must be one of reveals, implies, withholds",
    );

    ok("set-scene-links", "storm", "withholds", "none");
    expect(ok("scenes", "fact:lamp")).toBe(
      '2. scene:docks ("The docks"): reveals it\n',
    );
    const rendered = ok("render");
    expect(rendered).toContain(
      "Reveals: The ferryman; The lamp was out that night.",
    );
    expect(rendered).not.toContain("Rain on the glass");
    expect(rendered).not.toMatch(/words\)/);
  });

  test("holds who knows or believes what, versions side by side, and the reader's order apart from the true order", () => {
    ok("init", "A warlock with hundreds of patrons.");
    ok("add-actor", "vell", "Vell");
    ok("add-actor", "oren", "Oren");
    ok("add-event", "pact", "The first pact");
    ok("set-position", "pact", "3");
    ok(
      "add-event",
      "burning",
      "The chapel burns",
      "--summary",
      "The patron burned it",
    );
    ok("set-position", "burning", "4");
    ok("add-fact", "tithe", "Each patron takes a sliver of her luck");
    ok(
      "add-knowledge",
      "vell-tithe",
      "vell",
      "knows",
      "fact:tithe",
      "--since",
      "pact",
    );
    ok(
      "add-version",
      "lightning",
      "burning",
      "Lightning struck it",
      "--by",
      "oren",
    );
    ok("add-version", "arson", "burning", "Vell set the fire", "--by", "vell");
    ok(
      "add-knowledge",
      "oren-lightning",
      "oren",
      "believes",
      "version:lightning",
      "--since",
      "burning",
    );
    ok("add-scene", "ash", "Ash");
    ok("add-scene", "stall", "The stall");
    ok("set-scene-links", "ash", "reveals", "version:lightning");
    ok("set-scene-links", "stall", "reveals", "knowledge:vell-tithe");

    expect(ok("show", "knowledge:oren-lightning")).toBe(
      'knowledge:oren-lightning\nactor: actor:oren ("Oren")\nbelieves: version:lightning ("Lightning struck it")\nsince: event:burning ("The chapel burns")\n',
    );
    expect(ok("show", "event:burning")).toContain(
      'versions: version:arson ("Vell set the fire"), version:lightning ("Lightning struck it")\n',
    );
    const order = ok("reader-order");
    expect(order).toContain(
      'In telling order, what each scene puts before the reader:\n1. scene:ash ("Ash")\n   reveals version:lightning ("Lightning struck it"), of event:burning at year 4\n2. scene:stall ("The stall")\n   reveals knowledge:vell-tithe ("Vell knows: Each patron takes a sliver of her luck"), held from event:pact at year 3\n',
    );
    expect(order).toContain(
      '- event:pact ("The first pact") at year 3: no scene tells the reader\n    from then, knowledge:vell-tithe ("Vell knows: Each patron takes a sliver of her luck"): first told in 2. scene:stall ("The stall"), which reveals knowledge:vell-tithe\n- event:burning ("The chapel burns") at year 4: first told in 1. scene:ash ("Ash"), which reveals version:lightning (an account, maybe not what happened)\n',
    );
    expect(ok("list", "knowledge")).toContain("knowledge:oren-lightning");

    expect(ok("remove-version", "lightning")).toBe(
      'Saved.\nAlso removed: knowledge:oren-lightning ("Oren believes: Lightning struck it")\n',
    );
    ok("add-knowledge", "oren-arson", "oren", "knows", "version:arson");
    expect(ok("remove-event", "burning")).toBe(
      'Saved.\nAlso removed: version:arson ("Vell set the fire"), knowledge:oren-arson ("Oren knows: Vell set the fire")\n',
    );
    expect(ok("remove-fact", "tithe")).toContain(
      "Also removed: knowledge:vell-tithe",
    );
    expect(ok("remove-actor", "oren")).toBe("Saved.\n");
    expect(saved().knowledge).toEqual([]);
    expect(saved().scenes[0]?.reveals).toEqual([]);
    const bad = cli(
      file,
      "add-knowledge",
      "x",
      "vell",
      "suspects",
      "fact:tithe",
    );
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain("<how> must be one of knows, believes");
  });

  test("--help lists every command with an example, and every example runs", () => {
    const help = cli("--help");
    expect(help.code).toBe(0);
    const specs = [
      ...Object.entries(READS),
      ...Object.entries(EDITS).map(
        ([type, spec]) =>
          [type.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), spec] as const,
      ),
    ];
    for (const [name, spec] of specs) {
      expect(spec.example[0]).toBe(name);
      expect(help.stdout).toContain(`\n  ${name}`);
      expect(help.stdout).toContain(`e.g. story story.json ${name}`);
    }

    // The examples, in help order, on one file. Records they refer to but no
    // example adds come first. Removals run on a copy, so later examples
    // still find what they refer to.
    ok(...READS.init.example);
    ok("add-actor", "ivo", "Ivo");
    ok("add-drive", "keep-quiet", "Keep the wreck quiet");
    ok("add-event", "letter", "The letter arrives");
    for (const spec of Object.values(EDITS)) {
      const [name] = spec.example;
      if (name?.startsWith("remove-") || name?.startsWith("unrelate-")) {
        const copy = join(dir, "copy.json");
        copyFileSync(file, copy);
        const run = cli(copy, ...spec.example);
        expect({ example: spec.example, stderr: run.stderr }).toEqual({
          example: spec.example,
          stderr: "",
        });
      } else {
        ok(...spec.example);
      }
    }
    for (const [name, spec] of Object.entries(READS)) {
      if (name !== "init") ok(...spec.example);
    }
  });
});
