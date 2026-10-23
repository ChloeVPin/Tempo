export type DateUnit = 'year' | 'month' | 'week' | 'day';
export type TimeUnit = 'hour' | 'minute' | 'second' | 'millisecond';
export type DateTimeUnit = DateUnit | TimeUnit;

export type Overflow = 'constrain' | 'reject';
export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
export type RoundingMode = 'halfExpand' | 'ceil' | 'floor' | 'trunc';

export const ROUNDING_MODES: readonly RoundingMode[] = ['halfExpand', 'ceil', 'floor', 'trunc'];

export interface DateFields {
  readonly years?: number;
  readonly months?: number;
  readonly weeks?: number;
  readonly days?: number;
}

export interface TimeFields {
  readonly hours?: number;
  readonly minutes?: number;
  readonly seconds?: number;
  readonly milliseconds?: number;
}

export interface DurationLike extends DateFields, TimeFields {}

export interface LocalDateLike {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface LocalTimeLike {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export interface LocalDateTimeLike extends LocalDateLike, LocalTimeLike {}

export interface WithDateFields {
  readonly year?: number;
  readonly month?: number;
  readonly day?: number;
}

export interface WithTimeFields {
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
}

export interface WithDateTimeFields extends WithDateFields, WithTimeFields {}

export interface ArithmeticOptions {
  readonly overflow?: Overflow;
}

export interface ZoneOptions {
  readonly disambiguation?: Disambiguation;
}

export interface FormatOptions {
  readonly locale?: string;
  readonly timeZone?: string;
  readonly offsetMs?: number;
}

export const DATE_UNITS: readonly DateUnit[] = ['year', 'month', 'week', 'day'];
export const TIME_UNITS: readonly TimeUnit[] = ['hour', 'minute', 'second', 'millisecond'];
export const DATE_TIME_UNITS: readonly DateTimeUnit[] = [...DATE_UNITS, ...TIME_UNITS];
