# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,213,625 | 1,219,793 | 770,612 | 950,757 | 2,571,814 | 521,540 |
| Parse ISO instant | 2,250,680 | 1,087,579 | 755,506 | 5,624,498 | 3,573,773 | 257,548 |
| Parse local zoned | 245,513 | 677,253 | 111,658 | 5,499,879 | 3,291,741 | 250,329 |
| Plus day | 2,804,007 | 217,488 | 346,644 | 922,359 | 1,012,382 | 429,390 |
| Plus minute | 1,881,128 | 295,807 | 347,721 | 3,294,861 | 2,314,029 | 226,833 |
| Format ISO | 3,097,104 | 993,406 | 635,537 | 2,188,969 | 620,571 | 438,934 |
| Format with time tokens | 2,155,385 | 140,819 | 383,812 | 593,685 | 546,298 | 207,555 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
