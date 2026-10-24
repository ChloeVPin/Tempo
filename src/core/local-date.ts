import { nowMs } from '../clock.js';
import { TempoError, type ParseResult, unwrapParse } from '../errors.js';
import type {
  ArithmeticOptions,
  DateUnit,
  DurationLike,
  LocalDateLike,
  Overflow,
  WithDateFields,
} from '../types.js';
import {
  civilFromDays,
  dateFromIsoWeek,
  dayOfYear,
  daysFromCivil,
  daysInMonth,
  daysInYear,
  isoDayOfWeek,
  isoWeekFields,
  pad2,
  pad4,
  quarterOf,
  requireValidDate,
} from './civil.js';
import { Duration } from './duration.js';
import { type LocalDatePatternParser } from './parser-registry.js';
import { resolveDate } from './overflow.js';

export class LocalDate {
  static customPatternParser: LocalDatePatternParser | null = null;

  static registerLocalDateParser(parser: LocalDatePatternParser | null): void {
    LocalDate.customPatternParser = parser;
  }

  static clearCustomDateParser(): void {
    LocalDate.customPatternParser = null;
  }
  readonly year: number;
  readonly month: number;
  readonly day: number;

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static of(year: number, month: number, day: number, overflow: Overflow = 'reject'): LocalDate {
    const d = resolveDate(year, month, day, overflow);
    return new LocalDate(d.year, d.month, d.day);
  }

  static from(fields: LocalDateLike, overflow: Overflow = 'reject'): LocalDate {
    return LocalDate.of(fields.year, fields.month, fields.day, overflow);
  }

  static fromEpochDay(epochDay: number): LocalDate {
    if (!Number.isInteger(epochDay)) {
      throw new TempoError('INVALID_DATE', 'epochDay must be an integer', { input: epochDay });
    }
    const d = civilFromDays(epochDay);
    requireValidDate(d.year, d.month, d.day);
    return new LocalDate(d.year, d.month, d.day);
  }

  static ofIsoWeek(weekYear: number, week: number, weekday = 1): LocalDate {
    const d = dateFromIsoWeek(weekYear, week, weekday);
    return new LocalDate(d.year, d.month, d.day);
  }

  static parse(input: string, pattern?: string): LocalDate {
    return unwrapParse(LocalDate.tryParse(input, pattern));
  }

  static tryParse(input: string, pattern?: string): ParseResult<LocalDate> {
    if (pattern === undefined) return parseLocalDate(input);
    if (LocalDate.customPatternParser !== null) {
      const parsed = LocalDate.customPatternParser(input, pattern);
      if (parsed.ok) {
        try {
          return {
            ok: true,
            value: LocalDate.of(parsed.value.year, parsed.value.month, parsed.value.day, 'reject'),
          };
        } catch (err) {
          const message = err instanceof TempoError ? err.message : 'Invalid date';
          const reason = err instanceof TempoError ? err.code : 'INVALID_DATE';
          return { ok: false, reason, message, input };
        }
      }
      return parsed;
    }
    return {
      ok: false,
      reason: 'INVALID_PARSE',
      message: 'Expected ISO date YYYY-MM-DD or registered custom pattern',
      input,
    };
  }

  static today(timeZone?: string): LocalDate {
    if (timeZone === undefined) {
      const ms = nowMs();
      const date = new Date(ms);
      return LocalDate.of(date.getFullYear(), date.getMonth() + 1, date.getDate(), 'reject');
    }
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(nowMs()));
    const map = partsToMap(parts);
    return LocalDate.of(Number(map.year), Number(map.month), Number(map.day), 'reject');
  }

  static compare(a: LocalDate, b: LocalDate): number {
    return a.toEpochDay() - b.toEpochDay();
  }

  static min(a: LocalDate, b: LocalDate, ...rest: LocalDate[]): LocalDate {
    return [a, b, ...rest].reduce((m, x) => (x.isBefore(m) ? x : m));
  }

  static max(a: LocalDate, b: LocalDate, ...rest: LocalDate[]): LocalDate {
    return [a, b, ...rest].reduce((m, x) => (x.isAfter(m) ? x : m));
  }

  toEpochDay(): number {
    return daysFromCivil(this.year, this.month, this.day);
  }

  dayOfWeek(): number {
    return isoDayOfWeek(this.toEpochDay());
  }

  dayOfYear(): number {
    return dayOfYear(this.year, this.month, this.day);
  }

  daysInMonth(): number {
    return daysInMonth(this.year, this.month);
  }

  daysInYear(): number {
    return daysInYear(this.year);
  }

  isLeapYear(): boolean {
    return this.daysInYear() === 366;
  }

  quarter(): number {
    return quarterOf(this.month);
  }

  isoWeek(): number {
    return isoWeekFields(this.year, this.month, this.day).week;
  }

  isoWeekYear(): number {
    return isoWeekFields(this.year, this.month, this.day).weekYear;
  }

  with(fields: WithDateFields, overflow: Overflow = 'constrain'): LocalDate {
    return LocalDate.of(
      fields.year ?? this.year,
      fields.month ?? this.month,
      fields.day ?? this.day,
      overflow,
    );
  }

  plus(amount: Duration | DurationLike, options: ArithmeticOptions = {}): LocalDate {
    const d = Duration.from(amount);
    if (d.hasTimeUnits()) {
      throw new TempoError('INCOMPATIBLE_UNIT', 'Cannot add time units to a LocalDate', {
        input: d.toISO(),
      });
    }
    return addToDate(this, d, options.overflow ?? 'constrain');
  }

  minus(amount: Duration | DurationLike, options: ArithmeticOptions = {}): LocalDate {
    return this.plus(Duration.from(amount).negated(), options);
  }

  startOf(unit: DateUnit): LocalDate {
    switch (unit) {
      case 'year':
        return LocalDate.of(this.year, 1, 1);
      case 'month':
        return LocalDate.of(this.year, this.month, 1);
      case 'week':
        return this.minus({ days: this.dayOfWeek() - 1 });
      case 'day':
        return this;
    }
  }

  endOf(unit: DateUnit): LocalDate {
    switch (unit) {
      case 'year':
        return LocalDate.of(this.year, 12, 31);
      case 'month':
        return LocalDate.of(this.year, this.month, this.daysInMonth());
      case 'week':
        return this.startOf('week').plus({ days: 6 });
      case 'day':
        return this;
    }
  }

  until(other: LocalDate, unit?: DateUnit): number {
    const days = other.toEpochDay() - this.toEpochDay();
    if (unit === undefined || unit === 'day') return days;
    if (unit === 'week') return Math.trunc(days / 7);
    if (unit === 'month') return monthsBetween(this, other);
    if (unit === 'year') return Math.trunc(monthsBetween(this, other) / 12);
    throw new TempoError('INCOMPATIBLE_UNIT', `Unsupported LocalDate unit ${String(unit)}`);
  }

  compare(other: LocalDate): number {
    return LocalDate.compare(this, other);
  }

  isBefore(other: LocalDate): boolean {
    return this.compare(other) < 0;
  }

  isAfter(other: LocalDate): boolean {
    return this.compare(other) > 0;
  }

  isSame(other: LocalDate): boolean {
    return this.compare(other) === 0;
  }

  isSameOrBefore(other: LocalDate): boolean {
    return this.compare(other) <= 0;
  }

  isSameOrAfter(other: LocalDate): boolean {
    return this.compare(other) >= 0;
  }

  isBetween(start: LocalDate, end: LocalDate, inclusivity: '()' | '[]' | '[)' | '(]' = '[)'): boolean {
    const afterStart = inclusivity[0] === '[' ? this.compare(start) >= 0 : this.compare(start) > 0;
    const beforeEnd = inclusivity[1] === ']' ? this.compare(end) <= 0 : this.compare(end) < 0;
    return afterStart && beforeEnd;
  }

  equals(other: LocalDate | LocalDateLike): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day;
  }

  toISO(): string {
    return `${pad4(this.year)}-${pad2(this.month)}-${pad2(this.day)}`;
  }

  toJSON(): string {
    return this.toISO();
  }

  toString(): string {
    return this.toISO();
  }
}

export function addToDate(date: LocalDate, duration: Duration, overflow: Overflow): LocalDate {
  let year = date.year + duration.years;
  let month = date.month + duration.months;
  year += Math.floor((month - 1) / 12);
  month = ((month - 1) % 12 + 12) % 12 + 1;
  const resolved = resolveDate(year, month, date.day, overflow);
  const days = duration.weeks * 7 + duration.days;
  if (days === 0) return LocalDate.of(resolved.year, resolved.month, resolved.day);
  return LocalDate.fromEpochDay(daysFromCivil(resolved.year, resolved.month, resolved.day) + days);
}

function monthsBetween(from: LocalDate, to: LocalDate): number {
  const sign = from.isAfter(to) ? -1 : 1;
  const a = sign === 1 ? from : to;
  const b = sign === 1 ? to : from;
  let months = (b.year - a.year) * 12 + (b.month - a.month);
  if (b.day < a.day) months -= 1;
  return months * sign;
}

function partsToMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return map;
}

function parseLocalDate(input: string): ParseResult<LocalDate> {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'INVALID_PARSE', message: 'Expected a string', input: String(input) };
  }
  const isoWeek = /^([+-]?\d{4,})-W(\d{2})-(\d)$/u.exec(input);
  if (isoWeek) {
    try {
      return {
        ok: true,
        value: LocalDate.ofIsoWeek(Number(isoWeek[1]), Number(isoWeek[2]), Number(isoWeek[3])),
      };
    } catch (err) {
      const message = err instanceof TempoError ? err.message : 'Invalid ISO week date';
      return { ok: false, reason: 'INVALID_DATE', message, input };
    }
  }
  const match = /^([+-]?\d{4,})-(\d{2})-(\d{2})$/u.exec(input);
  if (!match) {
    return {
      ok: false,
      reason: 'INVALID_PARSE',
      message: 'Expected ISO date YYYY-MM-DD',
      input,
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  try {
    return { ok: true, value: LocalDate.of(year, month, day, 'reject') };
  } catch (err) {
    const message = err instanceof TempoError ? err.message : 'Invalid date';
    const reason = err instanceof TempoError ? err.code : 'INVALID_DATE';
    return { ok: false, reason, message, input };
  }
}
