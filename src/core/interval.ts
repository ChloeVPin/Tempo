import { TempoError } from '../errors.js';
import { Duration } from './duration.js';
import { Instant, utcMillis } from './instant.js';
import { LocalDate } from './local-date.js';
import { LocalDateTime } from './local-datetime.js';
import type { DateUnit, DurationLike } from '../types.js';

export interface IntervalEndpoint<T> {
  compare(other: T): number;
}

export class Interval<T extends IntervalEndpoint<T>> {
  readonly #start: T;
  readonly #end: T;

  private constructor(start: T, end: T) {
    this.#start = start;
    this.#end = end;
  }

  get start(): T {
    return this.#start;
  }

  get end(): T {
    return this.#end;
  }

  static of<T extends IntervalEndpoint<T>>(start: T, end: T): Interval<T> {
    if (compareEndpoints(start, end) > 0) {
      throw new TempoError('INVALID_INTERVAL', 'Interval end must not be before start', {
        input: { start, end },
      });
    }
    return new Interval(start, end);
  }

  isEmpty(): boolean {
    return compareEndpoints(this.#start, this.#end) === 0;
  }

  contains(value: T): boolean {
    return compareEndpoints(this.#start, value) <= 0 && compareEndpoints(value, this.#end) < 0;
  }

  overlaps(other: Interval<T>): boolean {
    return (
      compareEndpoints(this.#start, other.end) < 0 && compareEndpoints(other.start, this.#end) < 0
    );
  }

  abuts(other: Interval<T>): boolean {
    return (
      compareEndpoints(this.#end, other.start) === 0 || compareEndpoints(other.end, this.#start) === 0
    );
  }

  intersection(other: Interval<T>): Interval<T> | null {
    if (!this.overlaps(other)) return null;
    const start = compareEndpoints(this.#start, other.start) >= 0 ? this.#start : other.start;
    const end = compareEndpoints(this.#end, other.end) <= 0 ? this.#end : other.end;
    return Interval.of(start, end);
  }

  union(other: Interval<T>): Interval<T> | null {
    if (!this.overlaps(other) && !this.abuts(other)) return null;
    const start = compareEndpoints(this.#start, other.start) <= 0 ? this.#start : other.start;
    const end = compareEndpoints(this.#end, other.end) >= 0 ? this.#end : other.end;
    return Interval.of(start, end);
  }

  equals(other: Interval<T>): boolean {
    return (
      compareEndpoints(this.#start, other.start) === 0 && compareEndpoints(this.#end, other.end) === 0
    );
  }

  *by(unit: DateUnit): IterableIterator<T> {
    if (this.isEmpty()) return;
    let current = this.#start;
    yield current;
    while (compareEndpoints(current, this.#end) < 0) {
      current = advanceByUnit(current, unit);
      if (compareEndpoints(current, this.#end) < 0) yield current;
    }
  }

  *iterate(step: Duration | DurationLike): IterableIterator<T> {
    if (this.isEmpty()) return;
    const duration = Duration.from(step);
    if (duration.isZero() || duration.sign < 0) {
      throw new TempoError('INVALID_INTERVAL', 'Interval iteration step must be non-zero', {
        input: step,
      });
    }
    let current = this.#start;
    yield current;
    while (compareEndpoints(current, this.#end) < 0) {
      current = currentPlus(current, duration);
      if (compareEndpoints(current, this.#end) < 0) yield current;
    }
  }

  split(step: Duration | DurationLike): Interval<T>[] {
    if (this.isEmpty()) return [];
    const normalized = Duration.from(step);
    if (normalized.isZero() || normalized.sign < 0) {
      throw new TempoError('INVALID_INTERVAL', 'Interval split step must be non-zero', {
        input: step,
      });
    }
    const result: Interval<T>[] = [];
    let current = this.#start;
    while (compareEndpoints(current, this.#end) < 0) {
      const next = currentPlus(current, normalized);
      const end = compareEndpoints(next, this.#end) >= 0 ? this.#end : next;
      result.push(Interval.of(current, end));
      if (compareEndpoints(end, this.#end) === 0) break;
      current = end;
    }
    return result;
  }
}

export type DateRange = Interval<LocalDate>;

export const DateRange = {
  of(start: LocalDate, end: LocalDate): DateRange {
    return Interval.of(start, end);
  },
};

function compareEndpoints<T extends IntervalEndpoint<T>>(a: T, b: T): number {
  const result = a.compare(b);
  if (Number.isNaN(result)) {
    throw new TempoError('INVALID_INTERVAL', 'Interval endpoints must be comparable', {
      input: { a, b },
    });
  }
  return result < 0 ? -1 : result > 0 ? 1 : 0;
}

function currentPlus<T extends IntervalEndpoint<T>>(current: T, step: Duration): T {
  if (current instanceof LocalDate || current instanceof LocalDateTime) {
    return (current as unknown as { plus(d: Duration): T }).plus(step);
  }
  if (current instanceof Instant) {
    return advanceInstantCalendar(current, step) as unknown as T;
  }
  if (current instanceof Date) {
    return new Date(current.getTime() + step.total('millisecond')) as unknown as T;
  }
  if (typeof (current as unknown as { plus(amount: Duration | DurationLike): unknown }).plus === 'function') {
    return (current as unknown as { plus(amount: Duration | DurationLike): T }).plus(step);
  }
  throw new TempoError('INCOMPATIBLE_UNIT', 'Interval iteration requires an advanceable endpoint', {
    input: current,
  });
}

const PLURAL_UNITS: Record<DateUnit, keyof DurationLike> = {
  year: 'years',
  month: 'months',
  week: 'weeks',
  day: 'days',
};

function advanceByUnit<T extends IntervalEndpoint<T>>(current: T, unit: DateUnit): T {
  return currentPlus(current, Duration.of({ [PLURAL_UNITS[unit]]: 1 } as DurationLike));
}

function advanceInstantCalendar(instant: Instant, step: Duration): Instant {
  const d = new Date(instant.epochMillis);
  const l = LocalDateTime.of(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  ).plus(step);
  const ms = utcMillis(l.year, l.month, l.day, l.hour, l.minute, l.second, l.millisecond);
  if (ms === null) {
    throw new TempoError('OUT_OF_RANGE', 'Instant calendar step produced invalid UTC fields', {
      input: instant,
    });
  }
  return Instant.ofEpochMillis(ms);
}
