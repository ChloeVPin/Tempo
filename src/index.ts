export { TempoError, type TempoErrorCode, type ParseResult } from './errors.js';
export type {
  DateUnit,
  TimeUnit,
  DateTimeUnit,
  Overflow,
  Disambiguation,
  RoundingMode,
  DurationLike,
  ArithmeticOptions,
  ZoneOptions,
  FormatOptions,
} from './types.js';
export { useClock, useFixedClock, resetClock, systemClock, type Clock } from './clock.js';

export {
  isLeapYear,
  daysInMonth,
  daysInYear,
  daysFromCivil,
  civilFromDays,
  isoDayOfWeek,
  isoWeekFields,
} from './core/civil.js';
export { Instant } from './core/instant.js';
export { LocalDate } from './core/local-date.js';
export { LocalTime } from './core/local-time.js';
export { LocalDateTime } from './core/local-datetime.js';
export { Duration } from './core/duration.js';
export { DateRange, Interval, type IntervalEndpoint } from './core/interval.js';
export { isBetween } from './core/compare.js';

export { ZonedDateTime, getTimeZoneProvider, setTimeZoneProvider } from './tz/zoned-datetime.js';
export { formatOffset, parseOffset } from './tz/offset.js';
export { intlTimeZoneProvider } from './tz/intl-provider.js';

// format / toLocaleString / relativeTime intentionally live on subpath
// entries (`@chloevpin/tempo/format`, `@chloevpin/tempo/intl`, `@chloevpin/tempo/relative`) so the
// main barrel stays core + zoned only. See docs/WORK-PACKAGES.md WP5.
