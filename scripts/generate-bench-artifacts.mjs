import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const assetsDirectory = path.join(repoRoot, 'assets');
const docsDirectory = path.join(repoRoot, 'docs');
const artifactPath = path.join(assetsDirectory, 'benchmarks.svg');
const markdownPath = path.join(docsDirectory, 'BENCHMARKS.md');

const defaults = {
  tempoParseDate: 5376,
  tempoParseInstant: 2268,
  tempoParseZoned: 1708,
  tempoArithmeticDay: 2866,
  tempoArithmeticMinute: 1492,
  tempoFormatIso: 3328,
  tempoFormatTime: 1615,
  temporalParseDate: 3444,
  temporalParseInstant: 2274,
  temporalArithmeticDay: 1988,
  temporalArithmeticMinute: 716,
  temporalFormatIso: 2185,
  temporalFormatTime: 1524,
  luxonParseDate: 2955,
  luxonParseInstant: 1471,
  luxonArithmeticDay: 2524,
  luxonArithmeticMinute: 846,
  luxonFormatIso: 2296,
  luxonFormatTime: 816,
  dateFnsParseDate: 3098,
  dateFnsParseInstant: 1855,
  dateFnsArithmeticDay: 1484,
  dateFnsArithmeticMinute: 715,
  dateFnsFormatIso: 2375,
  dateFnsFormatTime: 1420,
  dayjsParseDate: 2855,
  dayjsParseInstant: 1382,
  dayjsArithmeticDay: 1731,
  dayjsArithmeticMinute: 851,
  dayjsFormatIso: 2416,
  dayjsFormatTime: 1285,
  momentParseDate: 561,
  momentParseInstant: 247,
  momentArithmeticDay: 484,
  momentArithmeticMinute: 251,
  momentFormatIso: 414,
  momentFormatTime: 192,
  tempoBundleSize: 9.96,
  formatBundleSize: 2.36,
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

function generateSvg(benchmarks, bundleSize) {
  const maximumOpsPerSecond = Math.max(
    benchmarks.tempo.parse.date,
    benchmarks.temporal.parse.date,
    benchmarks.luxon.parse.date,
    benchmarks.dateFns.parse.date,
    benchmarks.dayjs.parse.date,
    benchmarks.moment.parse.date,
  );
  const maximumBundleSize = 10;
  const bars = [];
  let width = 740;
  let y = 78;
  const addBar = (benchmark, label) => {
    const result = svgBar(benchmark, maximumOpsPerSecond, label, y);
    y += 28;
    bars.push(result.bar);
    width = Math.max(width, result.width);
  };

  addBar(benchmarks.tempo.parse.date, 'Tempo parse date');
  addBar(benchmarks.temporal.parse.date, 'Temporal parse date');
  addBar(benchmarks.luxon.parse.date, 'Luxon parse date');
  addBar(benchmarks.dateFns.parse.date, 'date-fns parse date');
  addBar(benchmarks.dayjs.parse.date, 'dayjs parse date');
  addBar(benchmarks.moment.parse.date, 'Moment parse date');
  addBar(benchmarks.tempo.instant, 'Tempo parse instant');
  addBar(benchmarks.temporal.instant, 'Temporal parse instant');
  addBar(benchmarks.luxon.instant, 'Luxon parse instant');
  addBar(benchmarks.dayjs.instant, 'dayjs parse instant');
  addBar(benchmarks.moment.instant, 'Moment parse instant');
  addBar(benchmarks.tempo.arithmetic.day, 'Tempo plus day');
  addBar(benchmarks.temporal.arithmetic.day, 'Temporal plus day');
  addBar(benchmarks.luxon.arithmetic.day, 'Luxon plus day');
  addBar(benchmarks.dateFns.arithmetic.day, 'date-fns plus day');
  addBar(benchmarks.dayjs.arithmetic.day, 'dayjs plus day');
  addBar(benchmarks.moment.arithmetic.day, 'Moment plus day');
  addBar(benchmarks.tempo.format.iso, 'Tempo format ISO');
  addBar(benchmarks.temporal.format.iso, 'Temporal format ISO');
  addBar(benchmarks.luxon.format.iso, 'Luxon format ISO');
  addBar(benchmarks.dayjs.format.iso, 'dayjs format ISO');
  addBar(benchmarks.moment.format.iso, 'Moment format ISO');

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
    <text x="14" y="34" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="18" font-weight="700" fill="#0f172a">Tempo ecosystem benchmarks</text>
    <text x="14" y="58" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="12" fill="#475569">Measured on Node 24 with Vitest bench. Higher ops/sec is better.</text>
    ${bars.join('\n    ')}
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
    temporal: { instant: defaults.temporalParseInstant, arithmetic: { day: defaults.temporalArithmeticDay, minute: defaults.temporalArithmeticMinute }, format: { iso: defaults.temporalFormatIso, time: defaults.temporalFormatTime }, parse: { date: defaults.temporalParseDate, instant: defaults.temporalParseInstant } },
    luxon: { instant: defaults.luxonParseInstant, arithmetic: { day: defaults.luxonArithmeticDay, minute: defaults.luxonArithmeticMinute }, format: { iso: defaults.luxonFormatIso, time: defaults.luxonFormatTime }, parse: { date: defaults.luxonParseDate, instant: defaults.luxonParseInstant } },
    dateFns: { instant: defaults.dateFnsParseInstant, arithmetic: { day: defaults.dateFnsArithmeticDay, minute: defaults.dateFnsArithmeticMinute }, format: { iso: defaults.dateFnsFormatIso, time: defaults.dateFnsFormatTime }, parse: { date: defaults.dateFnsParseDate, instant: defaults.dateFnsParseInstant } },
    dayjs: { instant: defaults.dayjsParseInstant, arithmetic: { day: defaults.dayjsArithmeticDay, minute: defaults.dayjsArithmeticMinute }, format: { iso: defaults.dayjsFormatIso, time: defaults.dayjsFormatTime }, parse: { date: defaults.dayjsParseDate, instant: defaults.dayjsParseInstant } },
    moment: { instant: defaults.momentParseInstant, arithmetic: { day: defaults.momentArithmeticDay, minute: defaults.momentArithmeticMinute }, format: { iso: defaults.momentFormatIso, time: defaults.momentFormatTime }, parse: { date: defaults.momentParseDate, instant: defaults.momentParseInstant } },
  };

  const mapping = [
    { pattern: /parse ISO date[^\n]*\n.*Tempo LocalDate parse\s+([\d,]+)\.\d+/, target: 'tempo.parse.date' },
    { pattern: /parse ISO date[^\n]*\n.*Temporal PlainDate from\s+([\d,]+)\.\d+/, target: 'temporal.parse.date' },
    { pattern: /parse ISO date[^\n]*\n.*DateTime fromISO\s+([\d,]+)\.\d+/, target: 'luxon.parse.date' },
    { pattern: /parse ISO date[^\n]*\n.*parseISO\s+([\d,]+)\.\d+/, target: 'dateFns.parse.date' },
    { pattern: /parse ISO date[^\n]*\n.*dayjs\(isoDate\)\s+([\d,]+)\.\d+/, target: 'dayjs.parse.date' },
    { pattern: /parse ISO date[^\n]*\n.*momentJs\(isoDate, true\)\s+([\d,]+)\.\d+/, target: 'moment.parse.date' },
    { pattern: /parse ISO instant[^\n]*\n.*Tempo Instant parse\s+([\d,]+)\.\d+/, target: 'tempo.instant' },
    { pattern: /parse ISO instant[^\n]*\n.*Temporal Instant from\s+([\d,]+)\.\d+/, target: 'temporal.instant' },
    { pattern: /parse ISO instant[^\n]*\n.*DateTime fromISO.*zone utc.*\n.*([\d,]+)\.\d+/, target: 'luxon.instant' },
    { pattern: /parse ISO instant[^\n]*\n.*dayjs\(isoDateTime\)\s+([\d,]+)\.\d+/, target: 'dayjs.instant' },
    { pattern: /parse ISO instant[^\n]*\n.*momentJs\(isoDateTime\)\s+([\d,]+)\.\d+/, target: 'moment.instant' },
    { pattern: /arithmetic plus day[^\n]*\n.*Tempo LocalDate plus day\s+([\d,]+)\.\d+/, target: 'tempo.arithmetic.day' },
    { pattern: /arithmetic plus day[^\n]*\n.*Temporal PlainDate from.*add.*\n.*([\d,]+)\.\d+/, target: 'temporal.arithmetic.day' },
    { pattern: /arithmetic plus day[^\n]*\n.*DateTime fromISO.*plus.*\n.*([\d,]+)\.\d+/, target: 'luxon.arithmetic.day' },
    { pattern: /arithmetic plus day[^\n]*\n.*addDays\(parseISO\(isoDate\), 1\)\s+([\d,]+)\.\d+/, target: 'dateFns.arithmetic.day' },
    { pattern: /arithmetic plus day[^\n]*\n.*dayjs\(isoDate\)\.add\(1, 'day'\)\s+([\d,]+)\.\d+/, target: 'dayjs.arithmetic.day' },
    { pattern: /arithmetic plus day[^\n]*\n.*momentJs\(isoDate\)\.add\(1, 'day'\)\s+([\d,]+)\.\d+/, target: 'moment.arithmetic.day' },
    { pattern: /format ISO[^\n]*\n.*tempoFormat\(LocalDate parse\(isoDate\), 'yyyy-MM-dd'\)\s+([\d,]+)\.\d+/, target: 'tempo.format.iso' },
    { pattern: /format ISO[^\n]*\n.*Temporal PlainDate from.*toString\(\)\s+([\d,]+)\.\d+/, target: 'temporal.format.iso' },
    { pattern: /format ISO[^\n]*\n.*DateTime fromISO.*toISODate\(\)\s+([\d,]+)\.\d+/, target: 'luxon.format.iso' },
    { pattern: /format ISO[^\n]*\n.*formatISO\(new Date\(isoDate\)\)\s+([\d,]+)\.\d+/, target: 'dateFns.format.iso' },
    { pattern: /format ISO[^\n]*\n.*dayjs\(isoDate\)\.format\('YYYY-MM-DD'\)\s+([\d,]+)\.\d+/, target: 'dayjs.format.iso' },
    { pattern: /format ISO[^\n]*\n.*momentJs\(isoDate\)\.format\('YYYY-MM-DD'\)\s+([\d,]+)\.\d+/, target: 'moment.format.iso' },
    { pattern: /format with time tokens[^\n]*\n.*tempoFormat\(LocalDateTime parse\(isoDateTime\), 'yyyy-MM-dd HH:mm:ss'\)\s+([\d,]+)\.\d+/, target: 'tempo.format.time' },
    { pattern: /format with time tokens[^\n]*\n.*Temporal Instant from.*toZonedDateTimeISO\('UTC'\)\.toPlainDateTime\(\)\.toString\(\)\s+([\d,]+)\.\d+/, target: 'temporal.format.time' },
    { pattern: /format with time tokens[^\n]*\n.*DateTime fromISO.*toFormat\('yyyy-MM-dd HH:mm:ss'\)\s+([\d,]+)\.\d+/, target: 'luxon.format.time' },
    { pattern: /format with time tokens[^\n]*\n.*format\(new Date\(isoDateTime\), "yyyy-MM-dd HH:mm:ss"\)\s+([\d,]+)\.\d+/, target: 'dateFns.format.time' },
    { pattern: /format with time tokens[^\n]*\n.*dayjs\(isoDateTime\)\.format\('YYYY-MM-DD HH:mm:ss'\)\s+([\d,]+)\.\d+/, target: 'dayjs.format.time' },
    { pattern: /format with time tokens[^\n]*\n.*momentJs\(isoDateTime\)\.format\('YYYY-MM-DD HH:mm:ss'\)\s+([\d,]+)\.\d+/, target: 'moment.format.time' },
  ];

  for (const entry of mapping) {
    const match = entry.pattern.exec(stdout);
    if (match) {
      const value = Number(match[1].replace(/,/g, ''));
      if (!Number.isFinite(value)) {
        continue;
      }
      const parts = entry.target.split('.');
      let current = benchmarks;
      for (let index = 0; index < parts.length - 1; index += 1) {
        current = current[parts[index]];
      }
      current[parts[parts.length - 1]] = value;
    }
  }

  return benchmarks;
}

function parseBundleOutput(stdout) {
  const indexMatch = /dist\/index\.js\s+Size:\s+([\d.]+)\s+kB with all dependencies, minified and gzipped/.exec(stdout);
  const formatMatch = /dist\/format\/index\.js\s+Size:\s+([\d.]+)\s+kB with all dependencies, minified and gzipped/.exec(stdout);

  return {
    tempo: Number(indexMatch?.[1] ?? defaults.tempoBundleSize),
    format: Number(formatMatch?.[1] ?? defaults.formatBundleSize),
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

  console.log('Running benchmarks...');
  const benchOutput = runCommand('npm run bench --silent');
  console.log('Running size gate...');
  const sizeOutput = runCommand('npm run size');

  const benchmarks = parseBenchOutput(benchOutput);
  const bundleSize = parseBundleOutput(sizeOutput);
  const svg = generateSvg(benchmarks, bundleSize);
  const markdown = buildMarkdown(benchmarks, bundleSize);

  await fs.writeFile(artifactPath, svg, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`Wrote ${artifactPath}`);
  console.log(`Wrote ${markdownPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
