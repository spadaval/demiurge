import { describe, expect, test } from "bun:test";
import { err, ok } from "neverthrow";
import {
  array,
  convert,
  either,
  integer,
  nullable,
  number,
  object,
  oneOf,
  ref,
  string,
} from "./tool-schema";

describe("tool schemas", () => {
  const schema = object(
    { id: string("The ID."), tags: array(string()) },
    { size: integer(), clear: nullable(number()) },
  );

  test("describe an object with its required fields, closed", () => {
    expect(schema.json).toEqual({
      type: "object",
      properties: {
        id: { type: "string", description: "The ID." },
        tags: { type: "array", items: { type: "string" } },
        size: { type: "integer" },
        clear: { anyOf: [{ type: "number" }, { type: "null" }] },
      },
      required: ["id", "tags"],
      additionalProperties: false,
    });
  });

  test("parse a value that fits, leaving out absent optional fields", () => {
    expect(schema.parse({ id: "a", tags: ["x"] }, "")._unsafeUnwrap()).toEqual({
      id: "a",
      tags: ["x"],
    });
    expect(
      schema.parse({ id: "a", tags: [], clear: null }, "")._unsafeUnwrap(),
    ).toEqual({ id: "a", tags: [], clear: null });
  });

  test("read null for an optional field that can't be null as absent", () => {
    expect(
      schema.parse({ id: "a", tags: [], size: null }, "")._unsafeUnwrap(),
    ).toEqual({ id: "a", tags: [] });
  });

  test("give every issue with its path", () => {
    expect(
      schema
        .parse({ tags: ["x", 2], size: 1.5, colour: "red" }, "")
        ._unsafeUnwrapErr(),
    ).toEqual([
      { path: "id", message: "is required" },
      { path: "tags[1]", message: "must be a string, not a number" },
      { path: "size", message: "must be a whole number, not a number" },
      {
        path: "colour",
        message: "is not a field here; the fields are id, tags, size, clear",
      },
    ]);
    expect(schema.parse([], "")._unsafeUnwrapErr()).toEqual([
      { path: "", message: "must be an object, not a list" },
    ]);
  });

  test("try each alternative of either", () => {
    const threshold = either(number(), oneOf(["more_than_half"]));
    expect(threshold.parse(3, "t")._unsafeUnwrap()).toBe(3);
    expect(threshold.parse("more_than_half", "t")._unsafeUnwrap()).toBe(
      "more_than_half",
    );
    expect(threshold.parse("half", "t")._unsafeUnwrapErr()).toEqual([
      {
        path: "t",
        message:
          'must be a number, not a string, or must be one of more_than_half, not "half"',
      },
    ]);
  });

  test("convert a value, refusing at its path", () => {
    const positive = convert(integer(), (n) =>
      n > 0 ? ok(n - 1) : err("must be 1 or more"),
    );
    expect(positive.json).toEqual({ type: "integer" });
    expect(positive.parse(3, "p")._unsafeUnwrap()).toBe(2);
    expect(positive.parse(0, "p")._unsafeUnwrapErr()).toEqual([
      { path: "p", message: "must be 1 or more" },
    ]);
    expect(ref().parse("candidate:q/c", "r")._unsafeUnwrap()).toEqual({
      kind: "candidate",
      questionId: "q",
      id: "c",
    });
    expect(ref().parse("nope", "r")._unsafeUnwrapErr()[0]?.path).toBe("r");
  });
});
