# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 155,339 | 0 | 0 | 0 | 0 | 0 |
| Parse ISO instant | 122,413 | 0 | 0 | 0 | 0 | 0 |
| Plus day | 74,465 | 0 | 0 | 0 | 0 | 0 |
| Format ISO | 117,127 | 0 | 0 | 0 | 0 | 0 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
