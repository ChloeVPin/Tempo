import { TempoError, type ParseResult } from '../errors.js';
import type { LocalDate } from './local-date.js';

export type LocalDatePatternParser = (input: string, pattern: string) => ParseResult<{
  readonly year: number;
  readonly month: number;
  readonly day: number;
}>;

export const customDatePatternParser: LocalDatePatternParser | null = null;

export function registerLocalDateParser(parser: LocalDatePatternParser | null): void {
  if (!parser) {
    LocalDate.clearCustomDateParser();
    return;
  }
  LocalDate.registerLocalDateParser((input, pattern) => {
    const parsed = parser(input, pattern);
    if (!parsed.ok) return parsed;
    try {
      return {
        ok: true,
        value: LocalDate.of(parsed.value.year, parsed.value.month, parsed.value.day, 'reject'),
      };
    } catch (err) {
      const message = err instanceof TempoError ? err.message : 'Invalid date';
      const reason = err instanceof TempoError ? err.code : 'INVALID_DATE';
      return { ok: false, reason, message, input };
    }
  });
}
