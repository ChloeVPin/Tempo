# Why Tempo?

Most JavaScript date bugs come from one mistake: treating time as a single number or a mutable bag of strings. Native `Date`, `@formkit/tempo`, Moment, and even many later wrappers carry different versions of the same footguns. Tempo replaces those assumptions with separate, immutable value types, strict ISO parsing, predictable civil math, and an Intl-first timezone engine.

## The 3 breakages this guide reproduces

| Failure mode | Reproduces with |
|---|---|
| Midnight shift | `2026-03-08` in `America/New_York` |
| Month-end overflow | Adding 1 month to January 31st |
| Week-year error | Formatting early January with `YYYY` |

Each section below shows the bug, why it happens, and the Tempo answer.

## Timeline diagram

```text
JS Date / Moment
----------------
Date            -> mutable object
moment(string)  -> heuristics + invalid-date objects
month()         -> 0-based
add(1, 'month') -> can overflow into next month

Tempo
-----
Instant                  -> epoch millisecond timeline value
LocalDate / LocalTime    -> calendar-only values
LocalDateTime            -> calendar value without a zone
ZonedDateTime            -> calendar value + zone + disambiguation
plus / minus / with      -> returns new values
```

## Comparison matrix

```text
                     | Native Date | @formkit/tempo | Moment | Tempo core |
|---------------------|-------------|----------------|--------|------------|
| Separate types      | no          | no             | no     | yes        |
| Immutable API       | no          | yes            | no     | yes        |
| Strict ISO default  | no          | no             | no     | yes        |
| Month-end safety    | no          | yes            | no     | yes        |
| DST policy control  | no          | no             | no     | yes        |
| Zero runtime deps   | n/a         | yes            | no     | yes        |
```

## 1. Midnight shift

### What breaks

`2018-11-04` at midnight in `America/Sao_Paulo` is the spring-forward gap. Local midnight does not exist, so wrappers that silently resolve it can return a shifted instant.

```js
// Native Date
new Date('2018-11-04T03:00:00-03:00').toISOString();
// => 2018-11-04T06:00:00.000Z

// @formkit/tempo
import * as t from '@formkit/tempo';
t.addMonth(t.date('2018-11-04T03:00:00-03:00'), 1).toISOString();
// => 2018-12-04T02:00:00.000Z

// Moment
import moment from 'moment';
import 'moment-timezone';
moment.tz('2018-11-04', 'America/Sao_Paulo').format();
// => 2018-11-04T00:00:00-03:00

// Tempo
import { ZonedDateTime } from '@chloevpin/tempo';
ZonedDateTime.parse('2018-11-04T00:00:00-03:00[America/Sao_Paulo]').toISO();
// => 2018-11-04T00:00:00-03:00[America/Sao_Paulo]
// A missing local time must be resolved explicitly:
ZonedDateTime.fromLocal(LocalDateTime.of(2018, 11, 4, 1, 30), 'America/Sao_Paulo', { disambiguation: 'later' }).toISO();
// => '2018-11-04T03:00:00-02:00[America/Sao_Paulo]'
```

### Why it happens

`Date` and wrappers built on local midnight parsing do not expose the missing-hour problem. Moment's local time object prints a wall-clock representation that can hide the instant shift. Inconsistent local-to-instant conversion makes scheduler tests pass on one machine and fail on another.

### Tempo answer

Use the type that matches the domain. `Instant` is an absolute millisecond value. `ZonedDateTime` makes the zone explicit and lets you choose the missing-time policy instead of relying on the runtime.

## 2. Month-end overflow

### What breaks

Adding 1 month to January 31 should land on February 28 or March 3 depending on library rules. If your API silently overflows to March, payroll, invoices, and renewal reminders all drift.

```js
// Native Date
const date = new Date('2026-01-31');
date.setMonth(date.getMonth() + 1);
date.toISOString().slice(0, 10);
// => '2026-03-03'

// Moment
import moment from 'moment';
moment('2026-01-31').add(1, 'month').format('YYYY-MM-DD');
// => '2026-02-28'

// @formkit/tempo
import * as t from '@formkit/tempo';
t.date('2026-01-31').addMonth(1).toISO();
// => '2026-03-03'

// Tempo
import { LocalDate } from '@chloevpin/tempo';
LocalDate.parse('2026-01-31').plus({ months: 1 }).toISO();
// => '2026-02-28'
```

### Why it happens

Mutable `Date` and many wrappers mutate the existing object, then normalize the broken month count. The bug is especially expensive because the failure looks like valid calendar data.

### Tempo answer

Core Tempo months are 1-12, immutable values are returned from arithmetic, and month-end arithmetic constrains by default. You do not need to remember to clone or clamp the result yourself.

## 3. Week-year error

### What breaks

Tempo supports ISO week-date inspection through `LocalDate.isoWeekYear()`, `LocalDate.isoWeek()`, and `LocalDate.ofIsoWeek(...)`, but core formatting never treats `YYYY` as week-year. Instead, `YYYY` is an unrecognized token and is rendered literally, so `format(LocalDate.parse('2026-01-01'), 'YYYY')` returns `YYYY`, not `2025`.

```js
// Moment
import moment from 'moment';
moment('2026-01-01').format('YYYY');
// => '2026'

// Tempo core
import { LocalDate } from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';
format(LocalDate.parse('2026-01-01'), 'YYYY');
// => 'YYYY'
```

### Why it happens

JavaScript date formatting mixes ISO week-date tokens, calendar-year tokens, and zero-based months. When a docs sample or existing codebase assumes `YYYY` is safe everywhere, January boundaries become silent regressions.

### Tempo answer

Core Tempo formatting uses calendar-year tokens by default. The Moment compatibility adapter maps legacy tokens for migration, but new code should use core tokens like `yyyy-MM-dd`. That keeps the intent explicit and avoids week-year surprises.

## Tempo failure modes

```text
Tempo types:
  - Instant: immutable epoch millisecond
  - LocalDate: calendar date without time or zone
  - LocalTime: time-of-day without a date or zone
  - LocalDateTime: date and time without a zone
  - ZonedDateTime: date, time, zone, and disambiguation policy
  - Duration: fixed duration used for arithmetic and rounding

Failure modes Tempo avoids:
  - mutable state from shared Date instances
  - native Date.parse fallback in strict parse paths
  - month-end overflow by default
  - silent local-midnight conversion in Instant boundaries
  - invalid-date objects in normal flow
  - global locale mutation
  - bundled IANA tzdata in core
```

## The 3 takeaways

1. Use the value type that matches the domain.
2. Expect immutable returns from `plus`, `minus`, `with`, and `round`.
3. Choose explicit zones and tokens instead of relying on host defaults.
