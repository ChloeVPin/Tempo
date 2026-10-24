import { bench, describe } from 'vitest';
import { DateTime } from 'luxon';
import { format, formatISO, parseISO } from 'date-fns';
import dayjs from 'dayjs';
import momentJs from 'moment';
import { Temporal } from '@js-temporal/polyfill';

import { LocalDate } from '../../src/core/local-date.js';
import { Instant } from '../../src/core/instant.js';
import { LocalDateTime } from '../../src/core/local-datetime.js';
import { ZonedDateTime } from '../../src/tz/zoned-datetime.js';
import { format as tempoFormat } from '../../src/format/format.js';

const isoDate = '2026-06-01';
const isoDateTime = '2026-06-01T12:00:00.000Z';
const isoZoned = '2026-06-01T12:00:00.000Z[America/New_York]';

describe('6-way ecosystem benchmarks', () => {
  bench('parse ISO date', () => {
    LocalDate.parse(isoDate);
    Temporal.PlainDate.from(isoDate);
    DateTime.fromISO(isoDate);
    parseISO(isoDate);
    dayjs(isoDate);
    momentJs(isoDate, true);
  });

  bench('parse ISO instant', () => {
    Instant.parse(isoDateTime);
    Temporal.Instant.from(isoDateTime);
    DateTime.fromISO(isoDateTime, { zone: 'utc' });
    new Date(isoDateTime);
    dayjs(isoDateTime);
    momentJs(isoDateTime);
  });

  bench('parse ISO zoned', () => {
    ZonedDateTime.parse(isoZoned);
    Temporal.ZonedDateTime.from(isoZoned);
    DateTime.fromISO(isoZoned);
    new Date(isoDateTime);
    dayjs(isoDateTime);
    momentJs(isoDateTime);
  });

  bench('arithmetic plus day', () => {
    LocalDate.parse(isoDate).plus({ days: 1 });
    Temporal.PlainDate.from(isoDate).add({ days: 1 });
    DateTime.fromISO(isoDate).plus({ days: 1 });
    addDays(parseISO(isoDate), 1);
    dayjs(isoDate).add(1, 'day');
    momentJs(isoDate).add(1, 'day');
  });

  bench('arithmetic plus minute', () => {
    Instant.parse(isoDateTime).plus({ minutes: 5 });
    Temporal.Instant.from(isoDateTime).add({ minutes: 5 });
    DateTime.fromISO(isoDateTime, { zone: 'utc' }).plus({ minutes: 5 });
    const _d = new Date(isoDateTime); _d.setMinutes(_d.getMinutes() + 5);
    dayjs(isoDateTime).add(5, 'minute');
    momentJs(isoDateTime).add(5, 'minute');
  });

  bench('format ISO', () => {
    tempoFormat(LocalDate.parse(isoDate), 'yyyy-MM-dd');
    Temporal.PlainDate.from(isoDate).toString();
    DateTime.fromISO(isoDate).toISODate();
    formatISO(new Date(isoDate));
    dayjs(isoDate).format('YYYY-MM-DD');
    momentJs(isoDate).format('YYYY-MM-DD');
  });

  bench('format with time tokens', () => {
    tempoFormat(LocalDateTime.parse(isoDateTime), 'yyyy-MM-dd HH:mm:ss');
    Temporal.Instant.from(isoDateTime).toZonedDateTimeISO('UTC').toPlainDateTime().toString();
    DateTime.fromISO(isoDateTime, { zone: 'utc' }).toFormat('yyyy-MM-dd HH:mm:ss');
    format(new Date(isoDateTime), "yyyy-MM-dd HH:mm:ss");
    dayjs(isoDateTime).format('YYYY-MM-DD HH:mm:ss');
    momentJs(isoDateTime).format('YYYY-MM-DD HH:mm:ss');
  });
});

function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 24 * 60 * 60 * 1000);
}
