import { Instant } from '../core/instant.js';
import { LocalDate } from '../core/local-date.js';
import { LocalDateTime } from '../core/local-datetime.js';
import { Duration } from '../core/duration.js';
import { ZonedDateTime } from '../tz/zoned-datetime.js';
import { format } from '../format/format.js';
import { fromNow } from '../relative/relative-time.js';
import { TempoError } from '../errors.js';
import { mapMomentPattern } from './format-map.js';
import type { DateTimeUnit, DurationLike } from '../types.js';

export type MomentInput = string | number | Date | Instant | ZonedDateTime | MomentCompat | LocalDate;

export class MomentCompat {
  private constructor(readonly zoned: ZonedDateTime) {}

  static from(input?: MomentInput, zone?: string): MomentCompat {
    const timeZone = zone ?? 'UTC';
    if (input === undefined) return new MomentCompat(ZonedDateTime.now(timeZone));
    if (input instanceof MomentCompat) return zone ? input.tz(zone) : input;
    if (input instanceof ZonedDateTime) {
      return new MomentCompat(zone ? input.withTimeZone(zone) : input);
    }
    if (input instanceof Instant) return new MomentCompat(input.toZonedDateTime(timeZone));
    if (input instanceof LocalDate) {
      return new MomentCompat(ZonedDateTime.fromLocal(LocalDateTime.combine(input), timeZone));
    }
    if (input instanceof Date) {
      return new MomentCompat(Instant.fromJSDate(input).toZonedDateTime(timeZone));
    }
    if (typeof input === 'number') {
      const ms = Math.abs(input) < 1e11 ? input * 1000 : input;
      return new MomentCompat(Instant.ofEpochMillis(ms).toZonedDateTime(timeZone));
    }
    if (typeof input === 'string') {
      try {
        if (input.includes('[')) return new MomentCompat(ZonedDateTime.parse(input));
        if (/^\d{4}-\d{2}-\d{2}$/u.test(input)) {
          return new MomentCompat(
            ZonedDateTime.fromLocal(LocalDateTime.combine(LocalDate.parse(input)), timeZone),
          );
        }
        if (/[zZ]|[+-]\d{2}/u.test(input)) return new MomentCompat(ZonedDateTime.parse(input));
        if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/u.test(input)) {
          return new MomentCompat(ZonedDateTime.fromLocal(LocalDateTime.parse(input), timeZone));
        }
        throw new TempoError('INVALID_PARSE', `compat/moment cannot parse ${input}`, { input });
      } catch (err) {
        if (err instanceof TempoError) throw err;
        throw new TempoError('INVALID_PARSE', `compat/moment cannot parse ${input}`, {
          input,
          cause: err,
        });
      }
    }
    throw new TempoError('INVALID_PARSE', 'Unsupported moment compat input', { input });
  }

  clone(): MomentCompat {
    return new MomentCompat(this.zoned);
  }

  format(pattern = 'YYYY-MM-DDTHH:mm:ssZ'): string {
    return format(this.zoned, mapMomentPattern(pattern));
  }

  add(amount: number | Record<string, number>, unit?: string): MomentCompat {
    return new MomentCompat(this.zoned.plus(toDuration(amount, unit)));
  }

  subtract(amount: number | Record<string, number>, unit?: string): MomentCompat {
    return new MomentCompat(this.zoned.minus(toDuration(amount, unit)));
  }

  startOf(unit: DateTimeUnit): MomentCompat {
    return new MomentCompat(this.zoned.startOf(unit));
  }

  endOf(unit: DateTimeUnit): MomentCompat {
    return new MomentCompat(this.zoned.endOf(unit));
  }

  diff(other: MomentInput, unit: DateTimeUnit = 'millisecond', precise = false): number {
    const b = MomentCompat.from(other, this.zoned.timeZone);
    const value = b.zoned.until(this.zoned, unit);
    return precise ? value : Math.trunc(value);
  }

  isBefore(other: MomentInput): boolean {
    return this.zoned.isBefore(MomentCompat.from(other).zoned);
  }

  isAfter(other: MomentInput): boolean {
    return this.zoned.isAfter(MomentCompat.from(other).zoned);
  }

  isSame(other: MomentInput): boolean {
    return this.zoned.isSame(MomentCompat.from(other).zoned);
  }

  isValid(): boolean {
    return true;
  }

  toDate(): Date {
    return this.zoned.toJSDate();
  }

  toISOString(): string {
    return this.zoned.toInstant().toISO();
  }

  unix(): number {
    return this.zoned.toInstant().toEpochSeconds();
  }

  valueOf(): number {
    return this.zoned.epochMillis;
  }

  utc(): MomentCompat {
    return new MomentCompat(this.zoned.withTimeZone('UTC'));
  }

  utcOffset(): number;
  utcOffset(minutes: number): MomentCompat;
  utcOffset(minutes?: number): number | MomentCompat {
    if (minutes === undefined) return this.zoned.offsetMs / 60_000;
    return new MomentCompat(this.zoned.withTimeZone(offsetFromMinutes(minutes)));
  }

  tz(timeZone: string): MomentCompat {
    return new MomentCompat(this.zoned.withTimeZone(timeZone));
  }

  fromNow(): string {
    return fromNow(this.zoned.toInstant());
  }

  toJSON(): string {
    return this.toISOString();
  }

  toString(): string {
    return this.format();
  }
}

function toDuration(amount: number | Record<string, number>, unit?: string): Duration {
  if (typeof amount === 'number') {
    return Duration.of({ [pluralize(unit ?? 'milliseconds')]: amount } as DurationLike);
  }
  const mapped: Record<string, number> = {};
  for (const [key, value] of Object.entries(amount)) {
    mapped[pluralize(key)] = value;
  }
  return Duration.of(mapped);
}

function pluralize(unit: string): string {
  const table: Record<string, string> = {
    year: 'years',
    years: 'years',
    y: 'years',
    month: 'months',
    months: 'months',
    M: 'months',
    week: 'weeks',
    weeks: 'weeks',
    w: 'weeks',
    day: 'days',
    days: 'days',
    d: 'days',
    hour: 'hours',
    hours: 'hours',
    h: 'hours',
    minute: 'minutes',
    minutes: 'minutes',
    m: 'minutes',
    second: 'seconds',
    seconds: 'seconds',
    s: 'seconds',
    millisecond: 'milliseconds',
    milliseconds: 'milliseconds',
    ms: 'milliseconds',
  };
  return table[unit] ?? unit;
}

function offsetFromMinutes(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

export function moment(input?: MomentInput, zone?: string): MomentCompat {
  return MomentCompat.from(input, zone);
}

export function utc(input?: MomentInput): MomentCompat {
  return MomentCompat.from(input, 'UTC');
}
