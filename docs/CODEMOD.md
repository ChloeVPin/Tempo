# Tempo Codemod

The Tempo codemod rewrites Moment.js and moment-timezone usage into idiomatic Tempo code or `@chloevpin/tempo/compat/moment` adapter calls. Use it to automate the first, mechanical steps of migration while reviewing type-separation and parser changes by hand.

## Install

Tempo ships the codemod CLI with the main package. You do not need a separate install:

```sh
node tools/codemod/bin.js --help
```

Because the codemod transforms source files in place, treat it like any other migration tool: run it on a clean git checkout, review the diff, and commit separately.

## Usage

```sh
node tools/codemod/bin.js <path>
node tools/codemod/bin.js --dry-run src/
```

### Flags

| Flag | Behavior |
| --- | --- |
| `<path>` | File or directory to transform. |
| `--dry-run` | Print transformed files without writing to disk. |
| `--help` | Print the usage message. |

When `<path>` is a directory, the codemod walks only files with `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, and `.cjs` extensions. It skips `.git`, `node_modules`, `dist`, and `coverage` automatically.

The CLI prints summary counts after each target:

```text
transformed /Users/you/project/src/calendar.ts
processed 1, transformed 1
```

## Supported transforms

The codemod applies two passes, in order:

1. **Import rewrite**: replaces default `import moment from 'moment'` with `import { moment } from '@chloevpin/tempo/compat/moment'`; rewrites `require('moment')` to `require('@chloevpin/tempo/compat/moment')` and preserves aliases such as `import m from 'moment'`.
2. **Call rewrite**: rewrites common Moment call chains to Tempo core or adapter syntax. Supported methods today include `.format()`, `.add()`, `.subtract()`, `.diff()`, and `.utc()`.

A full Moment migration still requires manual review for type selection (`Instant`, `LocalDate`, `ZonedDateTime`, etc.), strict ISO parsing, DST disambiguation, and token changes. The codemod removes the mechanical `moment` dependency and gives you executable Tempo-shaped code to finish by hand.

### Examples

```js
// Before
import moment from 'moment';

moment('2026-06-01').format('YYYY-MM-DD');
moment('2026-01-31').add(1, 'month').format('YYYY-MM-DD');
moment('2026-06-01 10:00').toISOString();
moment().utc().format();
```

```js
// After codemod
import { format } from '@chloevpin/tempo/format';
import { LocalDate, LocalDateTime, ZonedDateTime } from '@chloevpin/tempo';

format(LocalDate.parse('2026-06-01'), 'yyyy-MM-dd');
format(LocalDate.parse('2026-01-31').plus({ months: 1 }), 'yyyy-MM-dd');
format(LocalDateTime.parse('2026-06-01T10:00:00'), "yyyy-MM-dd HH:mm:ss 'Z'");
ZonedDateTime.now('UTC').format("yyyy-MM-dd HH:mm:ss 'Z'");
```

For a guided migration checklist, see [docs/MIGRATION.md](MIGRATION.md).

## Tips

- Run the codemod with `--dry-run` first and inspect the full transformed content before writing changes.
- After rewriting imports, run `npm install @chloevpin/tempo` and remove `moment` and `moment-timezone` if they are no longer needed.
- Treat `.diff()` rewrites carefully: Tempo's `until` direction is `other - value`; compat preserves Moment's `this - other`, but native Tempo requires explicit direction review.
