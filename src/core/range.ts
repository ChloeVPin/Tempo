/** ECMAScript Date range: ±100,000,000 days from epoch. */
export const MIN_EPOCH_DAY = -100_000_000;
export const MAX_EPOCH_DAY = 100_000_000;
export const MIN_EPOCH_MILLIS = -8.64e15;
export const MAX_EPOCH_MILLIS = 8.64e15;
export const MILLIS_PER_SECOND = 1000;
export const MILLIS_PER_MINUTE = 60_000;
export const MILLIS_PER_HOUR = 3_600_000;
export const MILLIS_PER_DAY = 86_400_000;

import { TempoError } from '../errors.js';
import type { RoundingMode, TimeUnit } from '../types.js';

export function isEpochDayInRange(epochDay: number): boolean {
  return Number.isInteger(epochDay) && epochDay >= MIN_EPOCH_DAY && epochDay <= MAX_EPOCH_DAY;
}

export function isEpochMillisInRange(epochMs: number): boolean {
  return Number.isFinite(epochMs) && epochMs >= MIN_EPOCH_MILLIS && epochMs <= MAX_EPOCH_MILLIS;
}

const TIME_DIVISORS: Record<string, number> = {
  hour: MILLIS_PER_HOUR,
  minute: MILLIS_PER_MINUTE,
  second: MILLIS_PER_SECOND,
  millisecond: 1,
};

export function roundingUnitDivisor(unit: TimeUnit): number {
  return TIME_DIVISORS[unit]!;
}

export function validateTimeUnit(unit: TimeUnit): void {
  if (!TIME_DIVISORS[unit]) {
    throw new TempoError('INCOMPATIBLE_UNIT', 'Only time units are supported', { input: unit });
  }
}

export function validateRoundingMode(mode: RoundingMode | undefined): RoundingMode {
  const m = mode ?? 'halfExpand';
  if (m !== 'halfExpand' && m !== 'ceil' && m !== 'floor' && m !== 'trunc') {
    throw new TempoError('INVALID_ROUNDING_MODE', `Unsupported rounding mode ${m}`, { input: m });
  }
  return m;
}

export function applyRoundingMode(divisor: number, remainder: number, mode: RoundingMode): number {
  if (mode === 'halfExpand') {
    const half = divisor / 2;
    return remainder > 0 && remainder >= half ? divisor : remainder < 0 && remainder <= -half ? -divisor : 0;
  }
  return mode === 'ceil' ? (remainder > 0 ? divisor : 0) : mode === 'floor' ? (remainder < 0 ? -divisor : 0) : 0;
}
