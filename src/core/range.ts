/** ECMAScript Date range: ±100,000,000 days from epoch. */
export const MIN_EPOCH_DAY = -100_000_000;
export const MAX_EPOCH_DAY = 100_000_000;
export const MIN_EPOCH_MILLIS = -8.64e15;
export const MAX_EPOCH_MILLIS = 8.64e15;
export const MILLIS_PER_SECOND = 1000;
export const MILLIS_PER_MINUTE = 60_000;
export const MILLIS_PER_HOUR = 3_600_000;
export const MILLIS_PER_DAY = 86_400_000;

import type { RoundingMode, TimeUnit } from '../types.js';

export function isEpochDayInRange(epochDay: number): boolean {
  return Number.isInteger(epochDay) && epochDay >= MIN_EPOCH_DAY && epochDay <= MAX_EPOCH_DAY;
}

export function isEpochMillisInRange(epochMs: number): boolean {
  return Number.isFinite(epochMs) && epochMs >= MIN_EPOCH_MILLIS && epochMs <= MAX_EPOCH_MILLIS;
}

export function roundingUnitDivisor(unit: TimeUnit): number {
  switch (unit) {
    case 'hour':
      return MILLIS_PER_HOUR;
    case 'minute':
      return MILLIS_PER_MINUTE;
    case 'second':
      return MILLIS_PER_SECOND;
    case 'millisecond':
      return 1;
  }
}

export function validateRoundingMode(mode: RoundingMode | undefined): void {
  if (mode !== undefined && !ROUNDING_MODES.includes(mode)) {
    throw new Error(`Unsupported rounding mode ${mode}`);
  }
}

export function applyRoundingMode(divisor: number, remainder: number, mode: RoundingMode): number {
  if (mode === 'halfExpand') {
    const half = divisor / 2;
    return remainder > 0 && remainder >= half ? divisor : remainder < 0 && remainder <= -half ? -divisor : 0;
  }
  if (mode === 'ceil') return remainder > 0 ? divisor : 0;
  if (mode === 'floor') return remainder < 0 ? -divisor : 0;
  if (mode === 'trunc') return 0;
  throw new Error(`Unsupported rounding mode ${mode}`);
}
