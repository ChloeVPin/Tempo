import { nowMs } from '../clock.js';
import { TempoError, type ParseResult, unwrapParse } from '../errors.js';
import type { DurationLike, LocalTimeLike, RoundingMode, TimeUnit, WithTimeFields } from '../types.js';
import { Duration } from './duration.js';
import {
  applyRoundingMode,
  MILLIS_PER_DAY,
  MILLIS_PER_HOUR,
  MILLIS_PER_MINUTE,
  MILLIS_PER_SECOND,
  roundingUnitDivisor,
  validateRoundingMode,
} from './range.js';

export class LocalTime {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;

  private constructor(hour: number, minute: number, second: number, millisecond: number) {
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.millisecond = millisecond;
  }

  static of(hour: number, minute = 0, second = 0, millisecond = 0): LocalTime {
    validateTime(hour, minute, second, millisecond);
    return new LocalTime(hour, minute, second, millisecond);
  }

  static from(fields: LocalTimeLike): LocalTime {
    return LocalTime.of(fields.hour, fields.minute, fields.second, fields.millisecond);
  }

  static fromMsOfDay(ms: number): LocalTime {
    if (!Number.isInteger(ms)) {
      throw new TempoError('INVALID_TIME', 'msOfDay must be an integer', { input: ms });
    }
    const normalized = ((ms % MILLIS_PER_DAY) + MILLIS_PER_DAY) % MILLIS_PER_DAY;
    const hour = Math.floor(normalized / MILLIS_PER_HOUR);
    const minute = Math.floor((normalized % MILLIS_PER_HOUR) / MILLIS_PER_MINUTE);
    const second = Math.floor((normalized % MILLIS_PER_MINUTE) / MILLIS_PER_SECOND);
    const millisecond = normalized % MILLIS_PER_SECOND;
    return new LocalTime(hour, minute, second, millisecond);
  }

  static midnight(): LocalTime {
    return LocalTime.of(0);
  }

  static noon(): LocalTime {
    return LocalTime.of(12);
  }

  static now(timeZone?: string): LocalTime {
    if (timeZone === undefined) {
      const date = new Date(nowMs());
      return LocalTime.of(
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
      );
    }
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hourCycle: 'h23',
    }).formatToParts(new Date(nowMs()));
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') map[part.type] = part.value;
    }
    const hour = map.hour === '24' ? 0 : Number(map.hour);
    return LocalTime.of(
      hour,
      Number(map.minute ?? 0),
      Number(map.second ?? 0),
      Math.round(Number(map.fractionalSecond ?? 0)),
    );
  }

  static parse(input: string): LocalTime {
    return unwrapParse(LocalTime.tryParse(input));
  }

  static tryParse(input: string): ParseResult<LocalTime> {
    return parseLocalTime(input);
  }

  static compare(a: LocalTime, b: LocalTime): number {
    return a.toMsOfDay() - b.toMsOfDay();
  }

  toMsOfDay(): number {
    return (
      this.hour * MILLIS_PER_HOUR +
      this.minute * MILLIS_PER_MINUTE +
      this.second * MILLIS_PER_SECOND +
      this.millisecond
    );
  }

  with(fields: WithTimeFields): LocalTime {
    return LocalTime.of(
      fields.hour ?? this.hour,
      fields.minute ?? this.minute,
      fields.second ?? this.second,
      fields.millisecond ?? this.millisecond,
    );
  }

  plus(amount: Duration | DurationLike): LocalTime {
    const d = Duration.from(amount);
    if (d.hasDateUnits() && (d.years !== 0 || d.months !== 0)) {
      throw new TempoError('INCOMPATIBLE_UNIT', 'Cannot add years or months to a LocalTime', {
        input: d.toISO(),
      });
    }
    const extraDays = d.weeks * 7 + d.days;
    const ms =
      extraDays * MILLIS_PER_DAY +
      d.hours * MILLIS_PER_HOUR +
      d.minutes * MILLIS_PER_MINUTE +
      d.seconds * MILLIS_PER_SECOND +
      d.milliseconds;
    return LocalTime.fromMsOfDay(this.toMsOfDay() + ms);
  }

  minus(amount: Duration | DurationLike): LocalTime {
    return this.plus(Duration.from(amount).negated());
  }

  startOf(unit: TimeUnit): LocalTime {
    switch (unit) {
      case 'hour':
        return LocalTime.of(this.hour);
      case 'minute':
        return LocalTime.of(this.hour, this.minute);
      case 'second':
        return LocalTime.of(this.hour, this.minute, this.second);
      case 'millisecond':
        return this;
    }
  }

  endOf(unit: TimeUnit): LocalTime {
    switch (unit) {
      case 'hour':
        return LocalTime.of(this.hour, 59, 59, 999);
      case 'minute':
        return LocalTime.of(this.hour, this.minute, 59, 999);
      case 'second':
        return LocalTime.of(this.hour, this.minute, this.second, 999);
      case 'millisecond':
        return this;
    }
  }

  until(other: LocalTime, unit: TimeUnit = 'millisecond'): number {
    const ms = other.toMsOfDay() - this.toMsOfDay();
    switch (unit) {
      case 'millisecond':
        return ms;
      case 'second':
        return Math.trunc(ms / MILLIS_PER_SECOND);
      case 'minute':
        return Math.trunc(ms / MILLIS_PER_MINUTE);
      case 'hour':
        return Math.trunc(ms / MILLIS_PER_HOUR);
    }
  }

  round(options: { readonly smallestUnit: TimeUnit; readonly roundingMode?: RoundingMode }): LocalTime {
    const unit = options.smallestUnit;
    validateRoundingMode(options.roundingMode);
    const divisor = roundingUnitDivisor(unit);
    const ms = this.toMsOfDay();
    const remainder = ms % divisor;
    let rounded = ms - remainder;
    if (remainder !== 0) {
      rounded += applyRoundingMode(divisor, remainder, options.roundingMode ?? 'halfExpand');
    }
    return LocalTime.fromMsOfDay(rounded);
  }

  compare(other: LocalTime): number {
    return LocalTime.compare(this, other);
  }

  isBefore(other: LocalTime): boolean {
    return this.compare(other) < 0;
  }

  isAfter(other: LocalTime): boolean {
    return this.compare(other) > 0;
  }

  isSame(other: LocalTime): boolean {
    return this.compare(other) === 0;
  }

  equals(other: LocalTime | LocalTimeLike): boolean {
    return (
      this.hour === other.hour &&
      this.minute === other.minute &&
      this.second === other.second &&
      this.millisecond === other.millisecond
    );
  }

  toISO(): string {
    const base = `${pad2(this.hour)}:${pad2(this.minute)}:${pad2(this.second)}`;
    if (this.millisecond === 0) return base;
    return `${base}.${String(this.millisecond).padStart(3, '0')}`;
  }

  toJSON(): string {
    return this.toISO();
  }

  toString(): string {
    return this.toISO();
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function validateTime(hour: number, minute: number, second: number, millisecond: number): void {
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    !Number.isInteger(millisecond)
  ) {
    throw new TempoError('INVALID_TIME', 'Time fields must be integers', {
      input: { hour, minute, second, millisecond },
    });
  }
  if (hour < 0 || hour > 23) {
    throw new TempoError('INVALID_TIME', `Hour ${hour} is out of range 0-23`, { input: hour });
  }
  if (minute < 0 || minute > 59) {
    throw new TempoError('INVALID_TIME', `Minute ${minute} is out of range 0-59`, { input: minute });
  }
  if (second < 0 || second > 59) {
    throw new TempoError('INVALID_TIME', `Second ${second} is out of range 0-59`, { input: second });
  }
  if (millisecond < 0 || millisecond > 999) {
    throw new TempoError('INVALID_TIME', `Millisecond ${millisecond} is out of range 0-999`, {
      input: millisecond,
    });
  }
}

function parseLocalTime(input: string): ParseResult<LocalTime> {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'INVALID_PARSE', message: 'Expected a string', input: String(input) };
  }
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/u.exec(input);
  if (!match) {
    return { ok: false, reason: 'INVALID_PARSE', message: 'Expected ISO time HH:mm[:ss[.SSS]]', input };
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  const frac = match[4] ?? '';
  const millisecond = frac === '' ? 0 : Number(frac.padEnd(3, '0').slice(0, 3));
  try {
    return { ok: true, value: LocalTime.of(hour, minute, second, millisecond) };
  } catch (err) {
    const message = err instanceof TempoError ? err.message : 'Invalid time';
    return { ok: false, reason: 'INVALID_TIME', message, input };
  }
}
