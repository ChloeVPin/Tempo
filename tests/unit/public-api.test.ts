import { describe, expect, it } from 'vitest';
import * as Tempo from '../../src/index.js';
import * as Format from '../../src/format/index.js';
import * as IntlEntry from '../../src/intl/index.js';
import * as Relative from '../../src/relative/index.js';
import * as MomentCompat from '../../src/compat/moment/index.js';
import * as TemporalInterop from '../../src/temporal/index.js';
import * as Tz from '../../src/tz/index.js';

function runtimeExports(value: object): string[] {
  return Object.keys(value).sort();
}

describe('public API exports', () => {
  it('freezes the main barrel to core and timezone APIs', () => {
    expect(runtimeExports(Tempo)).toEqual([
      'DateRange',
      'Duration',
      'Instant',
      'Interval',
      'LocalDate',
      'LocalDateTime',
      'LocalTime',
      'TempoError',
      'ZonedDateTime',
      'civilFromDays',
      'daysFromCivil',
      'daysInMonth',
      'daysInYear',
      'formatOffset',
      'getTimeZoneProvider',
      'intlTimeZoneProvider',
      'isBetween',
      'isLeapYear',
      'isoDayOfWeek',
      'isoWeekFields',
      'parseOffset',
      'resetClock',
      'setTimeZoneProvider',
      'systemClock',
      'useClock',
      'useFixedClock',
    ]);
  });

  it('does not leak advanced modules into the main barrel', () => {
    expect(Tempo).not.toHaveProperty('format');
    expect(Tempo).not.toHaveProperty('toLocaleString');
    expect(Tempo).not.toHaveProperty('relativeTime');
    expect(Tempo).not.toHaveProperty('moment');
    expect(Tempo).not.toHaveProperty('toTemporalInstant');
  });

  it('freezes the documented subpath exports', () => {
    expect(runtimeExports(Format)).toEqual([
      'clearFormatCache',
      'createLocalDateParser',
      'format',
      'registerLocalDateParser',
      'tokenize',
    ]);
    expect(runtimeExports(IntlEntry)).toEqual([
      'clearIntlCache',
      'getDateTimeFormat',
      'toLocaleString',
    ]);
    expect(runtimeExports(Relative)).toEqual([
      'formatDurationList',
      'fromNow',
      'relativeTime',
    ]);
    expect(runtimeExports(Tz)).toEqual([
      'ZonedDateTime',
      'clearTimeZoneCache',
      'formatOffset',
      'getTimeZoneProvider',
      'intlTimeZoneProvider',
      'isFixedOffsetId',
      'parseOffset',
      'resolveLocalInstant',
      'setTimeZoneProvider',
    ]);
    expect(runtimeExports(MomentCompat)).toEqual(['MomentCompat', 'moment', 'utc']);
    expect(runtimeExports(TemporalInterop)).toEqual([
      'fromTemporal',
      'getTemporal',
      'hasTemporal',
      'toTemporalDuration',
      'toTemporalInstant',
      'toTemporalPlainDate',
      'toTemporalPlainDateTime',
      'toTemporalPlainTime',
      'toTemporalZonedDateTime',
    ]);
  });
});
