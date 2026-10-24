# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,350,379 | 1,146,795 | 722,416 | 966,750 | 2,632,451 | 537,281 |
| Parse ISO instant | 2,250,680 | 1,087,579 | 755,506 | 5,624,498 | 3,573,773 | 257,548 |
| Parse ISO zoned | 201,445 | 643,461 | 116,075 | 5,595,965 | 3,528,319 | 253,308 |
| Plus day | 2,857,008 | 302,569 | 354,075 | 932,770 | 1,015,094 | 443,304 |
| Plus minute | 1,911,517 | 314,601 | 353,015 | 3,383,049 | 2,390,784 | 221,831 |
| Format ISO | 3,358,151 | 1,027,989 | 718,224 | 2,504,605 | 629,033 | 441,427 |
| Format with time tokens | 618,998 | 163,579 | 381,714 | 610,702 | 523,043 | 208,026 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
