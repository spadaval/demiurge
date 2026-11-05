import { describe, expect, test } from "bun:test";
import { describeSpan, describeYears, parseSpan, parseWhen } from "./calendar";

describe("parseWhen", () => {
  test("a number is a moment in years, as before", () => {
    expect(parseWhen("1954")._unsafeUnwrap()).toEqual({
      start: 1954,
      end: 1954,
    });
    expect(parseWhen("1954.8")._unsafeUnwrap()).toEqual({
      start: 1954.8,
      end: 1954.8,
    });
  });

  test("a date is the month, day or minute it names", () => {
    for (const [text, said] of [
      ["1954-10", "October 1954"],
      ["1954-10-12", "12 October 1954"],
      ["1954-10-12 21:00", "12 October 1954, 21:00"],
      ["1954-10-12T21:05", "12 October 1954, 21:05"],
      ["2000-12-31", "31 December 2000"],
      ["-300-03-01", "1 March -300"],
    ] as const) {
      const span = parseWhen(text)._unsafeUnwrap();
      expect(span.end).toBeGreaterThan(span.start);
      expect(describeSpan(span)).toBe(said);
    }
    const day = parseWhen("1954-10-12")._unsafeUnwrap();
    const evening = parseWhen("1954-10-12 21:00")._unsafeUnwrap();
    expect(evening.start).toBeGreaterThan(day.start);
    expect(evening.end).toBeLessThan(day.end);
  });

  test("refuses what isn't a time", () => {
    for (const text of ["soon", "1954-13", "1954-02-30", "1954-10-12 25:00"]) {
      expect(parseWhen(text).isErr()).toBe(true);
    }
  });
});

test("describeSpan leaves moments and whole years to be said in years", () => {
  expect(describeSpan({ start: 1954, end: 1954 })).toBeUndefined();
  expect(describeSpan({ start: 1954, end: 1955 })).toBeUndefined();
  expect(describeSpan({ start: 1954.8, end: 1954.8 })).toBeUndefined();
  expect(describeSpan({ start: 1954.805, end: 1954.81 })).toBeUndefined();
});

test("parseSpan and describeYears take and give units", () => {
  expect(parseSpan("3")._unsafeUnwrap()).toEqual({ years: 3, unit: 1 });
  const days = parseSpan("3d")._unsafeUnwrap();
  expect(describeYears(days.years)).toBe("3 days");
  expect(describeYears(parseSpan("2 weeks")._unsafeUnwrap().years)).toBe(
    "2 weeks",
  );
  expect(describeYears(parseSpan("6h")._unsafeUnwrap().years)).toBe("6 hours");
  expect(describeYears(10)).toBe("10 years");
  expect(describeYears(1)).toBe("1 year");
  expect(parseSpan("3 fortnights").isErr()).toBe(true);
});
