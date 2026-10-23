import { describe, expect, it } from 'vitest';
import * as Tempo from '../../src/index.js';
import { Instant } from '../../src/core/instant.js';
import { LocalDate } from '../../src/core/local-date.js';
import { TempoError } from '../../src/errors.js';

describe('Interval', () => {
  it('is exported from the main package', () => {
    expect(Tempo).toHaveProperty('Interval');
  });

  it('uses half-open containment and allows an empty interval', () => {
    const start = Instant.parse('2026-06-01T00:00:00Z');
    const end = start.plus({ days: 1 });
    const interval = Tempo.Interval.of(start, end);

    expect(interval.start).toBe(start);
    expect(interval.end).toBe(end);
    expect(interval.contains(start)).toBe(true);
    expect(interval.contains(end)).toBe(false);
    expect(interval.contains(start.plus({ hours: 12 }))).toBe(true);
    const empty = Tempo.Interval.of(start, start);
    expect(empty.isEmpty()).toBe(true);
    expect(empty.contains(start)).toBe(false);
  });

  it('rejects an end before the start with a stable error code', () => {
    const start = Instant.parse('2026-06-02T00:00:00Z');
    const end = start.minus({ days: 1 });

    expect(() => Tempo.Interval.of(start, end)).toThrowError(TempoError);
    try {
      Tempo.Interval.of(start, end);
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_INTERVAL' });
    }
  });

  it('computes overlap, abutment, intersection, and union', () => {
    const day = (n: number) => Instant.parse(`2026-06-${String(n).padStart(2, '0')}T00:00:00Z`);
    const a = Tempo.Interval.of(day(1), day(4));
    const b = Tempo.Interval.of(day(3), day(6));
    const c = Tempo.Interval.of(day(4), day(7));
    const d = Tempo.Interval.of(day(8), day(9));

    expect(a.overlaps(b)).toBe(true);
    expect(a.intersection(b)?.equals(Tempo.Interval.of(day(3), day(4)))).toBe(true);
    expect(a.union(b)?.equals(Tempo.Interval.of(day(1), day(6)))).toBe(true);
    expect(a.abuts(c)).toBe(true);
    expect(a.overlaps(c)).toBe(false);
    expect(a.union(c)?.equals(Tempo.Interval.of(day(1), day(7)))).toBe(true);
    expect(a.intersection(c)).toBeNull();
    expect(a.union(d)).toBeNull();
  });

  it('works with LocalDate endpoints without converting them to instants', () => {
    const start = LocalDate.of(2026, 6, 1);
    const end = LocalDate.of(2026, 6, 8);
    const interval = Tempo.Interval.of(start, end);

    expect(interval.contains(LocalDate.of(2026, 6, 7))).toBe(true);
    expect(interval.contains(end)).toBe(false);
  });

  it('rejects endpoints that do not produce an ordered comparison', () => {
    const incomparable = { compare: () => Number.NaN };

    expect(() => Tempo.Interval.of(incomparable, incomparable)).toThrowError(TempoError);
  });

  it('provides a LocalDate-focused DateRange factory', () => {
    const range = Tempo.DateRange.of(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8));

    expect(range.contains(LocalDate.of(2026, 6, 7))).toBe(true);
    expect(range.contains(LocalDate.of(2026, 6, 8))).toBe(false);
  });
});

describe('Interval iteration', () => {
  const localStart = LocalDate.of(2026, 6, 1);
  const localEnd = LocalDate.of(2026, 6, 5);

  it('iterates LocalDate intervals by day', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    expect([...interval.by('day')]).toEqual([
      LocalDate.of(2026, 6, 1),
      LocalDate.of(2026, 6, 2),
      LocalDate.of(2026, 6, 3),
      LocalDate.of(2026, 6, 4),
    ]);
  });

  it('iterates LocalDate intervals by month', () => {
    const interval = Tempo.Interval.of(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 1));
    expect([...interval.by('month')]).toEqual([
      LocalDate.of(2026, 1, 1),
      LocalDate.of(2026, 2, 1),
      LocalDate.of(2026, 3, 1),
    ]);
  });

  it('iterates LocalDate intervals by year', () => {
    const interval = Tempo.Interval.of(LocalDate.of(2024, 1, 1), LocalDate.of(2027, 1, 1));
    expect([...interval.by('year')]).toEqual([
      LocalDate.of(2024, 1, 1),
      LocalDate.of(2025, 1, 1),
      LocalDate.of(2026, 1, 1),
    ]);
  });

  it('iterates Instant intervals by day using fixed 24-hour steps', () => {
    const instantStart = Instant.parse('2026-06-01T00:00:00Z');
    const instantEnd = instantStart.plus({ days: 3 });
    const interval = Tempo.Interval.of(instantStart, instantEnd);
    expect([...interval.by('day')]).toEqual([
      instantStart,
      instantStart.plus({ hours: 24 }),
      instantStart.plus({ hours: 48 }),
    ]);
  });

  it('iterate yields step values for LocalDate', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    expect([...interval.iterate({ days: 2 })]).toEqual([
      LocalDate.of(2026, 6, 1),
      LocalDate.of(2026, 6, 3),
    ]);
  });

  it('iterate yields step values for Instant', () => {
    const instantStart = Instant.parse('2026-06-01T00:00:00Z');
    const instantEnd = instantStart.plus({ days: 5 });
    const interval = Tempo.Interval.of(instantStart, instantEnd);
    expect([...interval.iterate({ hours: 24 })]).toEqual([
      instantStart,
      instantStart.plus({ hours: 24 }),
      instantStart.plus({ hours: 48 }),
      instantStart.plus({ hours: 72 }),
      instantStart.plus({ hours: 96 }),
    ]);
  });

  it('yields nothing for empty LocalDate intervals', () => {
    const interval = Tempo.Interval.of(localStart, localStart);
    expect([...interval.by('day')]).toEqual([]);
    expect([...interval.iterate({ days: 1 })]).toEqual([]);
  });

  it('yields nothing for empty Instant intervals', () => {
    const instantStart = Instant.parse('2026-06-01T00:00:00Z');
    const interval = Tempo.Interval.of(instantStart, instantStart);
    expect([...interval.by('day')]).toEqual([]);
    expect([...interval.iterate({ hours: 1 })]).toEqual([]);
  });

  it('split divides LocalDate interval into exact day-length sub-intervals', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    const parts = interval.split({ days: 1 });

    expect(parts).toHaveLength(4);
    expect(parts.map((part) => part.start.toISO())).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
    ]);
    expect(parts.map((part) => part.end.toISO())).toEqual([
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
    ]);
  });

  it('split handles non-divisible durations for Instant', () => {
    const instantStart = Instant.parse('2026-06-01T00:00:00Z');
    const instantEnd = instantStart.plus({ hours: 5 });
    const interval = Tempo.Interval.of(instantStart, instantEnd);
    const parts = interval.split({ hours: 2 });

    expect(parts).toHaveLength(3);
    const first = parts[0]!;
    const second = parts[1]!;
    const third = parts[2]!;
    expect(first.end.toEpochMilliseconds()).toBe(instantStart.plus({ hours: 2 }).toEpochMilliseconds());
    expect(second.end.toEpochMilliseconds()).toBe(instantStart.plus({ hours: 4 }).toEpochMilliseconds());
    expect(third.end.toEpochMilliseconds()).toBe(instantEnd.toEpochMilliseconds());
  });

  it('split returns a single interval when step exceeds range', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    const parts = interval.split({ days: 10 });

    expect(parts).toHaveLength(1);
    expect(parts[0]!.start).toBe(localStart);
    expect(parts[0]!.end).toBe(localEnd);
  });

  it('split returns an empty array for empty intervals', () => {
    const interval = Tempo.Interval.of(localStart, localStart);
    expect(interval.split({ days: 1 })).toEqual([]);
  });

  it('does not mutate the original interval', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    [...interval.by('day')];
    [...interval.iterate({ days: 1 })];
    interval.split({ days: 1 });

    expect(interval.start).toBe(localStart);
    expect(interval.end).toBe(localEnd);
  });

  it('rejects zero or negative iteration steps', () => {
    const interval = Tempo.Interval.of(localStart, localEnd);
    expect(() => [...interval.iterate({})]).toThrow(TempoError);
    expect(() => [...interval.iterate({ hours: -1 })]).toThrow(TempoError);
    expect(() => interval.split({})).toThrow(TempoError);
    expect(() => interval.split({ hours: -1 })).toThrow(TempoError);
  });
});
