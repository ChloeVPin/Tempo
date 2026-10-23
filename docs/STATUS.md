# Implementation status

Last updated: 2026-08-15 (release-polish audit). Update a row when you land or delete the file.

Legend: **done** = implemented + at least one test · **partial** = exists, thin tests or known gaps · **missing** = not in tree · **n/a** = decided against for v1

## Source

| Path | Status | Tests | Notes |
|---|---|---|---|
| `src/errors.ts` | done | indirect | `TempoError` + `ParseResult` |
| `src/types.ts` | done | excluded from coverage | Shared unions |
| `src/clock.ts` | done | `tests/unit/intl.test.ts` | `useFixedClock` |
| `src/index.ts` | done | excluded | Main barrel: core + tz only; format/intl/relative are subpath entries (WP5) |
| `src/core/civil.ts` | done | `civil.test.ts`, property | **Must use `truncDiv`** |
| `src/core/range.ts` | done | via civil/instant | ES Date bounds |
| `src/core/overflow.ts` | partial | via LocalDate | `requireInteger` / `requireFinite` barely used |
| `src/core/compare.ts` | done | `compare.test.ts` | `isBetween` + `compareValues`; no longer excluded |
| `src/core/duration.ts` | done | `duration.test.ts` | ISO parse + `total()`; sub-second fields normalize at construction so `toISO`/`toJSON` round-trip; fractional weeks keep sub-day remainder; `tryParse` never throws |
| `src/core/interval.ts` | done | `interval.test.ts` | Generic immutable half-open intervals; `DateRange` factory |
| `src/core/local-date.ts` | done | `local-date.test.ts` | 1-based months |
| `src/core/local-time.ts` | done | `local-time.test.ts` | Wraps at midnight |
| `src/core/local-datetime.ts` | done | `local-datetime.test.ts` | `until` calendar units ignore time |
| `src/core/instant.ts` | done | `instant.test.ts` | Needs zone factory for `toZonedDateTime` |
| `src/tz/types.ts` | done | excluded | `getPossibleInstants`, not Offsets |
| `src/tz/offset.ts` | done | `zoned.test.ts` | `parseOffset` + `formatOffset` styles + fixed-offset ids |
| `src/tz/intl-provider.ts` | done | golden + zoned | Cached Intl |
| `src/tz/disambiguate.ts` | done | `zoned.test.ts` | 3–48h probe windows |
| `src/tz/zoned-datetime.ts` | done | `zoned.test.ts` | Registers factories at load |
| `src/tz/fixed-offset.ts` | n/a | — | Folded into offset + provider |
| `src/tz/provider.ts` | n/a | — | Interface lives in `types.ts` |
| `src/iso/format.ts` | partial | excluded | Thin `toISO()` wrapper |
| `src/iso/parse.ts` | missing | — | Parse lives on each type |
| `src/iso/scan.ts` | missing | — | Aspirational |
| `src/format/tokens.ts` | done | `format.test.ts` | |
| `src/format/format.ts` | done | `format.test.ts` | In-module token cache; weekday via civil math (no `Date.UTC` 0–99 drift); localized day-period token |
| `src/format/parse.ts` | done | `custom-parse.test.ts` | Custom LocalDate parser is now lazy/registered so core barrel avoids compiler imports |
| `src/format/compiler.ts` | n/a | — | Not a separate file |
| `src/intl/*` | done | `intl.test.ts` | Civil years route through `utcMillis`, not `Date.UTC` |
| `src/relative/relative-time.ts` | partial | `relative.test.ts` | One case |
| `src/compat/moment.ts` | done | `compat-moment.test.ts`, Moment differential | Common subset only; oracle-tested against pinned Moment packages |
| `src/compat/format-map.ts` | done | via compat | Moment → Tempo tokens |
| `src/temporal/interop.ts` | done | `temporal-interop.test.ts` | Fake-`globalThis.Temporal`; no longer excluded |

## Tests

| Path | Status | Role |
|---|---|---|
| `tests/unit/*.test.ts` | done | Contract examples |
| `tests/property/civil.property.test.ts` | done | Round-trip, inverse days, month bounds |
| `tests/golden/timezone.golden.test.ts` | done | 8 baseline + 26 transition rows; ICU-history-guarded Apia / São Paulo 2018 |
| `tests/unit/civil-walk.test.ts` | done | 73,414-day walk 1900-01-01..2100-12-31 |
| `tests/helpers/intl-history.ts` | done | Direct-Intl probe; decides ICU-history skips |
| `tests/fuzz/parse.fuzz.test.ts` | done | 4 suites; TempoError-only crash guard + whole-property wall-clock DoS budget |
| `tests/bench/core.bench.ts` | done | Core microbenchmarks; not in CI |
| `tests/bench/moment.bench.ts` | done | Same-process Tempo vs pinned `moment@2.30.1`; not in CI |
| `tests/differential/temporal.test.ts` | done | Skip-safe; passes 6/6 vs pinned polyfill in CI |
| `tests/differential/luxon.test.ts` | done | 8 non-ambiguous cases vs `luxon@3.7.2` |
| `tests/differential/date-fns.test.ts` | done | 7 non-ambiguous cases vs `date-fns@4.4.0` |
| `tests/differential/moment.test.ts` | done | 6 deterministic compat cases vs `moment@2.30.1` + `moment-timezone@0.5.48` |
| `tests/unit/interval.test.ts` | done | Half-open containment, invalid order, overlap/abut/intersection/union, LocalDate range |
| `tests/unit/custom-parse.test.ts` | done | Strict numeric custom-token parsing and rejection paths |
| `tests/unit/public-api.test.ts` | done | Main-barrel and exact documented subpath export contract |
| `tests/unit/compare.test.ts` | done | `isBetween` inclusivity matrix |
| `tests/unit/temporal-interop.test.ts` | done | Fake Temporal round-trips + error paths |
| `tests/runtime/bun-smoke.ts` | done | Bun runs TS source; verified locally (bun 1.3.14) |
| `tests/runtime/deno-smoke.mjs` | done | Deno imports built ESM; CI job |
| `tests/runtime/browser-smoke.mjs` | done | Playwright + system Chrome; verified locally |

## Tooling

| Path | Status |
|---|---|
| `package.json` / lockfile | done |
| `tsconfig.json` (strict, NodeNext, verbatimModuleSyntax) | done |
| `tsup.config.ts` (multi-entry ESM+CJS+dts) | done |
| `vitest.temporal.config.ts` | done | Differential-only config; injects pinned polyfill |
| `vitest.config.ts` | done | Thresholds 74/62/72 (lines/functions/branches); excludes: index.ts, iso/format.ts, types.ts, tz/types.ts |
| `vitest.mutation.config.ts` | done | Scoped suites for Stryker runs on `src/core/civil.ts` |
| `stryker.config.json` | done | Mutates `src/core/civil.ts`; TS checker; **~89–91% across local runs** (see `docs/TESTING.md`) |
| `eslint.config.js` | done | Runtime-smoke globals for `tests/runtime/**` |
| `.github/workflows/ci.yml` | done | Node matrix + coverage + build/size + temporal-diff + bun/deno/playwright smokes |
| size-limit on `dist/index.js` and `dist/format/index.js` | done |
| npm publish | done | `@chloevpin/tempo@1.0.0` published; registry install resolution verified |

## Docs

| Path | Role |
|---|---|
| `AGENTS.md` | Agent entry |
| `docs/HANDOFF.md` | Takeover brief |
| `docs/STATUS.md` | This file |
| `docs/INVARIANTS.md` | Locked behaviors |
| `docs/WORK-PACKAGES.md` | Next jobs |
| `docs/DESIGN.md` | Why |
| `docs/ARCHITECTURE.md` | Where (must match `src/`) |
| `docs/ROADMAP.md` | Phases |
| `docs/API.md` | Public API sketch |
| `docs/MIGRATION.md` | Moment mapping |
| `docs/TESTING.md` | Test philosophy |
| `docs/RESEARCH.md` | Mid-2026 Moment landscape (background only) |
