# API reference (1.0 candidate)

All types are immutable. Methods return new values.

## LocalDate

A calendar date with no time zone. Month is `1..12`.

```ts
LocalDate.of(2026, 6, 1)
LocalDate.parse('2026-06-01')
LocalDate.parse('01/06/2026', 'dd/MM/yyyy')
LocalDate.tryParse('2026-02-30') // { ok: false, reason: 'INVALID_MONTH_DAY', ... }
LocalDate.today()
LocalDate.today('America/New_York')
LocalDate.fromEpochDay(0) // 1970-01-01
LocalDate.ofIsoWeek(2026, 1, 4)

date.plus({ months: 1 })
date.minus({ days: 3 }, { overflow: 'reject' })
date.with({ day: 31 })
date.startOf('month')
date.endOf('year')
date.until(other, 'day')
date.dayOfWeek() // ISO Monday=1
date.isoWeek()
date.isoWeekYear()
date.toISO() // '2026-06-01'
```

## LocalTime

```ts
LocalTime.of(9, 30)
LocalTime.parse('09:30:00.500')
LocalTime.midnight()
LocalTime.noon()
time.plus({ minutes: 90 }) // wraps at midnight
time.toMsOfDay()
```

## LocalDateTime

Civil date + time, no zone.

```ts
LocalDateTime.parse('2026-06-01T09:30:00')
LocalDateTime.combine(date, time)
local.toZonedDateTime('Europe/Paris')
local.toZonedDateTime('America/New_York', { disambiguation: 'reject' })
```

## Instant

A point on the UTC timeline. Integer milliseconds.

```ts
Instant.now()
Instant.parse('2026-06-01T12:00:00Z')
Instant.ofEpochMillis(0)
Instant.fromJSDate(new Date())
instant.plus({ hours: 2 })
instant.toZonedDateTime('Asia/Kolkata')
instant.toISO()
instant.toJSDate()
```

Calendar units (`years`, `months`) cannot be added to an Instant.

## ZonedDateTime

`(instant, timeZone)`. Local fields are derived.

```ts
ZonedDateTime.now('America/New_York')
ZonedDateTime.parse('2026-06-01T12:00:00-04:00[America/New_York]')
ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'compatible' })
zdt.plus({ days: 1 })        // calendar math on local fields, then re-zone
zdt.plus({ hours: 3 })       // added to the instant
zdt.withTimeZone('UTC')
zdt.isDST()
zdt.toISO()
```

Disambiguation: `compatible` (default) | `earlier` | `later` | `reject`.

## Duration

```ts
Duration.of({ hours: 2, minutes: 30 })
Duration.parse('P1DT2H')
duration.plus(other)
duration.total('milliseconds') // rejects years/months
duration.toISO()
```

## Interval

An immutable half-open interval `[start, end)`. Endpoints can be any Tempo value with a `compare()` method, including `Instant`, `LocalDate`, and `ZonedDateTime`. Equal endpoints are allowed and form an empty interval.

```ts
import { DateRange, Instant, Interval, LocalDate } from '@chloevpin/tempo';

const start = Instant.parse('2026-06-01T00:00:00Z');
const end = start.plus({ days: 7 });
const interval = Interval.of(start, end);

interval.contains(start);                 // true
interval.contains(end);                   // false
interval.overlaps(other);
interval.abuts(other);
interval.intersection(other);              // Interval | null
interval.union(other);                    // Interval | null

const dates = DateRange.of(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8));
```

`Interval.of` throws `INVALID_INTERVAL` when `end` precedes `start` or endpoints cannot be ordered.

## Interval iteration

```ts
const byDay = [...interval.by('day')];
const monthIter = interval.iterate({ months: 1 });
const subIntervals = interval.split({ days: 2 });
```

`by('day' | 'week' | 'month' | 'year')` yields each endpoint starting at `start`. For `Instant`, month/year steps use the UTC calendar projection from the current local date and time; empty intervals yield nothing.

`iterate(step)` advances by `DurationLike` and yields each endpoint from `start`. `split(step)` returns an array of consecutive half-open sub-intervals covering the original range. Both throw `INVALID_INTERVAL` for zero or negative steps and preserve the original interval.

## Rounding

```ts
Instant.parse('2026-06-01T12:34:36Z').round({ smallestUnit: 'minute' }).toISO();
// '2026-06-01T12:35:00.000Z'

LocalTime.parse('09:30:45.500').round({ smallestUnit: 'minute', roundingMode: 'floor' }).toISO();
// '09:30:00.000'
```

`Instant.round` and `LocalTime.round` support `smallestUnit` of `hour`, `minute`, `second`, or `millisecond` with `roundingMode` of `halfExpand` (default), `ceil`, `floor`, or `trunc`. Instants validate the rounded epoch milliseconds against the supported range; `LocalTime` normalizes day wrap-around.

## Relative time

```ts
import { fromNow, relativeTime } from '@chloevpin/tempo/relative';
fromNow(instant, { locale: 'en' })
```

## Duration list formatting

```ts
import { formatDurationList } from '@chloevpin/tempo/relative';

formatDurationList({ hours: 3, minutes: 4 }, { locale: 'en' });
// '3 hours and 4 minutes'
```

`formatDurationList` joins duration components using `Intl.ListFormat`. The style and locale options follow the underlying formatter defaults.

## Overflow

`constrain` (default for `plus` / `with`) clamps the day into the target month.

`reject` throws `INVALID_MONTH_DAY`.

`LocalDate.of` / ISO `parse` default to `reject`. Custom-token parsing is also strict and uses the same rejection rules.

Custom LocalDate parsing supports numeric `y`/`yyyy`/`uuuu`, `M`/`MM`, `d`/`dd`, and quoted literals. `yy`, localized month names, weekdays, time, offset, and zone tokens are rejected rather than guessed.

## Formatting

```ts
import { format } from '@chloevpin/tempo/format';

format(date, 'yyyy-MM-dd')
format(zdt, "yyyy-MM-dd 'at' HH:mm XXX")
import { toLocaleString } from '@chloevpin/tempo/intl';
toLocaleString(date, 'fr-FR', { dateStyle: 'full' })
```

Tokens: `yyyy MM dd HH hh mm ss SSS a XXX zzzz EEEE MMMM`. Not Moment’s `YYYY`/`DD`. Use the compat adapter for those.

## Moment adapter

```ts
import { moment } from '@chloevpin/tempo/compat/moment';
moment('2026-06-01T00:00:00Z').add(1, 'day').format('YYYY-MM-DD')
```

Immutable. Strict parse. Common methods only. See `docs/MIGRATION.md`.

## Errors

`TempoError` with `code`:

`INVALID_DATE` `INVALID_MONTH_DAY` `INVALID_TIME` `INVALID_DURATION` `INVALID_PARSE` `INVALID_FORMAT` `INVALID_OFFSET` `TIMEZONE_GAP` `TIMEZONE_OVERLAP` `UNKNOWN_TIMEZONE` `OUT_OF_RANGE` `INCOMPATIBLE_UNIT` `INVALID_INTERVAL`

## Clock injection

Production `now()` / `today()` calls use the installed clock. Tests and deterministic applications can inject one explicitly:

```ts
import { resetClock, useFixedClock } from '@chloevpin/tempo';

const restore = useFixedClock(Date.UTC(2026, 5, 1));
// Instant.now(), LocalDate.today(), and ZonedDateTime.now() are deterministic here.
restore();
resetClock();
```

`useClock({ now() { return Date.UTC(2026, 5, 1); } })` installs a custom clock and returns a restore function.

## Public API freeze

The 1.0 candidate keeps the main `@chloevpin/tempo` barrel limited to core and timezone values. Formatting, locale formatting, relative time, Moment compatibility, and Temporal interop remain explicit subpath imports. Runtime export surfaces are covered by `tests/unit/public-api.test.ts`.

Units use singular names (`day`, `week`, `month`, and `year`), matching the TypeScript unions and Temporal-shaped API.

## Clock helpers

```ts
import { useFixedClock, resetClock } from '@chloevpin/tempo';
const restore = useFixedClock(Date.UTC(2026, 5, 1));
// ...
restore();
```
