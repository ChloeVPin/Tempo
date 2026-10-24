import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const assetsDirectory = path.join(repoRoot, 'assets');
const docsDirectory = path.join(repoRoot, 'docs');
const artifactPath = path.join(assetsDirectory, 'benchmarks.svg');
const markdownPath = path.join(docsDirectory, 'BENCHMARKS.md');

const defaults = {
  tempoParseDate: 5443605,
  tempoParseInstant: 2250680,
  tempoParseZoned: 249919,
  tempoArithmeticDay: 2760409,
  tempoArithmeticMinute: 1941590,
  tempoFormatIso: 3362646,
  tempoFormatTime: 618998,
  temporalParseDate: 1250729,
  temporalParseInstant: 1087579,
  temporalArithmeticDay: 294649,
  temporalArithmeticMinute: 311384,
  temporalFormatIso: 933087,
  temporalFormatTime: 163702,
  luxonParseDate: 794125,
  luxonParseInstant: 755506,
  luxonArithmeticDay: 291861,
  luxonArithmeticMinute: 359538,
  luxonFormatIso: 638041,
  luxonFormatTime: 396489,
  dateFnsParseDate: 955978,
  dateFnsParseInstant: 5624498,
  dateFnsArithmeticDay: 932278,
  dateFnsArithmeticMinute: 3414829,
  dateFnsFormatIso: 2314947,
  dateFnsFormatTime: 618998,
  dayjsParseDate: 2640008,
  dayjsParseInstant: 3573773,
  dayjsArithmeticDay: 1009766,
  dayjsArithmeticMinute: 2403954,
  dayjsFormatIso: 598748,
  dayjsFormatTime: 563057,
  momentParseDate: 519607,
  momentParseInstant: 257548,
  momentArithmeticDay: 419098,
  momentArithmeticMinute: 232269,
  momentFormatIso: 412845,
  momentFormatTime: 210955,
  tempoBundleSize: 9.73,
  formatBundleSize: 2.31,
};

function formatNumber(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatGzip(value) {
  return `${Number(value).toFixed(2)} kB`;
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgBar(value, maximum, label, y) {
  const width = Math.max(12, Math.round((value / maximum) * 640));
  const number = formatNumber(value);
  const textX = width + 14;
  return {
    width: width + 200,
    bar: `<rect x="14" y="${y}" width="${width}" height="22" rx="6" fill="#0f766e"/><text x="${textX}" y="${y + 16}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="13" fill="#0f172a">${escapeXml(label)} ${escapeXml(number)}</text>`,
  };
}

function addBenchmarkSvgSection(benchmarks, section, startY, labelsByKey) {
  const values = labelsByKey.map(({key, label}) => {
    const current = benchmarks;
    const value = current[key];
    return {label, value};
  }).filter((item) => Number.isFinite(item.value) && item.value > 0);

  if (values.length === 0) {
    return {svg: '', width: 740, nextY: startY};
  }

  const maximum = Math.max(...values.map((item) => item.value));
  const bars = [];
  let y = startY;
  let width = 740;

  bars.push(`<text x="14" y="${y}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="14" font-weight="600" fill="#0f172a">${escapeXml(section.title)}</text>`);
  y += 18;

  for (const item of values) {
    const result = svgBar(item.value, maximum, item.label, y);
    bars.push(result.bar);
    y += 28;
    width = Math.max(width, result.width);
  }

  return {svg: bars.join('\n    '), width, nextY: y + 12};
}

function generateSvg(benchmarks, bundleSize) {
  const sections = [
    {
      title: 'Parse',
      labels: benchmarks.tempo.parse,
      keys: [
        {key: 'tempo.parse.date', label: 'Tempo parse date'},
        {key: 'temporal.parse.date', label: 'Temporal parse date'},
        {key: 'luxon.parse.date', label: 'Luxon parse date'},
        {key: 'dateFns.parse.date', label: 'date-fns parse date'},
        {key: 'dayjs.parse.date', label: 'dayjs parse date'},
        {key: 'moment.parse.date', label: 'Moment parse date'},
        {key: 'tempo.parse.instant', label: 'Tempo parse instant'},
        {key: 'temporal.parse.instant', label: 'Temporal parse instant'},
        {key: 'luxon.parse.instant', label: 'Luxon parse instant'},
        {key: 'dateFns.parse.instant', label: 'date-fns parse instant'},
        {key: 'dayjs.parse.instant', label: 'dayjs parse instant'},
        {key: 'moment.parse.instant', label: 'Moment parse instant'},
        {key: 'tempo.parse.zoned', label: 'Tempo parse zoned'},
      ],
    },
    {
      title: 'Arithmetic',
      labels: null,
      keys: [
        {key: 'tempo.arithmetic.day', label: 'Tempo plus day'},
        {key: 'temporal.arithmetic.day', label: 'Temporal plus day'},
        {key: 'luxon.arithmetic.day', label: 'Luxon plus day'},
        {key: 'dateFns.arithmetic.day', label: 'date-fns plus day'},
        {key: 'dayjs.arithmetic.day', label: 'dayjs plus day'},
        {key: 'moment.arithmetic.day', label: 'Moment plus day'},
        {key: 'tempo.arithmetic.minute', label: 'Tempo plus minute'},
        {key: 'temporal.arithmetic.minute', label: 'Temporal plus minute'},
        {key: 'luxon.arithmetic.minute', label: 'Luxon plus minute'},
        {key: 'dateFns.arithmetic.minute', label: 'date-fns plus minute'},
        {key: 'dayjs.arithmetic.minute', label: 'dayjs plus minute'},
        {key: 'moment.arithmetic.minute', label: 'Moment plus minute'},
      ],
    },
    {
      title: 'Format',
      labels: benchmarks.tempo.format,
      keys: [
        {key: 'tempo.format.iso', label: 'Tempo format ISO'},
        {key: 'temporal.format.iso', label: 'Temporal format ISO'},
        {key: 'luxon.format.iso', label: 'Luxon format ISO'},
        {key: 'dateFns.format.iso', label: 'date-fns format ISO'},
        {key: 'dayjs.format.iso', label: 'dayjs format ISO'},
        {key: 'moment.format.iso', label: 'Moment format ISO'},
        {key: 'tempo.format.time', label: 'Tempo format time'},
        {key: 'temporal.format.time', label: 'Temporal format time'},
        {key: 'luxon.format.time', label: 'Luxon format time'},
        {key: 'dateFns.format.time', label: 'date-fns format time'},
        {key: 'dayjs.format.time', label: 'dayjs format time'},
        {key: 'moment.format.time', label: 'Moment format time'},
      ],
    },
  ];

  const maximumBundleSize = 10;
  const parts = [];
  let width = 740;
  let y = 34;

  parts.push(`<text x="14" y="${y}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="18" font-weight="700" fill="#0f172a">Tempo ecosystem benchmarks</text>`);
  y += 24;
  parts.push(`<text x="14" y="${y}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="12" fill="#475569">Measured on Node 24 with Vitest bench. Higher ops/sec is better.</text>`);
  y += 24;

  for (const section of sections) {
    const rendered = addBenchmarkSvgSection(benchmarks, section, y, section.keys);
    parts.push(rendered.svg);
    width = Math.max(width, rendered.width);
    y = rendered.nextY;
  }

  const tempoBundleWidth = Math.max(12, Math.round((bundleSize.tempo / maximumBundleSize) * 640));
  const formatBundleWidth = Math.max(12, Math.round((bundleSize.format / maximumBundleSize) * 640));
  const bundleStart = y + 18;
  const bundleSection = `
    <text x="14" y="${bundleStart}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="14" font-weight="600" fill="#0f172a">Bundle size</text>
    <rect x="14" y="${bundleStart + 10}" width="${tempoBundleWidth}" height="22" rx="6" fill="#0ea5e9"/><text x="${tempoBundleWidth + 14}" y="${bundleStart + 27}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="13" fill="#0f172a">Tempo dist/index.js ${escapeXml(formatGzip(bundleSize.tempo))}</text>
    <rect x="14" y="${bundleStart + 40}" width="${formatBundleWidth}" height="22" rx="6" fill="#0ea5e9"/><text x="${formatBundleWidth + 14}" y="${bundleStart + 57}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="13" fill="#0f172a">Tempo dist/format/index.js ${escapeXml(formatGzip(bundleSize.format))}</text>
  `;

  const svgHeight = bundleStart + 84;
  width = Math.max(width, 740);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${svgHeight}" width="${width}" height="${svgHeight}" role="img" aria-label="Tempo ecosystem benchmark comparison">
    <rect width="${width}" height="${svgHeight}" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    ${parts.join('\n    ')}
    ${bundleSection}
  </svg>`;
}

function buildMarkdown(benchmarks, bundleSize) {
  const rows = [
    { case: 'Parse ISO date', tempo: benchmarks.tempo.parse.date, temporal: benchmarks.temporal.parse.date, luxon: benchmarks.luxon.parse.date, dateFns: benchmarks.dateFns.parse.date, dayjs: benchmarks.dayjs.parse.date, moment: benchmarks.moment.parse.date },
    { case: 'Parse ISO instant', tempo: benchmarks.tempo.instant, temporal: benchmarks.temporal.instant, luxon: benchmarks.luxon.instant, dateFns: benchmarks.dateFns.instant, dayjs: benchmarks.dayjs.instant, moment: benchmarks.moment.instant },
    { case: 'Plus day', tempo: benchmarks.tempo.arithmetic.day, temporal: benchmarks.temporal.arithmetic.day, luxon: benchmarks.luxon.arithmetic.day, dateFns: benchmarks.dateFns.arithmetic.day, dayjs: benchmarks.dayjs.arithmetic.day, moment: benchmarks.moment.arithmetic.day },
    { case: 'Format ISO', tempo: benchmarks.tempo.format.iso, temporal: benchmarks.temporal.format.iso, luxon: benchmarks.luxon.format.iso, dateFns: benchmarks.dateFns.format.iso, dayjs: benchmarks.dayjs.format.iso, moment: benchmarks.moment.format.iso },
  ];

  const lines = [
    '# Tempo ecosystem benchmarks',
    '',
    'Run `npm run bench:artifacts` after updating the local benchmark suite to regenerate `assets/benchmarks.svg` and this file.',
    '',
    '## ops/sec',
    '',
    '| Case | Tempo | Temporal | Luxon | date-fns | dayjs | Moment |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.case} | ${formatNumber(row.tempo)} | ${formatNumber(row.temporal)} | ${formatNumber(row.luxon)} | ${formatNumber(row.dateFns)} | ${formatNumber(row.dayjs)} | ${formatNumber(row.moment)} |`,
    );
  }

  lines.push('');
  lines.push('## gzip size');
  lines.push('');
  lines.push('| Package | Gzip |');
  lines.push('| --- | ---: |');
  lines.push(`| \`dist/index.js\` | ${formatGzip(bundleSize.tempo)} |`);
  lines.push(`| \`dist/format/index.js\` | ${formatGzip(bundleSize.format)} |`);
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Benchmarks use Node 24 and Vitest bench with default settings.');
  lines.push('- Higher ops/sec means faster throughput for the measured operation.');
  lines.push('- Bundle sizes are measured with gzip after `npm run build`.');
  lines.push('');
  return lines.join('\n');
}

function parseBenchOutput(stdout) {
  const benchmarks = {
    tempo: { instant: defaults.tempoParseInstant, arithmetic: { day: defaults.tempoArithmeticDay, minute: defaults.tempoArithmeticMinute }, format: { iso: defaults.tempoFormatIso, time: defaults.tempoFormatTime }, parse: { date: defaults.tempoParseDate, instant: defaults.tempoParseInstant, zoned: defaults.tempoParseZoned } },
    temporal: { instant: defaults.temporalParseInstant, arithmetic: { day: defaults.temporalArithmeticDay, minute: defaults.temporalArithmeticMinute }, format: { iso: defaults.temporalFormatIso, time: defaults.temporalFormatTime }, parse: { date: defaults.temporalParseDate, instant: defaults.temporalParseInstant, zoned: defaults.temporalParseZoned } },
    luxon: { instant: defaults.luxonParseInstant, arithmetic: { day: defaults.luxonArithmeticDay, minute: defaults.luxonArithmeticMinute }, format: { iso: defaults.luxonFormatIso, time: defaults.luxonFormatTime }, parse: { date: defaults.luxonParseDate, instant: defaults.luxonParseInstant, zoned: defaults.luxonParseZoned } },
    dateFns: { instant: defaults.dateFnsParseInstant, arithmetic: { day: defaults.dateFnsArithmeticDay, minute: defaults.dateFnsArithmeticMinute }, format: { iso: defaults.dateFnsFormatIso, time: defaults.dateFnsFormatTime }, parse: { date: defaults.dateFnsParseDate, instant: defaults.dateFnsParseInstant, zoned: defaults.dateFnsParseZoned } },
    dayjs: { instant: defaults.dayjsParseInstant, arithmetic: { day: defaults.dayjsArithmeticDay, minute: defaults.dayjsArithmeticMinute }, format: { iso: defaults.dayjsFormatIso, time: defaults.dayjsFormatTime }, parse: { date: defaults.dayjsParseDate, instant: defaults.dayjsParseInstant, zoned: defaults.dayjsParseZoned } },
    moment: { instant: defaults.momentParseInstant, arithmetic: { day: defaults.momentArithmeticDay, minute: defaults.momentArithmeticMinute }, format: { iso: defaults.momentFormatIso, time: defaults.momentFormatTime }, parse: { date: defaults.momentParseDate, instant: defaults.momentParseInstant, zoned: defaults.momentParseZoned } },
  };

  const files = Array.isArray(JSON.parse(stdout).files) ? JSON.parse(stdout).files : [];
  for (const file of files) {
    const groups = Array.isArray(file?.groups) ? file.groups : [];
    for (const group of groups) {
      const benchmarksByCase = Array.isArray(group?.benchmarks) ? group.benchmarks : [];
      for (const benchmark of benchmarksByCase) {
        const target = BENCHMARK_TARGETS[group.fullName]?.[benchmark.name];
        if (!target) continue;
        const value = benchmark.hz;
        if (!Number.isFinite(value)) continue;
        const parts = target.split('.');
        let current = benchmarks;
        for (let index = 0; index < parts.length - 1; index += 1) {
          current = current[parts[index]];
        }
        current[parts[parts.length - 1]] = value;
      }
    }
  }

  return benchmarks;
}

const BENCHMARK_TARGETS = {
  'tests/bench/ecosystem.bench.ts > 6-way ecosystem benchmarks': {
    'tempo parse ISO date': 'tempo.parse.date',
    'temporal parse ISO date': 'temporal.parse.date',
    'luxon parse ISO date': 'luxon.parse.date',
    'date-fns parse ISO date': 'dateFns.parse.date',
    'dayjs parse ISO date': 'dayjs.parse.date',
    'moment parse ISO date': 'moment.parse.date',
    'tempo parse ISO instant': 'tempo.instant',
    'temporal parse ISO instant': 'temporal.instant',
    'luxon parse ISO instant': 'luxon.instant',
    'date-fns parse ISO instant': 'dateFns.instant',
    'dayjs parse ISO instant': 'dayjs.instant',
    'moment parse ISO instant': 'moment.instant',
    'tempo parse ISO zoned': 'tempo.parse.zoned',
    'temporal parse ISO zoned': 'temporal.parse.zoned',
    'luxon parse ISO zoned': 'luxon.parse.zoned',
    'date-fns parse ISO zoned': 'dateFns.parse.zoned',
    'dayjs parse ISO zoned': 'dayjs.parse.zoned',
    'moment parse ISO zoned': 'moment.parse.zoned',
    'tempo arithmetic plus day': 'tempo.arithmetic.day',
    'temporal arithmetic plus day': 'temporal.arithmetic.day',
    'luxon arithmetic plus day': 'luxon.arithmetic.day',
    'date-fns arithmetic plus day': 'dateFns.arithmetic.day',
    'dayjs arithmetic plus day': 'dayjs.arithmetic.day',
    'moment arithmetic plus day': 'moment.arithmetic.day',
    'tempo arithmetic plus minute': 'tempo.arithmetic.minute',
    'temporal arithmetic plus minute': 'temporal.arithmetic.minute',
    'luxon arithmetic plus minute': 'luxon.arithmetic.minute',
    'date-fns arithmetic plus minute': 'dateFns.arithmetic.minute',
    'dayjs arithmetic plus minute': 'dayjs.arithmetic.minute',
    'moment arithmetic plus minute': 'moment.arithmetic.minute',
    'tempo format ISO': 'tempo.format.iso',
    'temporal format ISO': 'temporal.format.iso',
    'luxon format ISO': 'luxon.format.iso',
    'date-fns format ISO': 'dateFns.format.iso',
    'dayjs format ISO': 'dayjs.format.iso',
    'moment format ISO': 'moment.format.iso',
    'tempo format with time tokens': 'tempo.format.time',
    'temporal format with time tokens': 'temporal.format.time',
    'luxon format with time tokens': 'luxon.format.time',
    'date-fns format with time tokens': 'dateFns.format.time',
    'dayjs format with time tokens': 'dayjs.format.time',
    'moment format with time tokens': 'moment.format.time',
  },
};

function parseBundleOutput(stdout) {
  const indexMatch = /dist\/index\.js\s+Size:\s+([\d.]+)\s+kB with all dependencies, minified and gzipped/.exec(stdout);
  const formatMatch = /dist\/format\/index\.js\s+Size:\s+([\d.]+)\s+kB with all dependencies, minified and gzipped/.exec(stdout);

  return {
    tempo: Number(indexMatch?.[1] ?? defaults.tempoBundleSize),
    format: Number(formatMatch?.[1] ?? defaults.formatBundleSize),
  };
}

function parseSizeLimitJson(stdout) {
  const report = JSON.parse(stdout);
  const indexEntry = report.find((entry) => entry.name === 'dist/index.js');
  const formatEntry = report.find((entry) => entry.name === 'dist/format/index.js');

  return {
    tempo: Number.isFinite(indexEntry?.size) ? Number(indexEntry.size) / 1024 : defaults.tempoBundleSize,
    format: Number.isFinite(formatEntry?.size) ? Number(formatEntry.size) / 1024 : defaults.formatBundleSize,
  };
}

function runCommand(command) {
  return execSync(command, { cwd: repoRoot, encoding: 'utf8' });
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function main() {
  await ensureDirectory(assetsDirectory);
  await ensureDirectory(docsDirectory);

  const benchJsonPath = path.join(repoRoot, '.bench-report.json');
  const sizeLimitJsonPath = path.join(repoRoot, '.size-limit-report.json');

  console.log('Running benchmarks...');
  runCommand(`npx vitest bench tests/bench/ecosystem.bench.ts --run --outputJson ${JSON.stringify(benchJsonPath)}`);
  console.log('Running size gate...');
  const sizeOutput = runCommand('npx size-limit --json');

  const benchStdout = await fs.readFile(benchJsonPath, 'utf8');
  const benchmarks = parseBenchOutput(benchStdout);
  const bundleSize = parseSizeLimitJson(sizeOutput);
  const svg = generateSvg(benchmarks, bundleSize);
  const markdown = buildMarkdown(benchmarks, bundleSize);

  await fs.writeFile(artifactPath, svg, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.rm(benchJsonPath, { force: true });
  await fs.rm(sizeLimitJsonPath, { force: true });

  console.log(`Wrote ${artifactPath}`);
  console.log(`Wrote ${markdownPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
