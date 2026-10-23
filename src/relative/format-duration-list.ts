import { type DurationLike } from '../types.js';

export interface FormatDurationListOptions {
  readonly locale?: string;
  readonly style?: 'long' | 'short' | 'narrow';
}

const UNITS = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
] as const;

interface LabelMap {
  readonly singular: string;
  readonly plural: string;
}

const LABELS: Record<string, Record<string, LabelMap>> = {
  years: {
    en: { singular: 'year', plural: 'years' },
    fr: { singular: 'année', plural: 'années' },
  },
  months: {
    en: { singular: 'month', plural: 'months' },
    fr: { singular: 'mois', plural: 'mois' },
  },
  weeks: {
    en: { singular: 'week', plural: 'weeks' },
    fr: { singular: 'semaine', plural: 'semaines' },
  },
  days: {
    en: { singular: 'day', plural: 'days' },
    fr: { singular: 'jour', plural: 'jours' },
  },
  hours: {
    en: { singular: 'hour', plural: 'hours' },
    fr: { singular: 'heure', plural: 'heures' },
  },
  minutes: {
    en: { singular: 'minute', plural: 'minutes' },
    fr: { singular: 'minute', plural: 'minutes' },
  },
  seconds: {
    en: { singular: 'second', plural: 'seconds' },
    fr: { singular: 'seconde', plural: 'secondes' },
  },
  milliseconds: {
    en: { singular: 'millisecond', plural: 'milliseconds' },
    fr: { singular: 'milliseconde', plural: 'millisecondes' },
  },
};

const listCache = new Map<string, Intl.ListFormat>();

function listKey(locale: string, style: 'long' | 'short' | 'narrow'): string {
  return `${locale ?? ''}::${style}`;
}

function getList(locale: string, style: 'long' | 'short' | 'narrow'): Intl.ListFormat {
  const key = listKey(locale, style);
  let formatter = listCache.get(key);
  if (!formatter) {
    formatter = new Intl.ListFormat(locale, { style, type: 'conjunction' });
    listCache.set(key, formatter);
  }
  return formatter;
}

function lang(locale: string): string {
  return locale.split('-')[0]?.toLowerCase() ?? 'en';
}

function label(unit: string, locale: string): LabelMap {
  const mapping = LABELS[unit]?.[lang(locale)] ?? LABELS[unit]?.['en'];
  if (mapping) return mapping;
  return { singular: unit, plural: `${unit}s` };
}

function formatUnit(value: number, locale: string, unit: string): string {
  const { singular, plural } = label(unit, locale);
  return `${value} ${value === 1 ? singular : plural}`;
}

export function formatDurationList(duration: DurationLike, options: FormatDurationListOptions = {}): string {
  const locale = options.locale ?? 'en';
  const style = options.style ?? 'long';
  const parts: string[] = [];

  for (const unit of UNITS) {
    const value = duration[unit];
    if (value !== undefined && value !== 0) {
      parts.push(formatUnit(value, locale, unit));
    }
  }

  if (parts.length === 0) {
    parts.push(formatUnit(0, locale, 'seconds'));
  }

  return getList(locale, style).format(parts);
}
