# Tempo

[![npm](https://img.shields.io/npm/v/@chloevpin/tempo.svg)](https://www.npmjs.com/package/@chloevpin/tempo)
[![npm downloads](https://img.shields.io/npm/dm/@chloevpin/tempo.svg)](https://www.npmjs.com/package/@chloevpin/tempo)
[![GitHub stars](https://img.shields.io/github/stars/ChloeVPin/tempo.svg?style=social)](https://github.com/ChloeVPin/tempo)

Tempo is an immutable date and time library for JavaScript and TypeScript. Its core types follow Temporal concepts, parsing is strict by default, and optional entry points provide formatting, time zones, relative time, Temporal helpers, and Moment compatibility.

![Benchmark dashboard](assets/benchmarks.svg)

## Why Tempo?

Most JavaScript date bugs come from one mistake: treating time as a single number or a mutable bag of strings. Native `Date`, `@formkit/tempo`, Moment, and many later wrappers carry different versions of the same footguns. Tempo replaces those assumptions with separate, immutable value types, strict ISO parsing, predictable civil math, and an Intl-first timezone engine.

If you need a migration path from Moment, `@chloevpin/tempo/compat/moment` keeps the transition to idiomatic Tempo incremental. For a visual walkthrough of why native `Date`, `@formkit/tempo`, Moment, and core Tempo behave differently, see [docs/WHY-TEMPO.md](docs/WHY-TEMPO.md).

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

## Benchmarks

Tempo is built for real throughput. The 6-way ecosystem benchmark compares parse, arithmetic, and formatting across `Tempo`, `@js-temporal/polyfill`, `luxon`, `date-fns`, `dayjs`, and `moment` using Node 24 + Vitest bench.

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,288,330 | 1,237,404 | 778,395 | 964,763 | 2,612,605 | 517,169 |
| Parse ISO instant | 2,199,765 | 1,031,709 | 735,862 | 5,554,435 | 3,491,133 | 252,741 |
| Parse local zoned | 243,410 | 704,368 | 115,689 | 5,566,244 | 3,482,185 | 253,593 |
| Plus day | 2,846,542 | 299,160 | 350,878 | 937,399 | 1,009,225 | 430,318 |
| Plus minute | 1,904,049 | 315,923 | 351,855 | 3,345,155 | 2,310,243 | 224,000 |
| Format ISO | 3,250,918 | 783,962 | 705,709 | 2,449,670 | 611,781 | 435,522 |
| Format with time tokens | 2,216,754 | 160,448 | 388,155 | 600,968 | 547,379 | 212,280 |

Run `npm run bench:artifacts` to regenerate `assets/benchmarks.svg` and [docs/BENCHMARKS.md](docs/BENCHMARKS.md).

## Bundle size

| Package | gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

Run `npm run size` to verify the package-size gates on your machine.

## Comparison

| | Native Date | @formkit/tempo | Moment | Tempo core |
| --- | --- | --- | --- | --- |
| Separate types | no | no | no | yes |
| Immutable API | no | yes | no | yes |
| Strict ISO default | no | no | no | yes |
| Month-end safety | no | yes | yes | yes |
| DST policy control | no | no | no | yes |
| Zero runtime deps | n/a | yes | yes | yes |

## Playground

[Try the interactive Web Playground](http://127.0.0.1:3100) or run `npm run dev:demo` to inspect live ISO parsing, format tokens, and DST disambiguation behavior.

![Web playground](assets/demo-playground.png)
![DST simulator](assets/demo-dst-simulator.png)

See [docs/CODEMOD.md](docs/CODEMOD.md) for the codemod guide.

## Terminal showcase

```sh
node bin/showcase.mjs
```

The terminal showcase walks through type separation, zero-dependency civil math, timezone conversion, and an ASCII DST diagram in your local terminal.

## Migrate from Moment

Tempo is a clean break. The core API is Temporal-shaped, immutable, and strict. If you need a stepping stone, use `@chloevpin/tempo/compat/moment` for the common 20 methods, then delete it.

1. Inventory `moment` / `moment-timezone` imports and mutable usage.
2. Swap leaf files to `@chloevpin/tempo/compat/moment`.
3. Replace `format` / `add` / `diff` / `toISOString` with core types.
4. Replace `moment.tz` with `ZonedDateTime`.
5. Delete the adapter.

See [docs/CODEMOD.md](docs/CODEMOD.md) for the codemod guide and [docs/MIGRATION.md](docs/MIGRATION.md) for the full migration walkthrough, and [docs/WHY-TEMPO.md](docs/WHY-TEMPO.md) for the breakage guide.

## Develop and test

```sh
npm install
npm run build
npm test
npm run typecheck
npm run lint
npm run dev:demo
```

The playground serves at `http://127.0.0.1:3100`; stop it when you’re done. Additional size, benchmark, and mutation commands are listed in [package.json](package.json). Compatibility behavior and migration guidance are documented in [docs/MIGRATION.md](docs/MIGRATION.md). For a visual walkthrough of native `Date`, `@formkit/tempo`, Moment, and core Tempo failure modes, see [docs/WHY-TEMPO.md](docs/WHY-TEMPO.md).

## License

Tempo is available under the [MIT license](LICENSE).
