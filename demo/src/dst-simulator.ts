import { format } from '@chloevpin/tempo/format';
import {
  LocalDateTime,
  ZonedDateTime,
  type Disambiguation,
} from '@chloevpin/tempo';

const TRANSITIONS: Record<string, { label: string; baseLocal: LocalDateTime; baseInstant: number }> = {
  spring: {
    label: '2026-03-08 Spring-forward',
    baseLocal: LocalDateTime.of(2026, 3, 8, 2, 0, 0),
    baseInstant: 0,
  },
  fall: {
    label: '2026-11-01 Fall-back',
    baseLocal: LocalDateTime.of(2026, 11, 1, 1, 0, 0),
    baseInstant: 0,
  },
};

const slider = document.getElementById('dst-slider') as HTMLInputElement | null;
const sliderOutput = document.getElementById('dst-slider-output') as HTMLOutputElement | null;
const transitionSelect = document.getElementById('dst-transition') as HTMLSelectElement | null;
const localTimeInput = document.getElementById('dst-local-time') as HTMLInputElement | null;
const policyRadios = document.querySelectorAll<HTMLInputElement>('input[name="disambiguation"]');
const instantOutput = document.getElementById('dst-instant-output') as HTMLPreElement | null;
const localOutput = document.getElementById('dst-local-output') as HTMLPreElement | null;
const noteOutput = document.getElementById('dst-note-output') as HTMLPreElement | null;

function currentPolicy(): Disambiguation {
  const checked = document.querySelector<HTMLInputElement>('input[name="disambiguation"]:checked');
  return (checked?.value as Disambiguation) ?? 'compatible';
}

function resolveTransitionBase(transition: string): LocalDateTime {
  const entry = TRANSITIONS[transition] ?? TRANSITIONS.spring;
  if (transition === 'spring') return LocalDateTime.of(2026, 3, 8, 1, 0, 0);
  return LocalDateTime.of(2026, 11, 1, 1, 0, 0);
}

function applyLocalShift(base: LocalDateTime, minutes: number): LocalDateTime {
  const totalMinutes = base.hour * 60 + base.minute + minutes;
  const dayDelta = Math.trunc(totalMinutes / (24 * 60));
  const minutesOfDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const newHour = Math.trunc(minutesOfDay / 60);
  const newMinute = minutesOfDay % 60;
  return base.plus({ days: dayDelta }).with({ hour: newHour, minute: newMinute });
}

function formatMinutes(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '';
  const hours = Math.trunc(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function render() {
  const transition = transitionSelect?.value ?? 'spring';
  const policy = currentPolicy();
  const minutes = Number(slider?.value ?? 150);
  const manual = localTimeInput?.value.trim() ?? '';

  if (sliderOutput) sliderOutput.value = formatMinutes(minutes);
  const base = resolveTransitionBase(transition);

  let local: LocalDateTime;
  let mode: 'manual' | 'slider';
  if (manual) {
    try {
      local = LocalDateTime.parse(manual);
      mode = 'manual';
    } catch {
      local = applyLocalShift(base, minutes);
      mode = 'slider';
    }
  } else {
    local = applyLocalShift(base, minutes);
    mode = 'slider';
  }

  let instantNumber: number | null = null;
  let resolved: ZonedDateTime | null = null;
  let error: string | null = null;
  let beforeOffset = '—';
  let afterOffset = '—';
  let beforeInstant: number | null = null;
  let afterInstant: number | null = null;
  let beforeLocal: LocalDateTime | null = null;
  let afterLocal: LocalDateTime | null = null;

  try {
    resolved = ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: policy });
    instantNumber = resolved.epochMillis;
    const minuteBefore = local.plus({ minutes: -1 });
    const minuteAfter = local.plus({ minutes: 1 });
    const beforeZdt = ZonedDateTime.fromLocal(minuteBefore, 'America/New_York', { disambiguation: 'compatible' });
    const afterZdt = ZonedDateTime.fromLocal(minuteAfter, 'America/New_York', { disambiguation: 'compatible' });
    beforeOffset = format(beforeZdt, 'XXX');
    afterOffset = format(afterZdt, 'XXX');
    beforeInstant = beforeZdt.epochMillis;
    afterInstant = afterZdt.epochMillis;
    beforeLocal = minuteBefore;
    afterLocal = minuteAfter;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const isTransition = (beforeOffset !== afterOffset);
  const modeLabel = mode === 'manual' ? 'manual local input' : `${formatMinutes(minutes)} from transition start`;
  const transitionLabel = TRANSITIONS[transition]?.label ?? transition;

  if (instantOutput) {
    instantOutput.textContent = instantNumber !== null
      ? [
          `transition: ${transitionLabel}`,
          `mode: ${modeLabel}`,
          `policy: ${policy}`,
          `epochMillis: ${instantNumber}`,
          `toISO(): ${resolved?.toISO() ?? ''}`,
          `formatted: ${format(resolved!, 'yyyy-MM-dd HH:mm:ss XXX zzzz')}`,
        ].join('\n')
      : `transition: ${transitionLabel}\nmode: ${modeLabel}\npolicy: ${policy}\nstate: ${error ?? 'unresolved'}`;
  }

  if (localOutput) {
    localOutput.textContent = [
      `local: ${local.toISO()}`,
      `timeZone: America/New_York`,
      isTransition ? 'transition type: offset change' : 'transition type: none',
      `before offset: ${beforeOffset}`,
      `after offset: ${afterOffset}`,
      beforeInstant !== null ? `before instant: ${beforeInstant}` : 'before instant: —',
      afterInstant !== null ? `after instant: ${afterInstant}` : 'after instant: —',
      beforeLocal !== null ? `before local: ${beforeLocal.toISO()}` : 'before local: —',
      afterLocal !== null ? `after local: ${afterLocal.toISO()}` : 'after local: —',
    ].join('\n');
  }

  if (noteOutput) {
    if (error) {
      noteOutput.textContent = `${policy.toUpperCase()} rejected this local time.\n${error}`;
      return;
    }
    if (!isTransition) {
      noteOutput.textContent = `${policy} resolved normally.\nNo visible gap or overlap at this local minute.`;
      return;
    }
    const gapMinutes = afterInstant && beforeInstant ? Math.round((afterInstant - beforeInstant) / 60000) : 0;
    const isGap = gapMinutes > 0;
    const summary = isGap
      ? `Gap: local times between ${beforeLocal?.toISO() ?? '—'} and ${afterLocal?.toISO() ?? '—'} never occur.`
      : `Overlap: local times between ${beforeLocal?.toISO() ?? '—'} and ${afterLocal?.toISO() ?? '—'} occur twice.`;
    noteOutput.textContent = [
      `${policy.toUpperCase()} resolved during an offset change.`,
      summary,
      `observed offset delta: ${gapMinutes} minutes`,
    ].join('\n');
  }
}

for (const radio of policyRadios) {
  radio.addEventListener('change', render);
}

transitionSelect?.addEventListener('change', () => {
  if (slider) slider.value = transitionSelect.value === 'spring' ? '150' : '60';
  render();
});

slider?.addEventListener('input', () => {
  if (localTimeInput?.value) localTimeInput.value = '';
  render();
});

localTimeInput?.addEventListener('input', render);

export function initDstSimulator() {
  render();
}
