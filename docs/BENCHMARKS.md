# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,376 | 3,444 | 2,955 | 3,098 | 2,855 | 561 |
| Parse ISO instant | 2,268 | 2,274 | 1,471 | 1,855 | 1,382 | 247 |
| Plus day | 2,866 | 1,988 | 2,524 | 1,484 | 1,731 | 484 |
| Format ISO | 3,328 | 2,185 | 2,296 | 2,375 | 2,416 | 414 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.96 kB |
| `dist/format/index.js` | 2.36 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
