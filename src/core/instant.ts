import { nowMs } from '../clock.js';
import { TempoError, type ParseResult, unwrapParse } from '../errors.js';
import type { DurationLike, RoundingMode, TimeUnit } from '../types.js';
import type { ZonedDateTime } from '../tz/zoned-datetime.js';
import { Duration } from './duration.js';
import {
  applyRoundingMode,
  isEpochMillisInRange,
  MILLIS_PER_HOUR,
  MILLIS_PER_MINUTE,
  MILLIS_PER_SECOND,
  MIN_EPOCH_MILLIS,
  MAX_EPOCH_MILLIS,
  roundingUnitDivisor,
  validateRoundingMode,
  validateTimeUnit,
} from './range.js';

export class Instant {
  readonly epochMillis: number;

  private constructor(epochMillis: number) {
    this.epochMillis = epochMillis;
  }

  static ofEpochMillis(epochMillis: number): Instant {
    if (!Number.isFinite(epochMillis) || !Number.isInteger(epochMillis)) {
      throw new TempoError('OUT_OF_RANGE', 'epochMillis must be an integer', { input: epochMillis });
    }
    if (!isEpochMillisInRange(epochMillis)) {
      throw new TempoError('OUT_OF_RANGE', `epochMillis ${epochMillis} is outside the supported range`, {
        input: epochMillis,
      });
    }
    return new Instant(epochMillis);
  }

  static ofEpochSeconds(epochSeconds: number): Instant {
    if (!Number.isFinite(epochSeconds)) {
      throw new TempoError('OUT_OF_RANGE', 'epochSeconds must be finite', { input: epochSeconds });
    }
    const ms = Math.trunc(epochSeconds * MILLIS_PER_SECOND);
    return Instant.ofEpochMillis(ms);
  }

  static now(): Instant {
    return Instant.ofEpochMillis(nowMs());
  }

  static fromJSDate(date: Date): Instant {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new TempoError('INVALID_DATE', 'Expected a valid Date', { input: date });
    }
    return Instant.ofEpochMillis(date.getTime());
  }

  static parse(input: string): Instant {
    return unwrapParse(Instant.tryParse(input));
  }

  static tryParse(input: string): ParseResult<Instant> {
    return parseInstant(input);
  }

  static compare(a: Instant, b: Instant): number {
    return a.epochMillis - b.epochMillis;
  }

  static min(a: Instant, b: Instant, ...rest: Instant[]): Instant {
    return [a, b, ...rest].reduce((m, x) => (x.isBefore(m) ? x : m));
  }

  static max(a: Instant, b: Instant, ...rest: Instant[]): Instant {
    return [a, b, ...rest].reduce((m, x) => (x.isAfter(m) ? x : m));
  }

  plus(amount: Duration | DurationLike): Instant {
    const d = Duration.from(amount);
    if (d.years !== 0 || d.months !== 0) {
      throw new TempoError('INCOMPATIBLE_UNIT', 'Cannot add years or months to an Instant', {
        input: d.toISO(),
      });
    }
    const delta =
      d.weeks * 7 * 86_400_000 +
      d.days * 86_400_000 +
      d.hours * MILLIS_PER_HOUR +
      d.minutes * MILLIS_PER_MINUTE +
      d.seconds * MILLIS_PER_SECOND +
      d.milliseconds;
    return Instant.ofEpochMillis(this.epochMillis + delta);
  }

  minus(amount: Duration | DurationLike): Instant {
    return this.plus(Duration.from(amount).negated());
  }

  until(other: Instant, unit: TimeUnit | 'day' | 'week' = 'millisecond'): number {
    const ms = other.epochMillis - this.epochMillis;
    switch (unit) {
      case 'millisecond':
        return ms;
      case 'second':
        return Math.trunc(ms / MILLIS_PER_SECOND);
      case 'minute':
        return Math.trunc(ms / MILLIS_PER_MINUTE);
      case 'hour':
        return Math.trunc(ms / MILLIS_PER_HOUR);
      case 'day':
        return Math.trunc(ms / 86_400_000);
      case 'week':
        return Math.trunc(ms / (7 * 86_400_000));
    }
  }

  round(options: { readonly smallestUnit: TimeUnit; readonly roundingMode?: RoundingMode }): Instant {
    validateTimeUnit(options.smallestUnit);
    const mode = validateRoundingMode(options.roundingMode);
    const divisor = roundingUnitDivisor(options.smallestUnit);
    const remainder = this.epochMillis % divisor;
    let rounded = this.epochMillis - remainder;
    if (remainder !== 0) {
      rounded += applyRoundingMode(divisor, remainder, mode);
    }
    if (rounded < MIN_EPOCH_MILLIS || rounded > MAX_EPOCH_MILLIS) {
      throw new TempoError('OUT_OF_RANGE', `Rounded instant ${rounded} is outside the supported range`, {
        input: rounded,
      });
    }
    return new Instant(rounded);
  }

  compare(other: Instant): number {
    return Instant.compare(this, other);
  }

  isBefore(other: Instant): boolean {
    return this.epochMillis < other.epochMillis;
  }

  isAfter(other: Instant): boolean {
    return this.epochMillis > other.epochMillis;
  }

  isSame(other: Instant): boolean {
    return this.epochMillis === other.epochMillis;
  }

  isSameOrBefore(other: Instant): boolean {
    return this.epochMillis <= other.epochMillis;
  }

  isSameOrAfter(other: Instant): boolean {
    return this.epochMillis >= other.epochMillis;
  }

  equals(other: Instant): boolean {
    return this.epochMillis === other.epochMillis;
  }

  toEpochMilliseconds(): number {
    return this.epochMillis;
  }

  toEpochSeconds(): number {
    return Math.trunc(this.epochMillis / MILLIS_PER_SECOND);
  }

  toJSDate(): Date {
    return new Date(this.epochMillis);
  }

  toISO(): string {
    return new Date(this.epochMillis).toISOString();
  }

  toJSON(): string {
    return this.toISO();
  }

  toString(): string {
    return this.toISO();
  }

  toZonedDateTime(timeZone: string): ZonedDateTime {
    return zonedFromInstant(this, timeZone);
  }
}

type ZonedFactory = (instant: Instant, timeZone: string) => ZonedDateTime;

let zonedFactory: ZonedFactory | undefined;

export function registerZonedFactory(factory: ZonedFactory): void {
  zonedFactory = factory;
}

function zonedFromInstant(instant: Instant, timeZone: string): ZonedDateTime {
  if (!zonedFactory) {
    throw new TempoError('UNKNOWN_TIMEZONE', 'ZonedDateTime module is not loaded');
  }
  return zonedFactory(instant, timeZone);
}

function parseInstant(input: string): ParseResult<Instant> {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'INVALID_PARSE', message: 'Expected a string', input: String(input) };
  }
  const parsed = parseInstantFields(input);
  if (!parsed.ok) return parsed;
  try {
    return { ok: true, value: Instant.ofEpochMillis(parsed.value.epochMillis) };
  } catch (err) {
    const message = err instanceof TempoError ? err.message : 'Instant out of range';
    return { ok: false, reason: 'OUT_OF_RANGE', message, input };
  }
}

export function parseInstantFields(
  input: string,
): ParseResult<{ epochMillis: number; offsetMs: number; zone?: string }> {
  const match =
    /^([+-]?\d{4,})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}(?::?\d{2})?(?::?\d{2})?)(?:\[([A-Za-z0-9_+\-./]+)\])?$/u.exec(
      input,
    );
  if (!match) {
    return {
      ok: false,
      reason: 'INVALID_PARSE',
      message: 'Expected ISO instant with offset, e.g. 2026-06-01T12:00:00Z',
      input,
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const frac = match[7] ?? '';
  const millisecond = frac === '' ? 0 : Number(frac.padEnd(3, '0').slice(0, 3));
  const offsetToken = match[8]!;
  const zone = match[9];

  const offsetMs = parseOffsetToken(offsetToken);
  if (offsetMs === null) {
    return { ok: false, reason: 'INVALID_OFFSET', message: `Invalid offset ${offsetToken}`, input };
  }

  const utc = utcMillis(year, month, day, hour, minute, second, millisecond);
  if (utc === null) {
    return { ok: false, reason: 'INVALID_DATE', message: 'Invalid date-time fields', input };
  }
  const epochMillis = utc - offsetMs;
  if (epochMillis < MIN_EPOCH_MILLIS || epochMillis > MAX_EPOCH_MILLIS) {
    return { ok: false, reason: 'OUT_OF_RANGE', message: 'Instant is out of range', input };
  }
  return { ok: true, value: { epochMillis, offsetMs, zone } };
}

export function parseOffsetToken(token: string): number | null {
  if (token === 'Z' || token === 'z') return 0;
  const m = /^([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?$/u.exec(token);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = Number(m[2]);
  const minutes = m[3] === undefined ? 0 : Number(m[3]);
  const seconds = m[4] === undefined ? 0 : Number(m[4]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return sign * (hours * MILLIS_PER_HOUR + minutes * MILLIS_PER_MINUTE + seconds * MILLIS_PER_SECOND);
}

export function utcMillis(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): number | null {
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || millisecond > 999) {
    return null;
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }
  return date.getTime();
}
