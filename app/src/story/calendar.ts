/**
 * Time finer than a year, for a story whose clock counts years. Positions stay
 * fractional years, as the timeline stores them, so year-based files read the
 * same; this turns dates and spans into those numbers and back.
 *
 * A date is a span in the Gregorian calendar: `1954-10` is that month,
 * `1954-10-12` that day and `1954-10-12 21:00` that minute, each the half-open
 * interval it covers. Two events placed on the same day can then be ordered
 * with `before`. A whole number is that year, `[1954, 1955)`, the same way;
 * a fractional one (`1954.8`) is a moment in years, as it always was. Older
 * files stored a whole year as the moment it starts, and still read so.
 */

import { err, ok, type Result } from "neverthrow";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const DAYS_PER_YEAR = 365.2425;

/** Milliseconds since the epoch at the start of that minute, any year. */
function msAt(year: number, month = 1, day = 1, hour = 0, minute = 0): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  return date.getTime();
}

/** The fractional year of a moment given in milliseconds. */
function yearOf(ms: number): number {
  const year = new Date(ms).getUTCFullYear();
  const start = msAt(year);
  return year + (ms - start) / (msAt(year + 1) - start);
}

/** The moment, in milliseconds, of a fractional year. */
function msOf(at: number): number {
  const year = Math.floor(at);
  const start = msAt(year);
  return start + (at - year) * (msAt(year + 1) - start);
}

export type Span = { start: number; end: number };

const DATE = /^(-?\d{1,6})-(\d{1,2})(?:-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?)?$/;

/**
 * `1954` (that year), `1954.8` (that moment, in years), `1954-10`,
 * `1954-10-12` or `1954-10-12 21:00`.
 */
export function parseWhen(text: string): Result<Span, string> {
  const trimmed = text.trim();
  const n = Number(trimmed);
  if (trimmed !== "" && Number.isFinite(n)) {
    return ok({ start: n, end: Number.isInteger(n) ? n + 1 : n });
  }
  const match = DATE.exec(trimmed);
  if (match === null) {
    return err(
      `"${text}" is not a time: write a year (1954 or 1954.8) or a date (1954-10, 1954-10-12, 1954-10-12 21:00)`,
    );
  }
  const [, y, mo, d, h, mi] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = d === undefined ? undefined : Number(d);
  const hour = h === undefined ? undefined : Number(h);
  const minute = mi === undefined ? undefined : Number(mi);
  const lastDay = new Date(msAt(year, month + 1) - 1).getUTCDate();
  if (month < 1 || month > 12) return err(`month ${month} is not 1 to 12`);
  if (day !== undefined && (day < 1 || day > lastDay)) {
    return err(`day ${day} is not in ${year}-${month}`);
  }
  if (hour !== undefined && (hour > 23 || (minute ?? 0) > 59)) {
    return err(`${h}:${mi} is not a time of day`);
  }
  if (day === undefined) {
    return ok({
      start: yearOf(msAt(year, month)),
      end: yearOf(msAt(year, month + 1)),
    });
  }
  if (hour === undefined) {
    return ok({
      start: yearOf(msAt(year, month, day)),
      end: yearOf(msAt(year, month, day + 1)),
    });
  }
  const at = msAt(year, month, day, hour, minute);
  return ok({ start: yearOf(at), end: yearOf(at + MS_PER_MINUTE) });
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The moment if `at` falls on a whole minute, to within rounding. */
function wholeMinute(at: number): Date | undefined {
  const ms = Math.round(msOf(at) / MS_PER_MINUTE) * MS_PER_MINUTE;
  return Math.abs(yearOf(ms) - at) < 1e-9 ? new Date(ms) : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The span as a date, when it is exactly a month, a day or a minute:
 * `October 1954`, `12 October 1954`, `12 October 1954, 21:00`. Otherwise,
 * including any single moment such as an older file's `1954.8`, undefined,
 * and the caller says it in years.
 */
export function describeSpan({ start, end }: Span): string | undefined {
  if (end <= start) return undefined;
  const from = wholeMinute(start);
  const to = wholeMinute(end);
  if (from === undefined || to === undefined) return undefined;
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + 1;
  const day = from.getUTCDate();
  const time = `${pad(from.getUTCHours())}:${pad(from.getUTCMinutes())}`;
  const monthName = MONTHS[month - 1] ?? "";
  const date = `${day} ${monthName} ${year}`;
  const toMs = to.getTime();
  const midnight = time === "00:00";
  if (midnight && day === 1 && toMs === msAt(year, month + 1)) {
    return `${monthName} ${year}`;
  }
  if (midnight && toMs === msAt(year, month, day + 1)) return date;
  if (toMs === from.getTime() + MS_PER_MINUTE) {
    return `${date}, ${time}`;
  }
  return undefined;
}

/** Whether the span is one whole year, as `parseWhen` gives `1954`. */
export const isYear = ({ start, end }: Span): boolean =>
  Number.isInteger(start) && end === start + 1;

/** A number of years without float noise: `612.8`, not `612.8000000000001`. */
const yearNumber = (years: number) => String(Number(years.toFixed(6)));

const isMidnight = (d: Date) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0;

/** `12 October 1954`, with `, 21:00` when `time`. */
function dateText(d: Date, time: boolean): string {
  const date = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()] ?? ""} ${d.getUTCFullYear()}`;
  return time
    ? `${date}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
    : date;
}

/**
 * Where a span of fractional years falls, said as dates when it can be: one
 * month, day or minute as `describeSpan` says it; a range whose ends fall on
 * whole minutes as dates, its end said inclusively (`1 to 3 November 612`,
 * `October to November 1954`, `12 October 1954, 21:00 to 13 October 1954,
 * 02:00`); otherwise in years (`year 1954`, `year 1200 to 1210`). Whole
 * years stay years, as a year-based file wrote them.
 */
export function describeWhen(span: Span): string {
  const exact = describeSpan(span);
  if (exact !== undefined) return exact;
  const { start, end } = span;
  if (isYear(span)) return `year ${start}`;
  const inYears =
    start === end
      ? `year ${yearNumber(start)}`
      : `year ${yearNumber(start)} to ${yearNumber(end)}`;
  if (end <= start || (Number.isInteger(start) && Number.isInteger(end))) {
    return inYears;
  }
  const from = wholeMinute(start);
  const to = wholeMinute(end);
  if (from === undefined || to === undefined) return inYears;
  const monthStart = (d: Date) => isMidnight(d) && d.getUTCDate() === 1;
  if (monthStart(from) && monthStart(to)) {
    const last = new Date(to.getTime());
    last.setUTCMonth(last.getUTCMonth() - 1);
    const month = (d: Date) => MONTHS[d.getUTCMonth()] ?? "";
    return from.getUTCFullYear() === last.getUTCFullYear()
      ? `${month(from)} to ${month(last)} ${last.getUTCFullYear()}`
      : `${month(from)} ${from.getUTCFullYear()} to ${month(last)} ${last.getUTCFullYear()}`;
  }
  if (isMidnight(from) && isMidnight(to)) {
    const last = new Date(to.getTime() - MS_PER_DAY);
    const until = dateText(last, false);
    if (from.getUTCFullYear() !== last.getUTCFullYear()) {
      return `${dateText(from, false)} to ${until}`;
    }
    return from.getUTCMonth() === last.getUTCMonth()
      ? `${from.getUTCDate()} to ${until}`
      : `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()] ?? ""} to ${until}`;
  }
  // An end at midnight closes the day before; any other is the minute it ends.
  const last = isMidnight(to)
    ? new Date(to.getTime() - MS_PER_DAY)
    : new Date(to.getTime() - MS_PER_MINUTE);
  return `${dateText(from, true)} to ${dateText(last, !isMidnight(to))}`;
}

/** Units a gap can be given in, as years. */
const UNITS: readonly {
  names: readonly string[];
  years: number;
  word: string;
}[] = [
  { names: ["y", "year", "years"], years: 1, word: "year" },
  { names: ["mo", "month", "months"], years: 1 / 12, word: "month" },
  { names: ["w", "week", "weeks"], years: 7 / DAYS_PER_YEAR, word: "week" },
  { names: ["d", "day", "days"], years: 1 / DAYS_PER_YEAR, word: "day" },
  {
    names: ["h", "hour", "hours"],
    years: 1 / DAYS_PER_YEAR / 24,
    word: "hour",
  },
  {
    names: ["min", "minute", "minutes"],
    years: 1 / DAYS_PER_YEAR / 24 / 60,
    word: "minute",
  },
];

/**
 * A span of time in years: `3` (years, as before), `3d`, `2 weeks`, `6h`.
 * `unit` is the size of the unit it was given in, in years.
 */
export function parseSpan(
  text: string,
): Result<{ years: number; unit: number }, string> {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(text);
  const unit = UNITS.find(({ names }) =>
    names.includes((match?.[2] ?? "").toLowerCase()),
  );
  if (match === null || (match[2] !== "" && unit === undefined)) {
    return err(
      `"${text}" is not a span: write a number of years, or one with a unit (3d, 2w, 6h, 4mo, 1y)`,
    );
  }
  const size = unit?.years ?? 1;
  return ok({ years: Number(match[1]) * size, unit: size });
}

const unitText = (count: number, word: string) =>
  `${count} ${word}${Math.abs(count) === 1 ? "" : "s"}`;

/** A span in the largest unit that says it in a whole number, if any. */
function wholeText(years: number): string | undefined {
  for (const { years: size, word } of UNITS) {
    const count = years / size;
    const whole = Math.round(count);
    if (whole !== 0 && Math.abs(count - whole) < 1e-6) {
      return unitText(whole, word);
    }
  }
  return undefined;
}

/** The largest unit `years` reaches, or minutes. */
const reached = (years: number) =>
  UNITS.find(({ years: size }) => Math.abs(years) >= size) ??
  UNITS[UNITS.length - 1];

/** `years` in `unit`, to one decimal. */
const inUnit = (years: number, unit: { years: number; word: string }) =>
  unitText(Number((years / unit.years).toFixed(1)), unit.word);

/** A span in years in the largest unit that says it in a whole number: `3 days`. */
export function describeYears(years: number): string {
  const whole = wholeText(years);
  if (whole !== undefined) return whole;
  // Not whole in any unit: the largest unit it reaches, to one decimal.
  const unit = reached(years);
  return unit === undefined ? `${years} years` : inUnit(years, unit);
}

/** The largest unit `years` is a whole number of, if any. */
const wholeUnit = (years: number) =>
  UNITS.findIndex(({ years: size }) => {
    const count = years / size;
    const whole = Math.round(count);
    return whole !== 0 && Math.abs(count - whole) < 1e-6;
  });

/**
 * A stated duration (`amount` give or take `tolerance`) and the range of
 * time positions put between the same events (`min` to `max`), all in
 * years, in words that keep a mismatch between them visible. The amount is
 * said in its own unit, whole where it is (`2 weeks`), and in the range's
 * unit beside it where rounding made that smaller; the tolerance in the
 * largest unit it reaches. The range is said to one decimal in a unit no
 * larger than the amount's in which rounding can't close the gap between
 * the two ranges, and no larger than it reaches. So 379 days is never said
 * `1 year` beside `1 year give or take 1 day`. `between` is one value when
 * its ends read the same.
 */
export function describeMismatch(
  amount: number,
  tolerance: number,
  min: number,
  max: number,
): { amount: string; tolerance: string; between: string } {
  const range = (a: string, b: string) => (a === b ? a : `${a} to ${b}`);
  const gap = Math.max(min - (amount + tolerance), amount - tolerance - max);
  const index = (years: number) => {
    const found = UNITS.findIndex(({ years: size }) => Math.abs(years) >= size);
    return found === -1 ? UNITS.length - 1 : found;
  };
  const whole = wholeUnit(Math.abs(amount));
  const own = whole === -1 ? index(amount) : whole;
  const visible = UNITS.findIndex(
    ({ years }, i) => i >= own && (gap <= 0 || 0.05 * years <= gap / 2),
  );
  const largest = Math.max(
    abs(min, max) === 0 ? 0 : index(abs(min, max)),
    visible === -1 ? UNITS.length - 1 : visible,
  );
  const unit = UNITS[largest];
  const amountUnit = UNITS[whole === -1 ? largest : whole];
  const toleranceUnit = UNITS[index(tolerance)];
  if (
    unit === undefined ||
    amountUnit === undefined ||
    toleranceUnit === undefined
  ) {
    return {
      amount: `${amount} years`,
      tolerance: `${tolerance} years`,
      between: range(`${min} years`, `${max} years`),
    };
  }
  // Where rounding pushed the range into a smaller unit, the amount is
  // said in it too, so the two can be compared: `1 year (12 months)`.
  const both =
    visible > own && amountUnit !== unit
      ? `${inUnit(amount, amountUnit)} (${inUnit(amount, unit)})`
      : inUnit(amount, amountUnit);
  return {
    amount: both,
    tolerance: inUnit(tolerance, tolerance === 0 ? amountUnit : toleranceUnit),
    between: range(inUnit(min, unit), inUnit(max, unit)),
  };
}

/** The larger of two magnitudes. */
const abs = (a: number, b: number) => Math.max(Math.abs(a), Math.abs(b));

/**
 * The time from somewhere in `from` to somewhere in `to`, in years, when
 * either is a whole year (`isYear`): a year end counts as all of it, any
 * other end as its start. Undefined when neither is a year, so the caller
 * measures start to start.
 */
export function yearRange(
  from: Span,
  to: Span,
): { min: number; max: number } | undefined {
  if (!isYear(from) && !isYear(to)) return undefined;
  const last = (span: Span) => (isYear(span) ? span.end : span.start);
  return { min: to.start - last(from), max: last(to) - from.start };
}

/**
 * `11.7 to 12.7 years`, a `yearRange` in the unit its larger end reaches,
 * its sign dropped; undefined when it runs both ways (the two can fall
 * either way round within the year).
 */
export function describeYearRange({
  min,
  max,
}: {
  min: number;
  max: number;
}): string | undefined {
  if (min < 0 && max > 0) return undefined;
  const [lo, hi] = min < 0 ? [-max, -min] : [min, max];
  const unit = reached(hi) ?? UNITS[UNITS.length - 1];
  if (unit === undefined) return `${lo} to ${hi} years`;
  const n = (years: number) => Number((years / unit.years).toFixed(1));
  return `${n(lo)} to ${inUnit(hi, unit)}`;
}

/**
 * The moment `at` as a date (`8 June 1131`, with `, 21:00` off midnight),
 * else in years (`year 1954.8`).
 */
export function describeMoment(at: number): string {
  const d = wholeMinute(at);
  return d === undefined
    ? `year ${yearNumber(at)}`
    : dateText(d, !isMidnight(d));
}

/** Days from fractional year `from` to `to`, on the calendar: negative if `to` is earlier. */
export function daysBetween(from: number, to: number): number {
  return (msOf(to) - msOf(from)) / MS_PER_DAY;
}

/**
 * The time from `from` to `to`, as a writer would count it: in calendar days
 * once it is a day or more (`27 days`), with years or months beside them
 * past eight weeks (`400 days, 1.1 years`), and in hours or minutes under a
 * day. Its sign is dropped; say which way it runs around it.
 */
export function describeBetween(from: number, to: number): string {
  const days = Math.abs(daysBetween(from, to));
  if (days < 1) return describeYears(days / DAYS_PER_YEAR);
  // Counted by the calendar, as a writer counts: 23:00 to 01:00 the day
  // after is one day on.
  const midnight = (at: number) => Math.floor(msOf(at) / MS_PER_DAY);
  const count = Math.abs(midnight(to) - midnight(from));
  const inDays = `${count} day${count === 1 ? "" : "s"}`;
  return days < 56
    ? inDays
    : `${inDays}, ${describeYears(Math.abs(to - from))}`;
}
