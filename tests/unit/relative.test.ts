import { describe, expect, it } from 'vitest';
import { Instant } from '../../src/core/instant.js';
import { useFixedClock } from '../../src/clock.js';
import { fromNow } from '../../src/relative/index.js';
import { formatDurationList } from '../../src/relative/format-duration-list.js';

describe('relative time', () => {
  it('describes a past instant', () => {
    const restore = useFixedClock(Date.UTC(2026, 5, 1, 12, 0, 0));
    try {
      const past = Instant.parse('2026-06-01T11:00:00Z');
      expect(fromNow(past, { locale: 'en' })).toMatch(/hour/i);
    } finally {
      restore();
    }
  });
});

describe('formatDurationList', () => {
  it('formats non-zero units with the default long style', () => {
    expect(formatDurationList({ days: 3, hours: 4 }, { locale: 'en' })).toBe('3 days and 4 hours');
  });

  it('filters zero units from the formatted list', () => {
    expect(formatDurationList({ days: 3, hours: 0, minutes: 5 }, { locale: 'en' })).toBe(
      '3 days and 5 minutes',
    );
  });

  it('supports short and narrow styles', () => {
    expect(
      formatDurationList({ days: 3, hours: 4 }, { locale: 'en', style: 'short' }),
    ).toBe('3 days & 4 hours');
    expect(
      formatDurationList({ days: 3, hours: 4 }, { locale: 'en', style: 'narrow' }),
    ).toBe('3 days, 4 hours');
  });

  it('renders multilingual unit lists', () => {
    expect(formatDurationList({ days: 3, hours: 4 }, { locale: 'fr' })).toBe(
      '3 jours et 4 heures',
    );
  });
});
