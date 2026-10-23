import { describe, expect, it } from 'vitest';
import { Instant } from '../../src/core/instant.js';
import { TempoError } from '../../src/errors.js';
import type { RoundingMode, TimeUnit } from '../../src/types.js';

describe('Instant', () => {
  // existing tests unchanged ...

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
