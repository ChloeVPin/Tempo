#!/usr/bin/env node
/**
 * Interactive terminal showcase for Tempo.
 *
 * Manual replay inputs:
 *   1\n\n2\n\n3\n\n4\n\n5\n
 * Replay all sections, then return to the menu and exit.
 */

import { LocalDate, ZonedDateTime } from '../dist/index.js';
import { format } from '../dist/format/index.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';
const LINE = '─'.repeat(52);

const out = process.stdout;
const stdin = process.stdin;
stdin.setEncoding('utf8');

const lines = [];
let stdinBuffer = '';
let stdinEnded = false;
const stdinResolvers = [];

function feedStdin(chunk) {
  const normalized = chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const combined = stdinBuffer + normalized;
  const parts = combined.split('\n');
  for (let index = 0; index < parts.length - 1; index += 1) {
    lines.push(parts[index]);
    if (stdinResolvers.length > 0) {
      stdinResolvers.shift()();
    }
  }
  const tail = parts[parts.length - 1] ?? '';
  if (tail) {
    stdinBuffer = tail;
  } else {
    stdinBuffer = '';
    if (stdinResolvers.length > 0) {
      stdinResolvers.shift()();
    }
  }
}

function endStdin() {
  stdinEnded = true;
  if (stdinBuffer) lines.push(stdinBuffer);
  while (stdinResolvers.length > 0) {
    stdinResolvers.shift()();
  }
}

stdin.on('data', feedStdin);
stdin.on('end', endStdin);

function colorize(text, ...codes) {
  return `${codes.join('')}${text}${RESET}`;
}

function title(text) {
  return colorize(text, BOLD, CYAN);
}

function label(text) {
  return colorize(text, YELLOW);
}

function ok(text) {
  return colorize(text, GREEN);
}

function dim(text) {
  return colorize(text, DIM);
}

function magenta(text) {
  return colorize(text, MAGENTA);
}

function tableCell(text, width) {
  return text.padEnd(width);
}

function renderTable(rows) {
  return rows.map(([label, value]) => `${tableCell(label, 12)}${tableCell(value, 32)}`).join('\n');
}

function localTimeLabel(zdt) {
  return `${String(zdt.hour).padStart(2, '0')}:${String(zdt.minute).padStart(2, '0')}`;
}

function diagramHeading(text) {
  return `${BOLD}${CYAN}${text}${RESET}`;
}

function renderDiagram(title, items) {
  const width = 38;
  const validItems = items.filter((item) => item.instant !== undefined);
  const minInstant = validItems.reduce((min, item) => (item.instant < min ? item.instant : min), validItems[0]?.instant ?? 0);
  const maxInstant = validItems.reduce((max, item) => (item.instant > max ? item.instant : max), validItems[0]?.instant ?? 0);
  const range = maxInstant - minInstant || 1;
  const lines = [];
  lines.push(`  ${diagramHeading(title)}`);
  lines.push(`  ${LINE}`);
  for (const { label, instant } of items) {
    if (instant === undefined) {
      lines.push(`│ ${tableCell('  ' + label, 50)} │`);
      lines.push(`│ ${tableCell(magenta('skipped'), 50)} │`);
      continue;
    }
    const zdt = ZonedDateTime.fromInstant(instant, 'America/New_York');
    const local = localTimeLabel(zdt);
    const percent = Math.round(((instant - minInstant) / range) * width);
    const bar = `${'░'.repeat(Math.max(1, percent))}█`;
    const value = `${label}: ${local}`;
    lines.push(`│ ${tableCell(BOLD + value + RESET, 50)} │`);
    lines.push(`│ ${tableCell(DIM + bar + RESET, 50)} │`);
  }
  lines.push(`  ${LINE}`);
  return lines.join('\n');
}

function renderDiagramFromZoned(title, items) {
  const width = 38;
  const validItems = items.filter((item) => item.zdt !== null);
  const baseInstant = validItems.length > 0 ? validItems[0].zdt.epochMillis : 0;
  const minInstant = validItems.reduce((min, item) => (item.zdt.epochMillis < min ? item.zdt.epochMillis : min), baseInstant);
  const maxInstant = validItems.reduce((max, item) => (item.zdt.epochMillis > max ? item.zdt.epochMillis : max), baseInstant);
  const range = maxInstant - minInstant || 1;
  const lines = [];
  lines.push(`  ${diagramHeading(title)}`);
  lines.push(`  ${LINE}`);
  for (const { label, zdt } of items) {
    if (zdt === null) {
      lines.push(`│ ${tableCell('  ' + label, 50)} │`);
      lines.push(`│ ${tableCell(magenta('skipped'), 50)} │`);
      continue;
    }
    const local = localTimeLabel(zdt);
    const percent = Math.round(((zdt.epochMillis - minInstant) / range) * width);
    const bar = `${'░'.repeat(Math.max(1, percent))}█`;
    const value = `${label}: ${local}`;
    lines.push(`│ ${tableCell(BOLD + value + RESET, 50)} │`);
    lines.push(`│ ${tableCell(DIM + bar + RESET, 50)} │`);
  }
  lines.push(`  ${LINE}`);
  return lines.join('\n');
}

function nextAvailableLine() {
  if (lines.length > 0) return lines.shift();
  if (stdinEnded) return '';
  return new Promise((resolve) => {
    stdinResolvers.push(resolve);
  }).then(() => lines.shift() ?? '');
}

async function waitForEnter(message = 'Press enter to continue...') {
  out.write(`\n${dim(message)}`);
  await nextAvailableLine();
}

function showHeader(text) {
  out.write(`\n${title('══════════════════════════════════════════════════')}\n`);
  out.write(`${title(`  ${text}${' '.repeat(Math.max(0, 46 - text.length))}`)}\n`);
  out.write(`${title('══════════════════════════════════════════════════')}\n\n`);
}

async function showTypeSeparation() {
  showHeader('Type separation: instant, local, and zoned');

  const instant = ZonedDateTime.parse('2026-06-01T12:00:00Z').toInstant();
  const zdt = instant.toZonedDateTime('America/New_York');
  const localDate = zdt.toLocalDate();
  const localDateTime = zdt.toLocalDateTime();
  const localTime = zdt.toLocalTime();

  const rows = [
    [label('instant.epochMillis'), String(instant.epochMillis)],
    [label('zoned date'), `${localDate.toISO()} ${zdt.timeZone}`],
    [label('zoned time'), localTime.toISO()],
    [label('localDate.toISO()'), localDate.toISO()],
    [label('localDateTime.toISO()'), localDateTime.toISO()],
    [label('localTime.toISO()'), localTime.toISO()],
  ];

  out.write(` Input: 2026-06-01T12:00:00Z -> America/New_York\n`);
  out.write(` ${LINE}\n`);
  for (const [labelText, value] of rows) {
    out.write(` ${tableCell(labelText + ': ' + value, 51)}\n`);
  }
  out.write(` ${LINE}\n`);
  out.write(` ${ok('Tempo keeps instant, zone, and local fields separate.')}\n\n`);
  await waitForEnter();
}

async function showCivilMath() {
  showHeader('Zero-dependency civil date arithmetic');

  const start = LocalDate.of(2026, 2, 28);
  const endOfMonth = start.endOf('month');
  const nextMonth = start.plus({ months: 1 });
  const daysUntilEnd = start.until(endOfMonth, 'day') + 1;

  out.write(` Starting point: 2026-02-28\n`);
  out.write(` ${LINE}\n`);
  out.write(` ${tableCell(label('start') + ': ' + start.toISO(), 51)}\n`);
  out.write(` ${tableCell(label('endOf month') + ': ' + endOfMonth.toISO(), 51)}\n`);
  out.write(` ${tableCell(label('plus({ months: 1 })') + ': ' + nextMonth.toISO(), 51)}\n`);
  out.write(` ${tableCell(label('until(endOfMonth, day)') + ': ' + daysUntilEnd + ' days', 51)}\n`);
  out.write(` ${LINE}\n`);
  out.write(` ${ok('Date operations return new immutable values.')}\n`);
  out.write(` ${ok('Month-end addition respects civil math exactly.')}\n\n`);
  await waitForEnter();
}

async function showLiveConversions() {
  showHeader('Live timezone conversions');

  const base = ZonedDateTime.parse('2026-06-15T09:30:00-04:00[America/New_York]');
  const zones = [
    ['New York', base],
    ['London', base.withTimeZone('Europe/London')],
    ['Tokyo', base.withTimeZone('Asia/Tokyo')],
    ['Sydney', base.withTimeZone('Australia/Sydney')],
  ];

  out.write(` Base instant: ${base.toISO()}\n`);
  out.write(` ${LINE}\n\n`);
  out.write(' Zone'.padEnd(12) + 'Local date/time'.padEnd(22) + 'Offset\n');
  for (const [zoneName, zdt] of zones) {
    out.write(`${tableCell(zoneName, 12)}${tableCell(zdt.toLocalDateTime().toISO().replace('T', ' '), 22)}${format(zdt, 'XXX')}\n`);
  }
  out.write(`\n ${LINE}\n`);
  out.write(` ${ok('Tempo applies IANA zone rules with immutable conversions.')}\n\n`);
  await waitForEnter();
}

async function showAsciiDstVisualizer() {
  showHeader('ASCII DST visualizer');

  const springBefore = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-03-08T00:30:00-05:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'compatible' },
  );
  const springLastValid = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-03-08T01:30:00-05:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'compatible' },
  );
  const springAfter = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-03-08T03:30:00-04:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'compatible' },
  );

  const fallBefore = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-11-01T00:30:00-04:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'compatible' },
  );
  const fallEarlier = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-11-01T01:30:00-04:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'earlier' },
  );
  const fallLater = ZonedDateTime.fromLocal(
    ZonedDateTime.parse('2026-11-01T01:30:00-04:00[America/New_York]').toLocalDateTime(),
    'America/New_York',
    { disambiguation: 'later' },
  );

  out.write(` ${LINE}\n`);
  out.write(`│ ${tableCell(title('Zone: America/New_York | Date: 2026'), 50)} │\n`);
  out.write(` ${LINE}\n\n`);

  out.write(renderDiagramFromZoned('Spring-forward 2026-03-08', [
    { label: 'before gap', zdt: springBefore },
    { label: 'last valid', zdt: springLastValid },
    { label: 'gap / 02:30', zdt: null },
    { label: 'after gap', zdt: springAfter },
  ]));
  out.write('\n\n');
  out.write(` ${ok('Spring-forward gap : 02:00 never occurs; compatible -> 03:00.')}\n`);
  out.write(` ${ok('reject throws TIMEZONE_GAP for skipped local times.')}\n\n`);

  out.write(renderDiagramFromZoned('Fall-back 2026-11-01', [
    { label: 'first 01:30', zdt: fallEarlier },
    { label: 'second 01:30', zdt: fallLater },
    { label: 'before overlap', zdt: fallBefore },
  ]));
  out.write('\n\n');
  out.write(` ${ok('Fall-back overlap: 01:30 occurs twice.')}\n`);
  out.write(` ${ok('earlier -> first instant, later -> second instant.')}\n`);
  out.write(` ${ok('reject throws TIMEZONE_OVERLAP for ambiguous local times.')}\n\n`);
  await waitForEnter();
}

async function showMenu() {
  while (true) {
    out.write(`\n${title('══════════════════════════════════════════════════')}\n`);
    out.write(`${title('  Tempo Terminal Showcase                          ')}\n`);
    out.write(`${title('══════════════════════════════════════════════════')}\n\n`);
    out.write(`  ${BOLD}1${RESET}  Type separation\n`);
    out.write(`  ${BOLD}2${RESET}  Zero-dependency civil math\n`);
    out.write(`  ${BOLD}3${RESET}  Live timezone conversions\n`);
    out.write(`  ${BOLD}4${RESET}  ASCII DST visualizer\n`);
    out.write(`  ${BOLD}5${RESET}  Exit\n\n`);
    out.write(` ${dim('Choose an option [1-5]:')} `);

    const choice = (await nextAvailableLine()).trim();

    switch (choice) {
      case '1':
        await showTypeSeparation();
        break;
      case '2':
        await showCivilMath();
        break;
      case '3':
        await showLiveConversions();
        break;
      case '4':
        await showAsciiDstVisualizer();
        break;
      default:
        out.write(`\n ${ok('Goodbye!')}\n\n`);
        process.exit(0);
    }
  }
}

process.on('exit', () => {
  out.write(RESET);
});

(async () => {
  try {
    await showMenu();
  } catch (error) {
    console.error('Showcase failed:', error);
    process.exitCode = 1;
  }
})();
