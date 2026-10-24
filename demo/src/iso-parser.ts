import {
  Instant,
  LocalDate,
  LocalDateTime,
  LocalTime,
  ZonedDateTime,
} from '@chloevpin/tempo';
import { format } from '@chloevpin/tempo/format';

const isoInput = document.getElementById('iso-input') as HTMLInputElement | null;
const instantOutput = document.getElementById('instant-output') as HTMLPreElement | null;
const localDateOutput = document.getElementById('local-date-output') as HTMLPreElement | null;
const zonedOutput = document.getElementById('zoned-output') as HTMLPreElement | null;
const localDateTimeOutput = document.getElementById('local-date-time-output') as HTMLPreElement | null;
const localTimeOutput = document.getElementById('local-time-output') as HTMLPreElement | null;
const offsetOutput = document.getElementById('offset-output') as HTMLPreElement | null;

function safeInstant(input: string): Instant | null {
  try {
    return Instant.parse(input);
  } catch {
    return null;
  }
}

function safeLocalDate(input: string): LocalDate | null {
  try {
    return LocalDate.parse(input);
  } catch {
    return null;
  }
}

function safeZoned(input: string): ZonedDateTime | null {
  try {
    return ZonedDateTime.parse(input);
  } catch {
    return null;
  }
}

function renderInstant(instant: Instant | null) {
  if (!instant) {
    instantOutput!.textContent = 'Invalid ISO instant.';
    return;
  }

  const lines = [
    `epochMillis: ${instant.epochMillis}`,
    `toISO(): ${instant.toISO()}`,
    `toJSDate(): ${instant.toJSDate().toISOString()}`,
  ];

  try {
    const zdt = instant.toZonedDateTime('America/New_York');
    lines.push(`America/New_York: ${format(zdt, "yyyy-MM-dd HH:mm XXX")}`);
  } catch (error) {
    lines.push(`America/New_York: ${(error as Error).message}`);
  }

  instantOutput!.textContent = lines.join('\n');
}

function renderLocalDate(value: LocalDate | null) {
  if (!value) {
    localDateOutput!.textContent = 'Invalid date.';
    return;
  }

  localDateOutput!.textContent = [
    `toISO(): ${value.toISO()}`,
    `year: ${value.year}`,
    `month: ${value.month}`,
    `day: ${value.day}`,
    `dayOfWeek: ${value.dayOfWeek()}`,
    `isoWeekYear: ${value.isoWeekYear()}`,
    `isoWeek: ${value.isoWeek()}`,
    `quarter: ${value.quarter()}`,
    `daysInMonth: ${value.daysInMonth()}`,
    `plus 1 month: ${value.plus({ months: 1 }).toISO()}`,
  ].join('\n');
}

function renderZoned(value: ZonedDateTime | null) {
  if (!value) {
    zonedOutput!.textContent = 'Invalid zoned date-time.';
    return;
  }

  const lines = [
    `toISO(): ${value.toISO()}`,
    `epochMillis: ${value.epochMillis}`,
    `year: ${value.year}`,
    `month: ${value.month}`,
    `day: ${value.day}`,
    `hour: ${value.hour}`,
    `minute: ${value.minute}`,
    `second: ${value.second}`,
    `millisecond: ${value.millisecond}`,
    `offsetMs: ${value.offsetMs}`,
    `timeZone: ${value.timeZone}`,
    `isDST: ${value.isDST()}`,
  ];

  zonedOutput!.textContent = lines.join('\n');
}

function renderTypeExplorer(iso: string) {
  const zdt = safeZoned(iso) ?? (safeInstant(iso) ? safeInstant(iso)!.toZonedDateTime('UTC') : null);
  if (zdt) {
    const localDateTime = zdt.toLocalDateTime();
    const localTime = zdt.toLocalTime();
    const pattern = "yyyy-MM-dd HH:mm:ss.SSS XXX";
    localDateTimeOutput!.textContent = [
      `toISO(): ${localDateTime.toISO()}`,
      `formatted: ${format(localDateTime, pattern)}`,
      `year: ${localDateTime.year}`,
      `month: ${localDateTime.month}`,
      `day: ${localDateTime.day}`,
      `hour: ${localDateTime.hour}`,
      `minute: ${localDateTime.minute}`,
      `second: ${localDateTime.second}`,
      `millisecond: ${localDateTime.millisecond}`,
    ].join('\n');

    localTimeOutput!.textContent = [
      `toISO(): ${localTime.toISO()}`,
      `toMsOfDay: ${localTime.toMsOfDay()}`,
      `hour: ${localTime.hour}`,
      `minute: ${localTime.minute}`,
      `second: ${localTime.second}`,
      `millisecond: ${localTime.millisecond}`,
      `plus 90m: ${localTime.plus({ minutes: 90 }).toISO()}`,
    ].join('\n');

    offsetOutput!.textContent = [
      `timeZone: ${zdt.timeZone}`,
      `offsetMs: ${zdt.offsetMs}`,
      `isDST: ${zdt.isDST()}`,
      `formatted offset: ${format(zdt, "XXX")}`,
      `formatted zone: ${format(zdt, "zzzz")}`,
    ].join('\n');
  } else {
    localDateTimeOutput!.textContent = 'Enter a parseable ISO value to explore local date-time fields.';
    localTimeOutput!.textContent = '—';
    offsetOutput!.textContent = '—';
  }
}

function update() {
  const iso = isoInput?.value ?? '';
  const instant = safeInstant(iso);
  const localDate = safeLocalDate(iso) ?? safeZoned(iso)?.toLocalDate() ?? instant?.toZonedDateTime('UTC').toLocalDate() ?? null;
  const zoned = safeZoned(iso);

  renderInstant(instant);
  renderLocalDate(localDate);
  renderZoned(zoned);
  renderTypeExplorer(zoned ? zoned.toISO() : instant ? instant.toZonedDateTime('UTC').toISO() : localDate ? localDate.toISO() : '');
}

export function initIsoParser() {
  isoInput?.addEventListener('input', update);
  update();
}
