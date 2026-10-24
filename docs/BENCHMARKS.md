# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,226,755 | 1,280,840 | 796,484 | 975,693 | 2,622,093 | 546,193 |
| Parse ISO instant | 2,211,813 | 805,250 | 755,062 | 5,661,148 | 3,529,536 | 256,400 |
| Plus day | 2,827,639 | 305,075 | 355,216 | 941,802 | 1,027,359 | 445,333 |
| Format ISO | 3,287,286 | 1,037,683 | 720,335 | 2,443,794 | 617,251 | 449,664 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
