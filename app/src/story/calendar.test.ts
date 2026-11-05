import { describe, expect, test } from "bun:test";
import {
  describeMismatch,
  describeMoment,
  describeSpan,
  describeWhen,
  describeYearRange,
  describeYears,
  isYear,
  parseSpan,
  parseWhen,
  yearRange,
} from "./calendar";

describe("parseWhen", () => {
  test("a whole number is that year, a fractional one a moment in years", () => {
    expect(parseWhen("1954")._unsafeUnwrap()).toEqual({
      start: 1954,
      end: 1955,
    });
    expect(isYear(parseWhen("-300")._unsafeUnwrap())).toBe(true);
    expect(describeWhen(parseWhen("1954")._unsafeUnwrap())).toBe("year 1954");
    expect(parseWhen("1954.8")._unsafeUnwrap()).toEqual({
      start: 1954.8,
      end: 1954.8,
    });
    // An older file's whole year, stored as a moment, reads as one, and
    // a range of whole years by the last year it includes.
    expect(describeWhen({ start: 1954, end: 1954 })).toBe("the start of 1954");
    expect(describeWhen({ start: 1301, end: 1309 })).toBe("year 1301 to 1308");
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
  expect(describeWhen({ start: 1954, end: 1954 })).toBe("the start of 1954");
  expect(describeWhen({ start: 1954.8, end: 1954.8 })).toBe("year 1954.8");
  expect(describeWhen({ start: 1200, end: 1211 })).toBe("year 1200 to 1210");
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

test("describeMismatch keeps a mismatch visible after rounding", () => {
  const day = 1 / 365.2425;
  // The amount in its own unit, the tolerance in its own.
  expect(describeMismatch(3 * day, 0.5 * day, 5 * day, 5 * day)).toEqual({
    amount: "3 days",
    tolerance: "12 hours",
    between: "5 days",
  });
  expect(describeMismatch(1, 0.5, 3, 3)).toEqual({
    amount: "1 year",
    tolerance: "6 months",
    between: "3 years",
  });
  // A range shorter than the amount's unit is said in a unit it reaches.
  expect(describeMismatch(14 * day, 3.5 * day, -0.1 * day, 0.9 * day)).toEqual({
    amount: "2 weeks",
    tolerance: "3.5 days",
    between: "-2.4 hours to 21.6 hours",
  });
  expect(describeMismatch(day, 0.5 * day, 0, 0).between).toBe("0 days");
  // Off by thirteen days on a year: rounding to years would hide it, so
  // months, with the amount in months beside it.
  expect(describeMismatch(1, day, 378.3 * day, 380.3 * day)).toEqual({
    amount: "1 year (12 months)",
    tolerance: "1 day",
    between: "12.4 months to 12.5 months",
  });
  // Ends that read the same are one value.
  expect(describeMismatch(10, 0.5, 1.0001, 1.0002).between).toBe("1 year");
  // A tolerance of none: in the amount's unit.
  expect(describeMismatch(1, 0, 1 + 3 * day, 1 + 3 * day)).toEqual({
    amount: "1 year (52.2 weeks)",
    tolerance: "0 years",
    between: "52.6 weeks",
  });
});

test("yearRange gives the time between events placed by year as a range", () => {
  const year = (n: number) => parseWhen(String(n))._unsafeUnwrap();
  const day = parseWhen("1106-04-10")._unsafeUnwrap();
  // Neither a year: start to start, as before.
  expect(yearRange(day, day)).toBeUndefined();
  const on = yearRange(day, year(1118));
  expect(on === undefined ? undefined : describeYearRange(on)).toBe(
    "11.7 to 12.7 years",
  );
  const back = yearRange(year(1118), day);
  expect(back !== undefined && back.max <= 0).toBe(true);
  expect(back === undefined ? undefined : describeYearRange(back)).toBe(
    "11.7 to 12.7 years",
  );
  // Two events in one year can fall either way round.
  const same = yearRange(year(1103), year(1103));
  expect(same).toEqual({ min: -1, max: 1 });
  expect(same === undefined ? "" : describeYearRange(same)).toBeUndefined();
});

test("describeMoment says a moment as a date when it can", () => {
  expect(describeMoment(parseWhen("1131-06-08")._unsafeUnwrap().start)).toBe(
    "8 June 1131",
  );
  expect(
    describeMoment(parseWhen("1131-06-08 21:00")._unsafeUnwrap().start),
  ).toBe("8 June 1131, 21:00");
  expect(describeMoment(1954.800001)).toBe("year 1954.800001");
});
