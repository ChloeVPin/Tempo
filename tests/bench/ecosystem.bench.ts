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
  bench('tempo parse ISO date', () => void LocalDate.parse(isoDate));
  bench('temporal parse ISO date', () => void Temporal.PlainDate.from(isoDate));
  bench('luxon parse ISO date', () => void DateTime.fromISO(isoDate));
  bench('date-fns parse ISO date', () => void parseISO(isoDate));
  bench('dayjs parse ISO date', () => void dayjs(isoDate));
  bench('moment parse ISO date', () => void momentJs(isoDate, true));

  bench('tempo parse ISO instant', () => void Instant.parse(isoDateTime));
  bench('temporal parse ISO instant', () => void Temporal.Instant.from(isoDateTime));
  bench('luxon parse ISO instant', () => void DateTime.fromISO(isoDateTime, { zone: 'utc' }));
  bench('date-fns parse ISO instant', () => void new Date(isoDateTime));
  bench('dayjs parse ISO instant', () => void dayjs(isoDateTime));
  bench('moment parse ISO instant', () => void momentJs(isoDateTime));

  bench('tempo parse ISO zoned', () => void ZonedDateTime.parse(isoZoned));
  bench('temporal parse ISO zoned', () => void Temporal.ZonedDateTime.from(isoZoned));
  bench('luxon parse ISO zoned', () => void DateTime.fromISO(isoZoned));
  bench('date-fns parse ISO zoned', () => void new Date(isoDateTime));
  bench('dayjs parse ISO zoned', () => void dayjs(isoDateTime));
  bench('moment parse ISO zoned', () => void momentJs(isoDateTime));

  bench('tempo arithmetic plus day', () => void LocalDate.parse(isoDate).plus({ days: 1 }));
  bench('temporal arithmetic plus day', () => void Temporal.PlainDate.from(isoDate).add({ days: 1 }));
  bench('luxon arithmetic plus day', () => void DateTime.fromISO(isoDate).plus({ days: 1 }));
  bench('date-fns arithmetic plus day', () => void addDays(parseISO(isoDate), 1));
  bench('dayjs arithmetic plus day', () => void dayjs(isoDate).add(1, 'day'));
  bench('moment arithmetic plus day', () => void momentJs(isoDate).add(1, 'day'));

  bench('tempo arithmetic plus minute', () => void Instant.parse(isoDateTime).plus({ minutes: 5 }));
  bench('temporal arithmetic plus minute', () => void Temporal.Instant.from(isoDateTime).add({ minutes: 5 }));
  bench('luxon arithmetic plus minute', () => void DateTime.fromISO(isoDateTime, { zone: 'utc' }).plus({ minutes: 5 }));
  bench('date-fns arithmetic plus minute', () => {
    const _d = new Date(isoDateTime);
    _d.setMinutes(_d.getMinutes() + 5);
    void _d;
  });
  bench('dayjs arithmetic plus minute', () => void dayjs(isoDateTime).add(5, 'minute'));
  bench('moment arithmetic plus minute', () => void momentJs(isoDateTime).add(5, 'minute'));

  bench('tempo format ISO', () => void tempoFormat(LocalDate.parse(isoDate), 'yyyy-MM-dd'));
  bench('temporal format ISO', () => void Temporal.PlainDate.from(isoDate).toString());
  bench('luxon format ISO', () => void DateTime.fromISO(isoDate).toISODate());
  bench('date-fns format ISO', () => void formatISO(new Date(isoDate)));
  bench('dayjs format ISO', () => void dayjs(isoDate).format('YYYY-MM-DD'));
  bench('moment format ISO', () => void momentJs(isoDate).format('YYYY-MM-DD'));

  bench('tempo format with time tokens', () => void tempoFormat(LocalDateTime.parse(isoDateTime), 'yyyy-MM-dd HH:mm:ss'));
  bench('temporal format with time tokens', () => void Temporal.Instant.from(isoDateTime).toZonedDateTimeISO('UTC').toPlainDateTime().toString());
  bench('luxon format with time tokens', () => void DateTime.fromISO(isoDateTime, { zone: 'utc' }).toFormat('yyyy-MM-dd HH:mm:ss'));
  bench('date-fns format with time tokens', () => void format(new Date(isoDateTime), 'yyyy-MM-dd HH:mm:ss'));
  bench('dayjs format with time tokens', () => void dayjs(isoDateTime).format('YYYY-MM-DD HH:mm:ss'));
  bench('moment format with time tokens', () => void momentJs(isoDateTime).format('YYYY-MM-DD HH:mm:ss'));
});

function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 24 * 60 * 60 * 1000);
}
