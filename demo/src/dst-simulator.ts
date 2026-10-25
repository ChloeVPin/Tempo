import { format } from '@chloevpin/tempo/format';
import {
  LocalDateTime,
  ZonedDateTime,
  type Disambiguation,
} from '@chloevpin/tempo';

const TRANSITIONS: Record<string, { label: string; baseLocal: LocalDateTime }> = {
  spring: {
    label: '2026-03-08 Spring-forward',
    baseLocal: LocalDateTime.of(2026, 3, 8, 1, 0, 0),
  },
  fall: {
    label: '2026-11-01 Fall-back',
    baseLocal: LocalDateTime.of(2026, 11, 1, 1, 0, 0),
  },
};

const slider = document.getElementById('dst-slider') as HTMLInputElement | null;
const sliderOutput = document.getElementById('dst-slider-output') as HTMLOutputElement | null;
const transitionSelect = document.getElementById('dst-transition') as HTMLSelectElement | null;
const localTimeInput = document.getElementById('dst-local-time') as HTMLInputElement | null;
const policyRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="disambiguation"]'));
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

function resolveWithPolicy(local: LocalDateTime, policy: Disambiguation) {
  if (policy === 'reject') {
    return { resolved: ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'reject' }) };
  }

  const earlier = ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'earlier' });
  const later = ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'later' });

  if (earlier.epochMillis === later.epochMillis) {
    return { resolved: earlier, earlier, later };
  }

  const earlierLocal = earlier.toLocalDateTime();
  const laterLocal = later.toLocalDateTime();
  const earlierShift = earlierLocal.until(local, 'minute');
  const laterShift = laterLocal.until(local, 'minute');
  const isLocalShiftForward = laterShift > 0 && earlierShift < 0;

  if (policy === 'earlier') {
    return { resolved: earlier, earlier, later };
  }

  if (policy === 'later') {
    return { resolved: later, earlier, later };
  }

  const compatible = isLocalShiftForward ? later : earlier;
  return { resolved: compatible, earlier, later };
}

function resolveTransitionBoundaries(local: LocalDateTime, policy: Disambiguation) {
  const earlier = ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'earlier' });
  const later = ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'later' });

  if (!earlier || !later || earlier.epochMillis === later.epochMillis) {
    return {
      instantNumber: null,
      beforeInstant: null,
      afterInstant: null,
      beforeLocal: null,
      afterLocal: null,
      error: null,
    };
  }

  const earlierLocal = earlier.toLocalDateTime();
  const laterLocal = later.toLocalDateTime();
  const before = earlierLocal.toNaiveUtcMillis() < laterLocal.toNaiveUtcMillis() ? earlier : later;
  const after = earlierLocal.toNaiveUtcMillis() < laterLocal.toNaiveUtcMillis() ? later : earlier;
  const beforeLocal = before.toLocalDateTime();
  const afterLocal = after.toLocalDateTime();

  let error: string | null = null;
  try {
    if (policy === 'reject') {
      ZonedDateTime.fromLocal(local, 'America/New_York', { disambiguation: 'reject' });
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return {
    instantNumber: before.epochMillis,
    beforeInstant: before.epochMillis,
    afterInstant: after.epochMillis,
    beforeLocal,
    afterLocal,
    error,
  };
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

  let resolved: ZonedDateTime | null = null;
  let earlier: ZonedDateTime | null = null;
  let later: ZonedDateTime | null = null;
  let error: string | null = null;
  let instantNumber: number | null = null;
  let beforeInstant: number | null = null;
  let afterInstant: number | null = null;
  let beforeLocal: LocalDateTime | null = null;
  let afterLocal: LocalDateTime | null = null;

  try {
    const resolution = resolveWithPolicy(local, policy);
    resolved = resolution.resolved ?? null;
    earlier = resolution.earlier ?? null;
    later = resolution.later ?? null;

    const boundaries = resolveTransitionBoundaries(local, policy);
    instantNumber = boundaries.instantNumber;
    beforeInstant = boundaries.beforeInstant;
    afterInstant = boundaries.afterInstant;
    beforeLocal = boundaries.beforeLocal;
    afterLocal = boundaries.afterLocal;
    error = boundaries.error;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const transitionLabel = TRANSITIONS[transition]?.label ?? transition;
  const modeLabel = mode === 'manual' ? 'manual local input' : `${formatMinutes(minutes)} from transition start`;
  const resolvedLabel = resolved && earlier && later && earlier.epochMillis !== later.epochMillis ? `${policy} resolution` : `resolved ${policy}`;

  if (instantOutput) {
    instantOutput.textContent = instantNumber !== null
      ? [
          `transition: ${transitionLabel}`,
          `mode: ${modeLabel}`,
          `policy: ${policy}`,
          `label: ${resolvedLabel}`,
          `epochMillis: ${instantNumber}`,
          `toISO(): ${resolved?.toISO() ?? ''}`,
          `formatted: ${format(resolved!, 'yyyy-MM-dd HH:mm:ss XXX zzzz')}`,
        ].join('\n')
      : `transition: ${transitionLabel}\nmode: ${modeLabel}\npolicy: ${policy}\nstate: ${error ?? 'unresolved'}`;
  }

  if (localOutput) {
    localOutput.textContent = [
      `local: ${local.toISO()}`,
      'timeZone: America/New_York',
      earlier && later && earlier.epochMillis !== later.epochMillis ? 'transition type: offset change' : 'transition type: none',
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
    if (!earlier || !later || earlier.epochMillis === later.epochMillis) {
      noteOutput.textContent = `${policy} resolved normally.\nNo visible gap or overlap at this local minute.`;
      return;
    }

    const gapMs = (afterInstant ?? 0) - (beforeInstant ?? 0);
    const isGap = gapMs > 0;
    const gapMinutes = Math.round(gapMs / 60000);
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
