import { format } from '@chloevpin/tempo/format';
import { LocalDate, LocalDateTime, LocalTime, ZonedDateTime } from '@chloevpin/tempo';

const isoInput = document.getElementById('iso-input') as HTMLInputElement | null;

export function initTypeExplorer() {
  isoInput?.addEventListener('input', update);

  const formatValue = document.getElementById('format-value') as HTMLInputElement | null;
  const formatPattern = document.getElementById('format-pattern') as HTMLInputElement | null;
  formatValue?.addEventListener('input', update);
  formatPattern?.addEventListener('input', update);
  update();
}

function update() {
  const iso = isoInput?.value ?? '';
  const localDateTimeOutput = document.getElementById('local-date-time-output') as HTMLPreElement | null;
  const localTimeOutput = document.getElementById('local-time-output') as HTMLPreElement | null;
  const offsetOutput = document.getElementById('offset-output') as HTMLPreElement | null;

  if (!iso) {
    localDateTimeOutput!.textContent = 'Enter a parseable ISO value to explore local date-time fields.';
    localTimeOutput!.textContent = '—';
    offsetOutput!.textContent = '—';
    return;
  }

  const zdt = safeZoned(iso);
  const localDateTime = zdt
    ? zdt.toLocalDateTime()
    : tryInstantZoned(iso)?.toLocalDateTime() ?? null;

  if (!localDateTime) {
    localDateTimeOutput!.textContent = 'Invalid ISO zoned value.';
    localTimeOutput!.textContent = '—';
    offsetOutput!.textContent = '—';
    return;
  }

  const localTime = localDateTime.toLocalTime();

  localDateTimeOutput!.textContent = [
    `toISO(): ${localDateTime.toISO()}`,
    `formatted: ${format(localDateTime, 'yyyy-MM-dd HH:mm:ss.SSS')}`,
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

  if (zdt) {
    offsetOutput!.textContent = [
      `timeZone: ${zdt.timeZone}`,
      `offsetMs: ${zdt.offsetMs}`,
      `isDST: ${zdt.isDST()}`,
      `formatted offset: ${format(zdt, 'XXX')}`,
      `formatted zone: ${format(zdt, 'zzzz')}`,
    ].join('\n');
  } else if (tryInstantZoned(iso)) {
    const zdtFallback = tryInstantZoned(iso)!;
    offsetOutput!.textContent = [
      `timeZone: UTC`,
      `offsetMs: ${zdtFallback.toZonedDateTime('UTC').offsetMs}`,
      `formatted offset: ${format(zdtFallback, 'XXX')}`,
      `formatted zone: ${format(zdtFallback.toZonedDateTime('UTC'), 'zzzz')}`,
    ].join('\n');
  } else {
    offsetOutput!.textContent = '—';
  }
}

function safeZoned(value: string): ZonedDateTime | null {
  try {
    return ZonedDateTime.parse(value);
  } catch {
    return null;
  }
}

function tryInstantZoned(value: string): ZonedDateTime | null {
  try {
    return ZonedDateTime.parse(value + '[UTC]');
  } catch {
    return null;
  }
}
