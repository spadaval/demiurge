/**
 * Runs the story CLI as a subprocess, as an agent or a person would, against
 * a file in a temporary directory.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { wordCount } from "../src/story/render";
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
      "## Decided\n\n- Why did Joel leave? He found what the caravans carried.\n",
    );
    expect(rendered).not.toContain("He wanted adventure");
    expect(rendered).toMatch(/\(\d+ words\)\n$/);
    for (const id of ["joel", "belong", "exile", "why-leave", "cargo"]) {
      expect(rendered).not.toContain(id);
    }
  });

  test("a question being weighed renders in one line, and the word count is the render's", () => {
    ok("init", "A keeper finds a letter.");
    ok("add-open-question", "who", "Who wrote it?");
    ok("add-candidate", "who", "ferry", "The ferryman, who saw the wreck");
    ok("add-candidate", "who", "keeper", "The old keeper, before he died");
    const words = (out: string) => {
      const [, count] = out.match(/\((\d+) words\)\n$/) ?? [];
      return {
        count: Number(count),
        text: out.replace(/\(\d+ words\)\n$/, ""),
      };
    };

    const open = words(ok("render"));
    expect(open.text).toContain("The ferryman, who saw the wreck.");
    expect(open.count).toBe(wordCount(open.text));

    ok("set-open-question-working", "who");
    expect(ok("show", "open-question:who")).toContain("working: yes");
    const weighed = words(ok("render"));
    expect(weighed.text).toContain("- Who wrote it? (being weighed)\n");
    expect(weighed.text).not.toContain("ferryman");
    expect(weighed.count).toBe(wordCount(weighed.text));
    expect(weighed.count).toBeLessThan(open.count);
    expect(saved().openQuestions[0]?.candidates).toHaveLength(2);

    ok("set-open-question-working", "who", "--stop");
    expect(saved().openQuestions[0]?.working).toBeUndefined();
    expect(words(ok("render")).count).toBe(open.count);
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
