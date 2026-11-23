/**
 * Typed schemas for tool arguments: each is a JSON Schema to send the model
 * and a parser that checks the model's arguments against it, built
 * together so the two can't drift. A schema's type is what parsing
 * returns, and the story tools (`./tools.ts`) check at compile time that
 * it is exactly the command's fields.
 *
 * Parsing is strict where a mistake would change the meaning: a wrong type,
 * a value outside an enum, a missing required field or an unknown field is
 * an issue, with the path to it. It is lenient in one place: `null` for an
 * optional field that can't be null reads as leaving it out, as models
 * often write it.
 */

import { err, ok, type Result } from "neverthrow";
import type { JsonObject, JsonValue } from "../llm/types";
import { KIND_NAMES, parseRef } from "./refs";
import type { Ref } from "./story";

/** What is wrong with an argument, and where: `refs[2]`, or `` for the whole. */
export type Issue = { path: string; message: string };

export interface Schema<T> {
  /** The JSON Schema the model is sent. */
  readonly json: JsonObject;
  /** The value as `T`, or what is wrong with it. `path` names where it is. */
  parse(value: unknown, path: string): Result<T, Issue[]>;
  /** Makes a schema's type invariant, so a field left out of it is caught. */
  readonly _type?: (value: T) => T;
}

/** The type a schema parses to. */
export type Infer<S> = S extends Schema<infer T> ? T : never;

/** What any schema has, whatever its type. */
type AnySchema = Pick<Schema<unknown>, "json" | "parse">;

type InferAny<S> = S extends {
  parse(value: unknown, path: string): Result<infer T, Issue[]>;
}
  ? T
  : never;

const issue = (path: string, message: string) =>
  err<never, Issue[]>([{ path, message }]);

const at = (path: string, key: string | number) =>
  typeof key === "number"
    ? `${path}[${key}]`
    : path === ""
      ? key
      : `${path}.${key}`;

/** `a string`, `a list`, `null`: how a wrong value is named in an issue. */
function what(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  return typeof value === "object" ? "an object" : `a ${typeof value}`;
}

function schema<T>(
  json: JsonObject,
  parse: (value: unknown, path: string) => Result<T, Issue[]>,
): Schema<T> {
  return { json, parse };
}

/** The same schema with `description` in its JSON Schema. */
export function describe<T>(base: Schema<T>, description: string): Schema<T> {
  return schema({ ...base.json, description }, base.parse);
}

export function string(description?: string): Schema<string> {
  return schema(
    { type: "string", ...(description === undefined ? {} : { description }) },
    (value, path) =>
      typeof value === "string"
        ? ok(value)
        : issue(path, `must be a string, not ${what(value)}`),
  );
}

export function number(description?: string): Schema<number> {
  return schema(
    { type: "number", ...(description === undefined ? {} : { description }) },
    (value, path) =>
      typeof value === "number" && Number.isFinite(value)
        ? ok(value)
        : issue(path, `must be a number, not ${what(value)}`),
  );
}

export function integer(description?: string): Schema<number> {
  return schema(
    { type: "integer", ...(description === undefined ? {} : { description }) },
    (value, path) =>
      typeof value === "number" && Number.isInteger(value)
        ? ok(value)
        : issue(path, `must be a whole number, not ${what(value)}`),
  );
}

export function boolean(description?: string): Schema<boolean> {
  return schema(
    { type: "boolean", ...(description === undefined ? {} : { description }) },
    (value, path) =>
      typeof value === "boolean"
        ? ok(value)
        : issue(path, `must be true or false, not ${what(value)}`),
  );
}

/** One of `values`. */
export function oneOf<const T extends string>(
  values: readonly [T, ...T[]],
  description?: string,
): Schema<T> {
  return schema(
    {
      type: "string",
      enum: [...values],
      ...(description === undefined ? {} : { description }),
    },
    (value, path) => {
      const found = values.find((v) => v === value);
      return found === undefined
        ? issue(
            path,
            `must be one of ${values.join(", ")}, not ${typeof value === "string" ? `"${value}"` : what(value)}`,
          )
        : ok(found);
    },
  );
}

/** The value or `null`. */
export function nullable<T>(base: Schema<T>): Schema<T | null> {
  const { description, ...rest } = base.json;
  return schema(
    {
      anyOf: [rest, { type: "null" }],
      ...(description === undefined ? {} : { description }),
    },
    (value, path) => (value === null ? ok(null) : base.parse(value, path)),
  );
}

/** Either schema's value: the first that parses. */
export function either<A, B>(
  a: Schema<A>,
  b: Schema<B>,
  description?: string,
): Schema<A | B> {
  return schema(
    {
      anyOf: [a.json, b.json],
      ...(description === undefined ? {} : { description }),
    },
    (value, path) =>
      a.parse(value, path).orElse((first) =>
        b.parse(value, path).mapErr((second): Issue[] => [
          {
            path,
            message: [...first, ...second].map((i) => i.message).join(", or "),
          },
        ]),
      ),
  );
}

export function array<T>(item: Schema<T>, description?: string): Schema<T[]> {
  return schema(
    {
      type: "array",
      items: item.json,
      ...(description === undefined ? {} : { description }),
    },
    (value, path) => {
      if (!Array.isArray(value)) {
        return issue(path, `must be a list, not ${what(value)}`);
      }
      const items: T[] = [];
      const issues: Issue[] = [];
      for (const [i, element] of value.entries()) {
        const parsed = item.parse(element, at(path, i));
        if (parsed.isOk()) items.push(parsed.value);
        else issues.push(...parsed.error);
      }
      return issues.length === 0 ? ok(items) : err(issues);
    },
  );
}

type Fields = { readonly [key: string]: AnySchema };

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type ObjectOf<R extends Fields, O extends Fields> = Simplify<
  { -readonly [K in keyof R]: InferAny<R[K]> } & {
    -readonly [K in keyof O]?: InferAny<O[K]>;
  }
>;

const isObject = (value: unknown): value is { [key: string]: unknown } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * An object with the `required` fields and, if given, the `optional` ones.
 * Any other field is an issue, since it is most likely a misspelling.
 */
export function object<
  R extends Fields,
  O extends Fields = Record<never, never>,
>(required: R, optional?: O, description?: string): Schema<ObjectOf<R, O>> {
  const optionalFields: Fields = optional ?? {};
  const properties: { [key: string]: JsonValue } = {};
  for (const [key, field] of Object.entries(required)) {
    properties[key] = field.json;
  }
  for (const [key, field] of Object.entries(optionalFields)) {
    properties[key] = field.json;
  }
  return schema(
    {
      type: "object",
      properties,
      required: Object.keys(required),
      additionalProperties: false,
      ...(description === undefined ? {} : { description }),
    },
    (value, path) => {
      if (!isObject(value)) {
        return issue(path, `must be an object, not ${what(value)}`);
      }
      const out: { [key: string]: unknown } = {};
      const issues: Issue[] = [];
      for (const [key, field] of Object.entries(required)) {
        if (value[key] === undefined) {
          issues.push({ path: at(path, key), message: "is required" });
          continue;
        }
        const parsed = field.parse(value[key], at(path, key));
        if (parsed.isOk()) out[key] = parsed.value;
        else issues.push(...parsed.error);
      }
      for (const [key, field] of Object.entries(optionalFields)) {
        const given = value[key];
        if (given === undefined) continue;
        const parsed = field.parse(given, at(path, key));
        if (parsed.isOk()) out[key] = parsed.value;
        // Null for a field that can't be null reads as leaving it out.
        else if (given !== null) issues.push(...parsed.error);
      }
      for (const key of Object.keys(value)) {
        if (!(key in required) && !(key in optionalFields)) {
          issues.push({
            path: at(path, key),
            message: `is not a field here; the fields are ${Object.keys(properties).join(", ")}`,
          });
        }
      }
      // Each field was checked against its schema above, so `out` has the
      // object's type; TypeScript can't follow that through the loops.
      return issues.length === 0 ? ok(out as ObjectOf<R, O>) : err(issues);
    },
  );
}

/**
 * The schema's value turned into another by `convert`, which may refuse it
 * with a message about the value as a whole.
 */
export function convert<T, U>(
  base: Schema<T>,
  to: (value: T) => Result<U, string | Issue[]>,
): Schema<U> {
  return schema(base.json, (value, path) =>
    base
      .parse(value, path)
      .andThen((parsed) =>
        to(parsed).mapErr((e) =>
          typeof e === "string" ? [{ path, message: e }] : e,
        ),
      ),
  );
}

const REF_HELP = `a ref, kind:id, with kind one of ${Object.values(KIND_NAMES).join(", ")}: drive:find-sender, or candidate:question-id/candidate-id for a candidate`;

/** A ref written as text, `drive:shut`, parsed to a `Ref`. */
export function ref(description?: string): Schema<Ref> {
  return convert(
    string(
      description === undefined ? REF_HELP : `${description}: ${REF_HELP}`,
    ),
    parseRef,
  );
}
