import { describe, expect, test } from "bun:test";
import {
  describeSpan,
  describeWhen,
  describeYears,
  parseSpan,
  parseWhen,
} from "./calendar";

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

test("describeWhen says a range of dates as dates, its end inclusive", () => {
  const range = (from: string, to: string) =>
    describeWhen({
      start: parseWhen(from)._unsafeUnwrap().start,
      end: parseWhen(to)._unsafeUnwrap().end,
    });
  expect(range("612-11-01", "612-11-03")).toBe("1 to 3 November 612");
  expect(range("612-11-20", "612-12-03")).toBe("20 November to 3 December 612");
  expect(range("618-08-31", "619-05-31")).toBe("31 August 618 to 31 May 619");
  expect(range("1954-10", "1954-11")).toBe("October to November 1954");
  expect(range("1954-11", "1955-02")).toBe("November 1954 to February 1955");
  expect(range("1954-10-12 21:00", "1954-10-13 02:00")).toBe(
    "12 October 1954, 21:00 to 13 October 1954, 02:00",
  );
  expect(range("1954-10-12 21:00", "1954-10-13")).toBe(
    "12 October 1954, 21:00 to 13 October 1954",
  );
  expect(describeWhen(parseWhen("1954-10-12")._unsafeUnwrap())).toBe(
    "12 October 1954",
  );
});

test("describeWhen leaves moments and whole years in years", () => {
  expect(describeWhen({ start: 1954, end: 1954 })).toBe("year 1954");
  expect(describeWhen({ start: 1954.8, end: 1954.8 })).toBe("year 1954.8");
  expect(describeWhen({ start: 1200, end: 1210 })).toBe("year 1200 to 1210");
  expect(describeWhen({ start: 0.1 + 0.2, end: 0.1 + 0.2 })).toBe("year 0.3");
});

test("describeYears says a span whole in no unit in the largest it reaches", () => {
  expect(describeYears(1.5)).toBe("18 months");
  expect(describeYears(0.0023991628613657667)).toBe("21 hours");
  expect(describeYears(2.5 / 365.2425)).toBe("60 hours");
  expect(describeYears(1.25 / 365.2425 / 24)).toBe("75 minutes");
  expect(describeYears(1.03 / 365.2425 / 24 / 60)).toBe("1 minute");
  expect(describeYears(0.3333)).toBe("4 months");
});
