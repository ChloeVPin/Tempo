import { describe, expect, it } from 'vitest';
import { LocalTime } from '../../src/core/local-time.js';
import { TempoError } from '../../src/errors.js';
import { useFixedClock } from '../../src/clock.js';
import type { RoundingMode, TimeUnit } from '../../src/types.js';

describe('LocalTime', () => {
  it('parses ISO times', () => {
    expect(LocalTime.parse('09:30').toISO()).toBe('09:30:00');
    expect(LocalTime.parse('09:30:01.5').toISO()).toBe('09:30:01.500');
  });

  it('rejects invalid fields', () => {
    expect(() => LocalTime.of(24)).toThrow(TempoError);
    expect(() => LocalTime.parse('9:30')).toThrow(TempoError);
  });

  it('wraps around midnight', () => {
    expect(LocalTime.of(23, 30).plus({ hours: 1 }).toISO()).toBe('00:30:00');
    expect(LocalTime.of(0, 15).minus({ minutes: 30 }).toISO()).toBe('23:45:00');
  });

  it('supports startOf / endOf', () => {
    const t = LocalTime.of(13, 45, 12, 3);
    expect(t.startOf('hour').toISO()).toBe('13:00:00');
    expect(t.endOf('minute').toISO()).toBe('13:45:59.999');
  });

  it('now follows the fixed clock', () => {
    const instant = Date.UTC(2026, 5, 1, 15, 30, 45, 123);
    const restore = useFixedClock(instant);
    try {
      expect(LocalTime.now('UTC').toISO()).toBe('15:30:45.123');
      // The no-zone branch uses the host time zone; mirror its derivation.
      const host = new Date(instant);
      expect(LocalTime.now().hour).toBe(host.getHours());
      expect(LocalTime.now().minute).toBe(host.getMinutes());
    } finally {
      restore();
    }
  });

  describe('round', () => {
    it('rounds to the nearest second with halfExpand by default', () => {
      expect(LocalTime.of(12, 0, 30, 500).round({ smallestUnit: 'second' }).toISO()).toBe('12:00:31');
    });

    it('supports trunc rounding', () => {
      expect(LocalTime.of(12, 0, 30, 500).round({ smallestUnit: 'second', roundingMode: 'trunc' }).toISO()).toBe('12:00:30');
    });

    it('supports ceil rounding', () => {
      expect(LocalTime.of(12, 0, 0, 1).round({ smallestUnit: 'second', roundingMode: 'ceil' }).toISO()).toBe('12:00:01');
    });

    it('supports floor rounding', () => {
      expect(LocalTime.of(12, 0, 30, 500).round({ smallestUnit: 'second', roundingMode: 'floor' }).toISO()).toBe('12:00:30');
    });

    it('does not mutate the original instance', () => {
      const time = LocalTime.of(12, 0, 30, 500);
      const rounded = time.round({ smallestUnit: 'second' });
      expect(time.toISO()).toBe('12:00:30.500');
      expect(rounded.toISO()).toBe('12:00:31');
    });

    it('rejects calendar units', () => {
      const bad = 'day' as TimeUnit;
      expect(() => LocalTime.of(12, 0, 0).round({ smallestUnit: bad })).toThrow(TempoError);
    });

    it('rejects unsupported rounding modes', () => {
      const options = { smallestUnit: 'second' as const, roundingMode: 'invalid' as RoundingMode };
      expect(() => LocalTime.of(12, 0, 30, 500).round(options)).toThrow(TempoError);
    });
  });
});
