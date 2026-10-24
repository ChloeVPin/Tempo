import type { Instant } from '../core/instant.js';
import { LocalDate } from '../core/local-date.js';
import type { LocalDateTime } from '../core/local-datetime.js';
import { daysFromCivil, isoDayOfWeek } from '../core/civil.js';
import type { LocalTime } from '../core/local-time.js';
import { TempoError } from '../errors.js';
import type { FormatOptions } from '../types.js';
import { formatOffset } from '../tz/offset.js';
import type { ZonedDateTime } from '../tz/zoned-datetime.js';
import { tokenize, type FormatToken } from './tokens.js';
import { createLocalDateParser } from './parse.js';
import { registerLocalDateParser } from '../core/parser-registry.js';

export type Formattable = LocalDate | LocalTime | LocalDateTime | Instant | ZonedDateTime;

registerLocalDateParser(createLocalDateParser());

const compilerCache = new Map<string, FormatToken[]>();
const dayPeriodCache = new Map<string, Intl.DateTimeFormat>();

export function format(value: Formattable, pattern: string, options: FormatOptions = {}): string {
  let tokens = compilerCache.get(pattern);
  if (!tokens) {
    tokens = tokenize(pattern);
    compilerCache.set(pattern, tokens);
  }
  const fields = fieldsOf(value, options);
  let out = '';
  for (const token of tokens) out += render(token, fields, options);
  return out;
}

interface Fields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: number;
  offsetMs: number | undefined;
  timeZone: string | undefined;
}

function fieldsOf(value: Formattable, options: FormatOptions): Fields {
  if ('epochMillis' in value && !('timeZone' in value)) {
    const zone = options.timeZone ?? 'UTC';
    const zoned = value.toZonedDateTime(zone);
    return fieldsOf(zoned, options);
  }
  const year = 'year' in value ? value.year : 1970;
  const month = 'month' in value ? value.month : 1;
  const day = 'day' in value ? value.day : 1;
  const hour = 'hour' in value ? value.hour : 0;
  const minute = 'minute' in value ? value.minute : 0;
  const second = 'second' in value ? value.second : 0;
  const millisecond = 'millisecond' in value ? value.millisecond : 0;
  const weekday =
    'dayOfWeek' in value && typeof value.dayOfWeek === 'function'
      ? value.dayOfWeek()
      : isoWeekday(year, month, day);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    weekday,
    offsetMs: 'offsetMs' in value ? value.offsetMs : options.offsetMs,
    timeZone: 'timeZone' in value ? value.timeZone : options.timeZone,
  };
}

function isoWeekday(year: number, month: number, day: number): number {
  // Use the civil calendar rather than `Date.UTC`, which interprets years 0-99 as
  // 1900-1999 and would return the wrong weekday (and day for `Date` arithmetic).
  return isoDayOfWeek(daysFromCivil(year, month, day));
}

function render(token: FormatToken, fields: Fields, options: FormatOptions): string {
  switch (token.kind) {
    case 'literal':
      return token.text;
    case 'year':
      return formatYear(fields.year, token.text.length);
    case 'month':
      return formatMonth(fields.month, token.text.length, options.locale);
    case 'day':
      return pad(fields.day, token.text.length);
    case 'weekday':
      return formatWeekday(fields.weekday, token.text.length, options.locale);
    case 'hour24':
      return pad(fields.hour, token.text.length);
    case 'hour12': {
      const h = fields.hour % 12 === 0 ? 12 : fields.hour % 12;
      return pad(h, token.text.length);
    }
    case 'minute':
      return pad(fields.minute, token.text.length);
    case 'second':
      return pad(fields.second, token.text.length);
    case 'millisecond':
      return String(fields.millisecond).padStart(3, '0').slice(0, token.text.length);
    case 'dayPeriod':
      return formatDayPeriod(fields.hour, options.locale);
    case 'offset':
      if (fields.offsetMs === undefined) {
        throw new TempoError('INVALID_FORMAT', 'Offset token requires a zoned value or offsetMs');
      }
      return formatOffsetToken(fields.offsetMs, token.text);
    case 'zone':
      return fields.timeZone ?? formatOffset(fields.offsetMs ?? 0);
  }
}

function formatYear(year: number, length: number): string {
  if (length === 2) return String(Math.abs(year) % 100).padStart(2, '0');
  const abs = String(Math.abs(year)).padStart(Math.max(length, 4), '0');
  return year < 0 ? `-${abs}` : abs;
}

function formatMonth(month: number, length: number, locale?: string): string {
  if (length === 1) return String(month);
  if (length === 2) return pad(month, 2);
  const date = new Date(Date.UTC(2020, month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: length >= 4 ? 'long' : 'short',
    timeZone: 'UTC',
  }).format(date);
}

function formatWeekday(weekday: number, length: number, locale?: string): string {
  const date = new Date(Date.UTC(2020, 0, 5 + weekday));
  return new Intl.DateTimeFormat(locale, {
    weekday: length >= 4 ? 'long' : 'short',
    timeZone: 'UTC',
  }).format(date);
}

function formatDayPeriod(hour: number, locale?: string): string {
  let formatter = dayPeriodCache.get(locale ?? '');
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      hourCycle: 'h12',
      timeZone: 'UTC',
    });
    dayPeriodCache.set(locale ?? '', formatter);
  }
  const date = new Date(0);
  date.setUTCHours(hour, 0, 0, 0);
  const part = formatter.formatToParts(date).find((p) => p.type === 'dayPeriod');
  return part?.value ?? (hour < 12 ? 'AM' : 'PM');
}

function formatOffsetToken(offsetMs: number, token: string): string {
  if (offsetMs === 0 && token === 'X') return 'Z';
  if (token === 'X' || token === 'XX') return formatOffset(offsetMs, 'basic');
  if (token === 'XXX') return formatOffset(offsetMs, 'iso');
  return formatOffset(offsetMs, 'iso');
}

function pad(n: number, length: number): string {
  return String(n).padStart(length, '0');
}

export function clearFormatCache(): void {
  compilerCache.clear();
  dayPeriodCache.clear();
}
