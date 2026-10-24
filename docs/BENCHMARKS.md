# Tempo ecosystem benchmarks

Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.

## ops/sec

| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Parse ISO date | 5,292,689 | 1,212,622 | 757,425 | 951,875 | 2,426,729 | 453,170 |
| Parse ISO instant | 2,250,680 | 1,087,579 | 755,506 | 5,624,498 | 3,573,773 | 257,548 |
| Parse local zoned | 212,424 | 597,332 | 110,613 | 5,639,947 | 3,523,080 | 255,391 |
| Plus day | 2,878,733 | 309,604 | 340,742 | 921,878 | 1,015,770 | 446,158 |
| Plus minute | 1,930,282 | 322,681 | 351,933 | 3,269,818 | 2,316,853 | 220,578 |
| Format ISO | 3,276,325 | 813,625 | 717,195 | 2,534,973 | 592,295 | 421,279 |
| Format with time tokens | 2,207,541 | 157,873 | 394,736 | 614,342 | 560,782 | 208,009 |

## gzip size

| Package | Gzip |
| --- | ---: |
| `dist/index.js` | 9.73 kB |
| `dist/format/index.js` | 2.31 kB |

## Notes

- Benchmarks use Node 24 and Vitest bench with default settings.
- Higher ops/sec means faster throughput for the measured operation.
- Bundle sizes are measured with gzip after `npm run build`.
