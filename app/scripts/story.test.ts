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

/**
 * Runs one command from its own shell, as a writer's command line would, so
 * each is its own batch (see the CLI's `batchKey`).
 */
function cli(...args: string[]): Run {
  const result = Bun.spawnSync(
    ["bash", "-c", 'bun "$@"; exit $?', "bash", SCRIPT, ...args],
    { stdout: "pipe", stderr: "pipe" },
  );
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
      "## Open questions: decided, not revealed yet\n\n- Why did Joel leave? He found what the caravans carried.\n",
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
    expect(ok("render")).toContain(
      "## Open questions: left open for the reader\n",
    );
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
    expect(ok("add-cause", "storm", "wreck")).toBe("");
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
    expect(ok("set-position", "storm", "15")).toBe("");
    expect(ok("set-position", "storm", "12")).toBe("");
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
      "What may still state the old event:wreck, likeliest first (nothing was rewritten):",
    );
    expect(moved).toContain('text "1203" states its year 1203');
    expect(saved().facts[0]?.text).toBe("The reef was charted in 1203");
    expect(readFileSync(file, "utf8")).not.toBe(before);

    expect(ok("update-drive", "avenge", "--want", "Forgive")).toContain(
      'summary "Mara" names its holder Mara',
    );
    expect(ok("update-actor", "mara", "--name", "Maren")).toContain(
      'summary "Mara" names it',
    );
    expect(ok("describe-event", "wreck", "--label", "The sinking")).toContain(
      "may state when this happened",
    );
    // Other edits don't prompt.
    expect(ok("update-scene", "market", "--title", "Market")).toBe("");
  });

  test("an edit prompts only when it changes what text can state, and at most three lines", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-actor", "mara", "Mara");
    ok("add-drive", "calm", "Stay calm", "--actor", "mara");
    ok("add-event", "wreck", "The wreck");
    ok("set-position", "wreck", "10");
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      ok("add-fact", `f${i}`, `Mara saw the wreck, fact ${i}`);
    }
    const prompt = "What may still state the old";

    // No-op and kind-only edits change nothing text states.
    expect(ok("update-actor", "mara", "--name", "Mara")).toBe("");
    expect(ok("update-actor", "mara", "--kind", "person")).toBe("");
    expect(ok("update-actor", "mara", "--notes", "Keeps the light")).toBe("");
    expect(ok("update-drive", "calm", "--stakes", "Her post")).toBe("");
    expect(ok("update-drive", "calm", "--want", "Stay calm")).toBe("");
    expect(ok("describe-event", "wreck", "--summary", "It sinks")).toBe("");
    expect(ok("set-position", "wreck", "10")).toBe("");

    // A rename prompts, three lines at most, then points at trace.
    const renamed = ok("update-actor", "mara", "--name", "Maren");
    const lines = renamed.trimEnd().split("\n");
    expect(lines[0]).toContain(`${prompt} actor:mara`);
    expect(lines.slice(1, 4).every((line) => line.includes('"Mara"'))).toBe(
      true,
    );
    expect(lines[4]).toBe("...run trace actor:mara for all 8.");
    expect(lines).toHaveLength(5);
    // A new holder prompts for the old one's name.
    ok("add-actor", "ivo", "Ivo");
    ok("update-actor", "mara", "--name", "Mara");
    expect(ok("update-drive", "calm", "--actor", "ivo")).toContain(
      "names its holder Mara",
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
    expect(lines[1]).toBe(
      '- fact:vow ("Her vow to keep the light binds her"): text "keep the light" names it',
    );
    expect(lines.slice(2, 4).every((l) => l.includes("names its holder"))).toBe(
      true,
    );
    expect(lines[4]).toBe("...run trace drive:d for all 14.");
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
    expect(malformed.stderr).toContain('<start>: "soon" is not a time');
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
      'Also removed: knowledge:oren-lightning ("Oren believes: Lightning struck it")\n',
    );
    ok("add-knowledge", "oren-arson", "oren", "knows", "version:arson");
    expect(ok("remove-event", "burning")).toBe(
      'Also removed: version:arson ("Vell set the fire"), knowledge:oren-arson ("Oren knows: Vell set the fire")\n',
    );
    expect(ok("remove-fact", "tithe")).toContain(
      "Also removed: knowledge:vell-tithe",
    );
    expect(ok("remove-actor", "oren")).toBe("");
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

  test("holds dates, objects planted and paid off, participants and a drive's life", () => {
    ok("init", "A son comes home for a funeral.");
    ok("add-actor", "lew", "Lew");
    ok("add-event", "death", "Dale dies");
    ok("add-event", "burial", "Dale is buried");
    ok("set-position", "death", "1954-10-12");
    ok("set-position", "burial", "1954-10-12 23:30");
    ok("constrain", "same-night", "death", "before", "burial");
    expect(ok("contradictions")).toBe("No contradictions.\n");
    expect(ok("show", "event:burial")).toContain(
      "position: 12 October 1954, 23:30\n",
    );
    ok("add-event", "bus", "The morning bus");
    ok("set-position", "bus", "1954-10-15");
    ok("constrain", "after", "burial", "before", "bus", "--gap", "2d");
    expect(saved().timeline.constraints[0]?.duration?.tolerance).toBeCloseTo(
      0.5 / 365.2425,
    );
    expect(ok("render")).toContain(
      "- **Dale dies** (12 October 1954) [before Dale is buried]\n- **Dale is buried** (12 October 1954, 23:30)",
    );

    ok("add-object", "hook", "The sack hook");
    ok("add-scene", "dock", "The dock");
    ok("add-scene", "barn", "The barn");
    ok("set-scene-links", "dock", "plants", "object:hook");
    ok("set-scene-links", "barn", "pays-off", "object:hook");
    expect(ok("show", "object:hook")).toBe(
      'object:hook\nname: The sack hook\nplanted in: scene:dock ("The dock")\npaid off in: scene:barn ("The barn")\n',
    );

    ok("set-participant", "death", "object:hook", "--role", "the weapon");
    ok("set-participant", "death", "actor:lew", "--role", "found him");
    expect(ok("show", "event:death")).toContain(
      'participant: actor:lew ("Lew") (found him)\nparticipant: object:hook ("The sack hook") (the weapon)\n',
    );
    expect(ok("show", "object:hook")).toContain(
      'in event: event:death ("Dale dies") (the weapon)\n',
    );

    ok("add-drive", "truth", "Learn the truth", "--actor", "lew");
    ok("add-drive", "bury", "Bury it", "--actor", "lew");
    ok("add-drive-turn", "truth", "satisfied", "--at", "burial");
    ok("add-drive-turn", "truth", "flipped", "--into", "bury", "--at", "bus");
    expect(ok("show", "drive:truth")).toContain(
      'life, in order:\n  1. satisfied at event:burial ("Dale is buried")\n  2. flipped into drive:bury ("Bury it") at event:bus ("The morning bus")\n',
    );
    expect(ok("show", "drive:bury")).toContain(
      'flipped from: drive:truth ("Learn the truth")\n',
    );
    const wrong = cli(
      file,
      "add-drive-turn",
      "truth",
      "satisfied",
      "--into",
      "bury",
    );
    expect(wrong.code).toBe(1);
    expect(wrong.stderr).toContain(
      "a drive satisfied doesn't turn into another drive",
    );

    expect(ok("remove-event", "death")).toBe(
      "Also removed: the part of actor:lew in event:death, the part of object:hook in event:death\n",
    );
    expect(ok("remove-drive-turn", "truth", "1")).toBe("");
    expect(saved().drives.find((d) => d.id === "truth")?.turns).toHaveLength(1);
  });

  test("stays quiet in batch use: no trace for adds or a first placement, and dates said as dates", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-fact", "reef", "The wreck on the reef in 1954 drowned the crew");
    // A clean edit prints nothing, and neither does adding or first placing.
    expect(ok("add-event", "wreck", "The wreck")).toBe("");
    expect(ok("set-position", "wreck", "1954-10-12")).toBe("");
    expect(ok("add-event", "letter", "The letter")).toBe("");
    expect(ok("set-position", "letter", "1954-10-12 21:00")).toBe("");
    // A real move still prints the trace.
    expect(ok("set-position", "wreck", "1953")).toContain(
      "What may still state the old event:wreck",
    );
    ok("set-position", "wreck", "1954-10-12");

    // Finding mdk6: a gap given in weeks is said in units, not years.
    const problem = ok(
      "constrain",
      "c3",
      "wreck",
      "before",
      "letter",
      "--gap",
      "2w",
    );
    expect(problem).toBe(
      "Timeline problem (kept; see contradictions): constraint c3 puts 14 days give or take 3.5 days between wreck and letter, but their positions put -0.1 days to 0.9 days between them\n",
    );
    expect(ok("contradictions")).toContain(
      "- constraint c3 puts 14 days give or take 3.5 days between wreck and letter",
    );
    // Finding otbw: a gap off by days on a year still reads as off.
    ok("add-event", "far", "Far");
    ok("set-position", "far", "1955-10-26");
    expect(
      ok(
        "constrain",
        "c5",
        "wreck",
        "before",
        "far",
        "--gap",
        "1y",
        "--tolerance",
        "1d",
      ),
    ).toBe(
      "Timeline problem (kept; see contradictions): constraint c5 puts 365.2 days give or take 1 day between wreck and far, but their positions put 378.3 days to 380.3 days between them\n",
    );
    ok("remove-constraint", "c5");
    expect(ok("show", "event:wreck")).toContain(
      "constraint c3: wreck before letter (gap 2 weeks ± 84 hours)\n",
    );
    ok("remove-constraint", "c3");

    // A range of dates prints as dates everywhere.
    ok("set-position", "letter", "1954-11-01", "--end", "1954-11-03");
    expect(ok("show", "event:letter")).toContain(
      "position: 1 to 3 November 1954\n",
    );
    expect(ok("list", "event")).toContain(
      'event:letter ("The letter") at 1 to 3 November 1954\n',
    );
    expect(ok("render")).toContain("- **The letter** (1 to 3 November 1954)");
    ok("add-scene", "storm", "Storm");
    ok("set-scene-links", "storm", "reveals", "event:letter");
    expect(ok("reader-order")).toContain(
      'reveals event:letter ("The letter") at 1 to 3 November 1954\n',
    );
    ok("set-position", "letter", "1954.5", "--end", "1954-11");
    expect(ok("show", "event:letter")).toContain(
      "position: 2 July 1954, 12:00 to 30 November 1954\n",
    );
    // Whole years stay years.
    ok("set-position", "letter", "1200", "--end", "1210");
    expect(ok("show", "event:letter")).toContain(
      "position: year 1200 to 1210\n",
    );

    // gaps no longer lists facts linked to nothing.
    expect(ok("gaps")).not.toContain("fact-unconnected");

    // update-event is describe-event.
    expect(ok("update-event", "letter", "--label", "The letter comes")).toBe(
      "",
    );
    expect(saved().timeline.events.find((e) => e.id === "letter")?.label).toBe(
      "The letter comes",
    );
    expect(cli("--help").stdout).toContain(
      "  describe-event <id> [--label <text>] [--summary <text>] (also update-event)\n",
    );
  });

  test("set-scene-links adds and removes without retyping, and a set says what it dropped", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-object", "penny", "The penny");
    ok("add-object", "hook", "The hook");
    ok("add-actor", "mara", "Mara");
    ok("add-scene", "smoke", "Smoke");
    const plants = () =>
      saved()
        .scenes.find((s) => s.id === "smoke")
        ?.plants.map((r) => r.id);
    expect(ok("set-scene-links", "smoke", "plants", "object:penny")).toBe("");
    expect(
      ok(
        "set-scene-links",
        "smoke",
        "plants",
        "--add",
        "object:hook",
        "object:penny",
      ),
    ).toBe("");
    expect(plants()).toEqual(["hook", "penny"]);
    expect(
      ok("set-scene-links", "smoke", "plants", "--remove", "object:hook"),
    ).toBe("");
    expect(plants()).toEqual(["penny"]);
    const missing = cli(
      file,
      "set-scene-links",
      "smoke",
      "plants",
      "--remove",
      "object:hook",
    );
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain(
      "smoke plants doesn't include object:hook",
    );
    // Replacing the list names what went, as Round 1's writer dropped a plant.
    expect(ok("set-scene-links", "smoke", "plants", "actor:mara")).toBe(
      "Dropped from smoke plants: object:penny (--add adds without replacing the list)\n",
    );
    expect(ok("set-scene-links", "smoke", "pays-off", "actor:mara")).toBe("");
    expect(ok("set-scene-links", "smoke", "pays-off", "none")).toBe(
      "Dropped from smoke pays-off: actor:mara (--add adds without replacing the list)\n",
    );
  });

  test("render prints only the sections asked for, named after what they hold", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-open-question", "who", "Who wrote it?");
    ok("add-candidate", "who", "ferry", "The ferryman");
    ok("add-open-question", "why", "Why now?");
    ok("add-candidate", "why", "debt", "A debt came due");
    ok("answer-open-question", "why", "debt");
    expect(ok("render", "--section", "undecided")).toBe(
      "## Open questions: undecided\n\n- Who wrote it?\n  - The ferryman.\n",
    );
    expect(ok("render", "--section", "decided,revealed")).toBe(
      "## Open questions: decided, not revealed yet\n\n- Why now? A debt came due.\n\n## Open questions: revealed\n\n(nothing yet)\n",
    );
    const wrong = cli(file, "render", "--section", "open-questions");
    expect(wrong.code).toBe(2);
    expect(wrong.stderr).toContain(
      "no section open-questions: --section takes premise, people,",
    );
  });

  test("a count runs as a series, out of a total that changes, and is checked", () => {
    ok("init", "A debt comes due.");
    for (const [id, when] of [
      ["pact", "612-11-03"],
      ["fade", "619-05-12"],
      ["reading", "619-04-07"],
      ["fair", "619-05-13"],
      ["sells", "619-05-28 23:00"],
      ["calls", "619-05-29 01:00"],
    ] as const) {
      ok("add-event", id, id);
      ok("set-position", id, when);
    }
    expect(ok("add-count", "parts", "Parts of the pact")).toBe("");
    ok("set-count", "parts", "pact", "1000");
    ok("set-count", "parts", "fade", "992", "--note", "the Widow's eight");
    expect(
      ok(
        "add-count",
        "ledger",
        "The Ledger's parts",
        "--of",
        "parts",
        "--threshold",
        "more-than-half",
        "--direction",
        "rises",
      ),
    ).toBe("");
    // A first value at an event prints nothing.
    expect(ok("set-count", "ledger", "reading", "180")).toBe("");
    ok("set-count", "ledger", "fair", "452");
    ok("set-count", "ledger", "sells", "488");
    expect(ok("show", "count:ledger")).toBe(
      [
        "count:ledger",
        "label: The Ledger's parts",
        'of: count:parts ("Parts of the pact")',
        "threshold: more than half of the total",
        "direction: rises",
        "values, in story order:",
        "  event:reading at 7 April 619: 180 of 1000, 321 short of more than half (501)",
        "  event:fair at 13 May 619: 452 of 992, 45 short of more than half (497)",
        "  event:sells at 28 May 619, 23:00: 488 of 992",
        "",
      ].join("\n"),
    );
    expect(ok("show", "event:sells")).toContain(
      'count: count:ledger ("The Ledger\'s parts") = 488 of 992, 9 short of more than half (497)\n',
    );
    expect(ok("render", "--section", "counts")).toContain(
      "- **The Ledger's parts**, out of Parts of the pact, only rising.\n  - reading (7 April 619): 180 of 1000, 321 short of more than half (501).\n",
    );

    // A value against the direction, or above the total, is reported.
    expect(ok("set-count", "ledger", "calls", "400")).toBe(
      'Count problem (kept; see contradictions): "The Ledger\'s parts" falls from 488 at "sells" to 400 at "calls", though it only rises.\n',
    );
    ok("set-count", "ledger", "calls", "none");
    ok("set-count", "ledger", "calls", "1200");
    expect(ok("contradictions")).toBe(
      '- "The Ledger\'s parts" is 1200 at "calls", above its total of 992. [count:ledger]\n',
    );
    ok("set-count", "ledger", "calls", "497");
    expect(ok("contradictions")).toBe("No contradictions.\n");

    // trace follows it, and a changed value prompts with text stating the old.
    ok("add-fact", "tally", "The Ledger holds 452 parts by the fair");
    expect(ok("trace", "count:ledger")).toContain(
      '- fact:tally ("The Ledger holds 452 parts by the fair"): text "452" states its value 452',
    );
    expect(ok("trace", "event:fair")).toContain(
      '- count:ledger ("The Ledger\'s parts"): linked: a count set to 452 then',
    );
    expect(ok("set-count", "ledger", "fair", "441")).toContain(
      "What may still state the old count:ledger",
    );

    // Removing an event takes its values; removing a total clears it.
    expect(ok("remove-event", "fair")).toBe(
      "Also removed: the value of count:ledger at event:fair\n",
    );
    ok("remove-count", "parts");
    expect(saved().counts.find((c) => c.id === "ledger")?.of).toBeUndefined();
    const both = cli(
      file,
      "update-count",
      "ledger",
      "--total",
      "10",
      "--of",
      "ledger",
    );
    expect(both.code).toBe(1);
  });

  test("a count says how it stands only where that changes, and reader-order --before gives it as of the scene", () => {
    ok("init", "A keeper keeps the light.");
    for (const [i, value] of [60, 70, 11, 80, 90].entries()) {
      ok("add-event", `e${i + 1}`, `Night ${i + 1}`);
      ok("set-position", `e${i + 1}`, `1954-10-${10 + i}`);
      if (i === 0) {
        ok("add-count", "oil", "Lamp oil", "--threshold", "50");
        ok(
          "add-count",
          "crew",
          "Hands",
          "--of",
          "oil",
          "--threshold",
          "more-than-half",
        );
      }
      ok("set-count", "oil", `e${i + 1}`, String(value));
    }
    expect(ok("show", "count:oil")).toContain(
      [
        "values, in story order:",
        '  event:e1 ("Night 1") at 10 October 1954: 60, reaching 50',
        '  event:e2 ("Night 2") at 11 October 1954: 70',
        '  event:e3 ("Night 3") at 12 October 1954: 11, 39 short of 50',
        '  event:e4 ("Night 4") at 13 October 1954: 80, reaching 50',
        '  event:e5 ("Night 5") at 14 October 1954: 90',
        "below the threshold at: event:e3 (11)",
        "",
      ].join("\n"),
    );
    expect(ok("render", "--section", "counts")).toContain(
      "  Below the threshold at: Night 3 (11).\n",
    );
    // More than half of a total of zero is no threshold.
    ok("set-count", "oil", "e5", "0");
    ok("set-count", "crew", "e5", "0");
    expect(ok("show", "count:crew")).toContain(": 0 of 0\n");

    ok("add-scene", "storm", "Storm");
    ok("set-scene-events", "storm", "e4");
    expect(ok("reader-order", "--before", "storm")).toContain(
      'Counts as of the scene:\n- count:oil ("Lamp oil"): 80, reaching 50, since event:e4 at 13 October 1954\n',
    );

    // A scene that tells and withholds one ref is noted, once.
    ok("set-scene-links", "storm", "implies", "event:e2");
    expect(ok("set-scene-links", "storm", "withholds", "event:e2")).toBe(
      "Note: scene storm now both implies and withholds event:e2; one of the two is probably meant.\n",
    );
    expect(
      ok("set-scene-links", "storm", "withholds", "--add", "event:e1"),
    ).toBe("");
  });

  test("render lists reader questions in the order scenes raise them, open then answered", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-scene", "one", "One");
    ok("add-scene", "two", "Two");
    ok("add-reader-question", "a-late", "Who sent it?");
    ok("add-reader-question", "b-early", "Will she open it?");
    ok("add-reader-question", "c-none", "Where is the ship?");
    ok("set-reader-question-scenes", "a-late", "--opens", "two");
    ok(
      "set-reader-question-scenes",
      "b-early",
      "--opens",
      "one",
      "--answered",
      "two",
    );
    expect(ok("render", "--section", "reader-questions")).toBe(
      [
        "## Reader questions, in the order they are raised",
        "",
        "Still open:",
        '- Who sent it? (raised in "Two")',
        "- Where is the ship?",
        "",
        "Answered:",
        '- Will she open it? (raised in "One"; answered in "Two")',
        "",
      ].join("\n"),
    );
  });

  test("a scene's viewpoint marks what the reader knows and they don't; memberships list from both sides", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-actor", "mara", "Mara");
    ok("add-actor", "ivo", "Ivo");
    ok("add-actor", "crew", "The crew", "--kind", "organization");
    ok("add-event", "signs-on", "Ivo signs on");
    ok("set-position", "signs-on", "1950");
    ok("add-event", "wreck", "The wreck");
    ok("set-position", "wreck", "1954-10-12");
    ok("add-event", "letter", "The letter");
    ok("set-position", "letter", "1954-10-20");
    ok("add-version", "fog", "wreck", "The fog took her", "--by", "ivo");
    ok("add-knowledge", "ivo-wreck", "ivo", "knows", "event:wreck");
    ok("add-knowledge", "mara-fog", "mara", "believes", "version:fog");
    ok("add-fact", "cold", "The sea is cold");
    ok("add-scene", "night", "The night");
    ok("set-scene-events", "night", "wreck");
    ok("set-scene-links", "night", "reveals", "fact:cold");
    ok("add-scene", "post", "The post");
    ok("set-scene-events", "post", "letter");
    // A clean edit prints nothing.
    expect(ok("set-scene-viewpoint", "post", "mara")).toBe("");
    expect(ok("show", "scene:post")).toContain(
      'viewpoint: actor:mara ("Mara")',
    );
    expect(ok("reader-order", "--before", "post")).toBe(
      [
        'Before 2. scene:post ("The post"), through the eyes of Mara, at event:letter ("The letter") at 20 October 1954 (the latest event it shows), the reader has been told:',
        '- event:wreck ("The wreck") at 12 October 1954, 7 days before: shown in 1; Mara doesn\'t know, believes version:fog ("The fog took her")',
        '- fact:cold ("The sea is cold"): revealed in 1',
        "",
      ].join("\n"),
    );
    expect(ok("set-scene-viewpoint", "post", "ivo")).toBe("");
    expect(ok("reader-order", "--before", "post")).not.toContain("know");
    expect(cli(file, "set-scene-viewpoint", "post", "nobody").stderr).toContain(
      "actor nobody does not exist",
    );

    expect(
      ok(
        "add-membership",
        "ivo-crew",
        "ivo",
        "crew",
        "--since",
        "signs-on",
        "--until",
        "wreck",
      ),
    ).toBe("");
    ok("add-membership", "mara-crew", "mara", "crew");
    expect(ok("show", "actor:ivo")).toContain(
      'member of: actor:crew ("The crew") since event:signs-on ("Ivo signs on") until event:wreck ("The wreck") (membership ivo-crew)',
    );
    const group = ok("show", "actor:crew");
    expect(group).toContain(
      'member: actor:mara ("Mara") (membership mara-crew)\nmember: actor:ivo ("Ivo") since event:signs-on ("Ivo signs on") until event:wreck ("The wreck") (membership ivo-crew)',
    );
    expect(ok("show", "event:wreck")).toContain(
      'membership ivo-crew: actor:ivo ("Ivo") leaves actor:crew ("The crew")',
    );
    expect(ok("update-membership", "ivo-crew", "--since", "letter")).toBe(
      'Membership problem (kept; see contradictions): "Ivo" belongs to "The crew" until "The wreck", which happens before "The letter", when it starts.\n',
    );
    expect(ok("update-membership", "ivo-crew", "--since", "signs-on")).toBe("");
    expect(ok("remove-membership", "mara-crew")).toBe("");
    expect(ok("remove-actor", "ivo")).toContain(
      "the membership ivo-crew of actor:ivo in actor:crew",
    );
    expect(ok("show", "actor:crew")).not.toContain("member");
    expect(saved().scenes[1]).not.toHaveProperty("viewpoint");
  });

  test("span gives the time between two events, and reader-order --before what the reader has been told", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-event", "bakehouse", "The bakehouse");
    ok("set-position", "bakehouse", "619-05-01");
    ok("add-event", "heist", "The heist");
    ok("set-position", "heist", "619-05-28 23:00");
    ok("add-event", "unplaced", "Unplaced");
    expect(ok("span", "bakehouse", "heist")).toBe(
      'From event:bakehouse ("The bakehouse") at 1 May 619 to event:heist ("The heist") at 28 May 619, 23:00: 27 days.\n',
    );
    expect(ok("span", "heist", "bakehouse")).toContain(
      ": 27 days, going back.\n",
    );
    expect(cli(file, "span", "heist", "unplaced").stderr).toContain(
      "event unplaced has no position",
    );

    ok(
      "add-fact",
      "rule",
      "A pact passes to whoever holds more than half its parts, by the old law of the Concordance",
    );
    ok("add-scene", "bake", "Bakehouse");
    ok("set-scene-events", "bake", "bakehouse");
    ok("set-scene-links", "bake", "reveals", "fact:rule");
    ok("set-scene-links", "bake", "withholds", "event:heist");
    ok("add-scene", "eye", "Into the Eye");
    ok("set-scene-events", "eye", "heist");
    expect(ok("reader-order", "--before", "eye")).toBe(
      [
        'Before 2. scene:eye ("Into the Eye"), at event:heist ("The heist") at 28 May 619, 23:00 (the latest event it shows), the reader has been told:',
        '- event:bakehouse ("The bakehouse") at 1 May 619, 27 days before: shown in 1',
        '- fact:rule ("A pact passes to whoever holds more than half its parts, by…"): revealed in 1',
        "Held back and not told yet:",
        '- event:heist ("The heist")',
        "",
      ].join("\n"),
    );
    expect(ok("reader-order", "--before", "bake")).toBe(
      'Before 1. scene:bake ("Bakehouse"), at event:bakehouse ("The bakehouse") at 1 May 619 (the latest event it shows), the reader has been told:\n(nothing yet)\n',
    );
  });

  test("set-count traces only a changed value, and finds text stating the old one, in words or rounded", () => {
    ok("init", "A keeper keeps the light.");
    ok("add-event", "storm", "The storm");
    ok("add-event", "calm", "The calm");
    ok("add-count", "crew", "Hands aboard");
    ok("set-count", "crew", "storm", "540");
    ok("set-count", "crew", "calm", "790");
    ok("add-fact", "rumour", "Over five hundred hands, the harbour says");
    ok("add-fact", "exact", "Five hundred and forty souls signed on");
    ok("add-fact", "other", "By the calm, 790 were left");
    // Only the note changed: nothing to trace.
    expect(ok("set-count", "crew", "storm", "540", "--note", "Signed on")).toBe(
      "",
    );
    const changed = ok("set-count", "crew", "storm", "450");
    expect(changed).toContain(
      '- fact:exact ("Five hundred and forty souls signed on"): text "Five hundred and forty" states its value 540',
    );
    expect(changed).toContain(
      'text "five hundred" may state its value 540 roughly',
    );
    // A value the change didn't touch is no suspect.
    expect(changed).not.toContain("fact:other");
  });

  test("set-count rounds only values from 100 up, and keeps a note left out", () => {
    ok("init", "A keeper keeps the light.");
    ok("add-event", "storm", "The storm");
    ok("add-count", "boats", "Boats afloat");
    ok("set-count", "boats", "storm", "12", "--note", "Twelve after the storm");
    ok("add-fact", "f4", "Ten men crew the lifeboat, and two more stand by");
    // "Ten" doesn't state 12 roughly (finding worldcrafter-a6my).
    expect(ok("set-count", "boats", "storm", "14")).not.toContain("fact:f4");
    // Without --note, the note at that event stays (worldcrafter-d5wq);
    // --note "" clears it.
    expect(saved().counts[0]?.values).toEqual([
      { at: "storm", value: 14, note: "Twelve after the storm" },
    ]);
    ok("set-count", "boats", "storm", "15", "--note", "");
    expect(saved().counts[0]?.values).toEqual([
      { at: "storm", value: 15, note: "" },
    ]);
  });

  test("an edit's trace in a batch still lists what the batch rewrote, and leaves out the scene being written", () => {
    ok("init", "A keeper finds a letter.");
    ok(
      "add-event",
      "wreck",
      "The wreck",
      "--summary",
      "The ferry Ondine sinks off Gull Point in a black storm",
    );
    ok(
      "add-fact",
      "f1",
      "Everyone remembers the ferry Ondine going down off Gull Point in the storm",
    );
    ok("add-fact", "f2", "The lamp is lit at dusk");
    ok("add-scene", "harbour", "The harbour", "--summary", "Mara on the quay");
    ok("set-scene-events", "harbour", "wreck");
    const reword = [
      "describe-event",
      "wreck",
      "--summary",
      "A trawler founders near the harbour on a calm night",
    ];
    const restore = () =>
      ok(
        "describe-event",
        "wreck",
        "--summary",
        "The ferry Ondine sinks off Gull Point in a black storm",
      );
    const batch = (...commands: string[][]) => {
      const script = commands
        .map((c) => ["bun", SCRIPT, file, ...c].map((a) => `'${a}'`).join(" "))
        .join("; ");
      return Bun.spawnSync(["bash", "-c", `${script}; exit $?`], {
        stdout: "pipe",
      }).stdout.toString();
    };
    // A fact rewritten earlier in the batch for another reason still states
    // the old wreck (finding worldcrafter-gu8c), as does one left alone.
    const other = ["update-fact", "f2", "--text", "The lamp is lit at dark"];
    const still = [
      "update-fact",
      "f1",
      "--text",
      "Everyone still remembers the ferry Ondine going down off Gull Point in the storm",
    ];
    expect(batch(other, reword)).toContain("- fact:f1 (");
    restore();
    expect(batch(still, reword)).toContain("- fact:f1 (");
    restore();
    // The scene whose prose was written since the story was saved isn't
    // listed, for the rest of the batch.
    ok(
      "update-scene",
      "harbour",
      "--summary",
      "Mara on the quay, where the ferry Ondine went down off Gull Point in the storm",
    );
    expect(ok(...reword)).toContain('- scene:harbour ("The harbour")');
    restore();
    mkdirSync(join(dir, "scenes"));
    writeFileSync(join(dir, "scenes", "harbour.md"), "Gulls.\n");
    expect(batch(other, reword)).not.toContain("scene:harbour");
    // trace on its own still lists it.
    expect(ok("trace", "event:wreck")).toContain("scene:harbour");
  });

  test("trace lists dependents mentions misses, scene prose among them, and edits print the top of it", () => {
    ok("init", "A keeper finds a letter.");
    ok(
      "add-event",
      "wreck",
      "The wreck",
      "--summary",
      "The Alba sank off the northern reef",
    );
    ok("set-position", "wreck", "1203");
    ok("add-event", "letter", "The letter arrives");
    ok("set-position", "letter", "1213");
    ok("add-cause", "wreck", "letter");
    ok(
      "add-fact",
      "reef",
      "Nobody fishes the northern reef since the Alba sank",
    );
    ok("add-scene", "harbour", "The harbour");
    ok("set-scene-events", "harbour", "wreck");
    mkdirSync(join(dir, "scenes"));
    writeFileSync(
      join(dir, "scenes", "harbour.md"),
      "The gulls were loud.\n\nTen years since the boat went down.\n",
    );
    expect(ok("mentions", "event:wreck")).toBe("No free text mentions it.\n");
    const prose = join(dir, "scenes", "harbour.md");
    expect(ok("trace", "event:wreck")).toBe(
      [
        'What may depend on event:wreck ("The wreck"), likeliest first:',
        `- ${prose}:3 "Ten years since the boat went down.": "Ten years since" matches the 10 years between The wreck and The letter arrives; in a scene that depicts it`,
        '- fact:reef ("Nobody fishes the northern reef since the Alba sank"): text shares words: alba, northern, reef, sank',
        '- event:letter ("The letter arrives"): linked: an event it caused',
        '- scene:harbour ("The harbour"): linked: a scene that depicts it',
        `- ${prose}: the scene depicts it`,
        "",
      ].join("\n"),
    );
    const moved = ok("set-position", "wreck", "1190");
    expect(moved).toContain(
      "What may still state the old event:wreck, likeliest first (nothing was rewritten):\n",
    );
    expect(moved).toContain(`${prose}:3 "Ten years since the boat went down."`);
    expect(ok("trace", "event:letter")).toContain(
      "linked: an event that caused it",
    );
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
    ok("add-actor", "crew", "The crew", "--kind", "organization");
    ok("add-event", "signs-on", "Ivo signs on");
    ok("add-drive", "keep-quiet", "Keep the wreck quiet");
    ok("add-event", "letter", "The letter arrives");
    ok("set-position", "letter", "18");
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
