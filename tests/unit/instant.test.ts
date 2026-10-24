import { describe, expect, it } from 'vitest';
import { Instant } from '../../src/core/instant.js';
import { TempoError } from '../../src/errors.js';
import type { RoundingMode, TimeUnit } from '../../src/types.js';

describe('Instant', () => {
  it('parses RFC 3339 instants with offset normalization', () => {
    const instant = Instant.parse('2026-06-01T12:00:00Z');
    expect(instant.toISO()).toBe('2026-06-01T12:00:00.000Z');
    expect(Instant.parse('2026-06-01T14:00:00+02:00').equals(instant)).toBe(true);
  });

  it('rejects malformed input and missing offsets', () => {
    expect(() => Instant.parse('2026-06-01T12:00:00')).toThrow(TempoError);
    expect(() => Instant.parse('not a date')).toThrow(TempoError);
  });

  it('adds time-unit durations and rejects calendar units', () => {
    const instant = Instant.parse('2026-06-01T00:00:00Z');
    expect(instant.plus({ hours: 2 }).toISO()).toBe('2026-06-01T02:00:00.000Z');
    expect(() => instant.plus({ months: 1 })).toThrow(TempoError);
  });

  it('round-trips through Date without losing epoch millis', () => {
    const instant = Instant.ofEpochMillis(1_714_000_000_000);
    expect(Instant.fromJSDate(instant.toJSDate()).equals(instant)).toBe(true);
  });

  it('orders instants with before/until assertions', () => {
    const earlier = Instant.parse('2026-01-01T00:00:00Z');
    const later = Instant.parse('2026-01-01T00:00:01Z');

    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.until(later, 'second')).toBe(1);
  });

  describe('round', () => {
    it('rounds to the nearest minute with halfExpand by default', () => {
      expect(Instant.parse('2026-06-01T12:34:36.000Z').round({ smallestUnit: 'minute' }).toISO()).toBe(
        '2026-06-01T12:35:00.000Z',
      );
    });

    it('rounds epoch milliseconds with halfExpand', () => {
      expect(Instant.ofEpochMillis(1_714_000_000_000).round({ smallestUnit: 'second' }).toEpochMilliseconds()).toBe(
        1_714_000_000_000,
      );
      expect(Instant.ofEpochMillis(1_714_000_499).round({ smallestUnit: 'second' }).toEpochMilliseconds()).toBe(
        1_714_000_000,
      );
    });

    it('supports ceil rounding', () => {
      expect(Instant.parse('2026-06-01T12:00:30.000Z').round({ smallestUnit: 'minute', roundingMode: 'ceil' }).toISO()).toBe(
        '2026-06-01T12:01:00.000Z',
      );
    });

    it('supports floor rounding', () => {
      expect(Instant.parse('2026-06-01T12:00:30.000Z').round({ smallestUnit: 'minute', roundingMode: 'floor' }).toISO()).toBe(
        '2026-06-01T12:00:00.000Z',
      );
    });

    it('supports trunc rounding toward zero', () => {
      expect(Instant.parse('2026-06-01T12:00:30.000Z').round({ smallestUnit: 'minute', roundingMode: 'trunc' }).toISO()).toBe(
        '2026-06-01T12:00:00.000Z',
      );
      expect(Instant.ofEpochMillis(-1_714_000_000_499).round({ smallestUnit: 'second', roundingMode: 'trunc' }).toEpochMilliseconds()).toBe(
        -1_714_000_000_000,
      );
    });

    it('rejects calendar units', () => {
      const bad = 'day' as TimeUnit;
      expect(() => Instant.parse('2026-06-01T12:00:00Z').round({ smallestUnit: bad })).toThrow(TempoError);
    });

    it('rejects unsupported rounding modes', () => {
      const options = { smallestUnit: 'minute' as const, roundingMode: 'invalid' as RoundingMode };
      expect(() => Instant.parse('2026-06-01T12:00:30.000Z').round(options)).toThrow(TempoError);
    });
  });
});
