# Tempo

Tempo is an immutable date and time library for JavaScript and TypeScript. Its core types follow Temporal concepts, parsing is strict by default, and optional entry points provide formatting, time zones, relative time, Temporal helpers, and Moment compatibility.

## Install

```sh
npm install @chloevpin/tempo
```

## Example

```ts
import { Instant, Interval, LocalDate } from '@chloevpin/tempo';

const date = LocalDate.parse('2026-06-01').plus({ days: 1 });
date.toISO(); // '2026-06-02'

const instant = Instant.parse('2026-06-01T16:00:00Z');
const week = Interval.of(instant, instant.plus({ days: 7 }));
week.contains(instant); // true
```

The package also exports `LocalTime`, `LocalDateTime`, `ZonedDateTime`, `Duration`, and optional subpaths such as `@chloevpin/tempo/format` and `@chloevpin/tempo/tz`. See [docs/API.md](docs/API.md) for the supported surface.

Invalid ISO values throw a `TempoError`; use the `tryParse` methods when a failed parse should be represented as data.

## Develop and test

```sh
npm install
npm run build
npm test
npm run typecheck
npm run lint
```

Additional size, benchmark, and mutation commands are listed in [package.json](package.json). Compatibility behavior and migration guidance are documented in [docs/MIGRATION.md](docs/MIGRATION.md). For a visual walkthrough of native `Date`, `@formkit/tempo`, Moment, and core Tempo failure modes, see [docs/WHY-TEMPO.md](docs/WHY-TEMPO.md).

## License

Tempo is available under the [MIT license](LICENSE).
