import type { ParseResult } from '../errors.js';

export type LocalDatePatternParser = (input: string, pattern: string) => ParseResult<{
  readonly year: number;
  readonly month: number;
  readonly day: number;
}>;

const K = Symbol.for('@tempo/parser');

export function getLocalDateParser(): LocalDatePatternParser | null {
  return ((globalThis as unknown as Record<symbol, unknown>)[K] as LocalDatePatternParser | null) ?? null;
}

export function registerLocalDateParser(parser: LocalDatePatternParser | null): void {
  (globalThis as unknown as Record<symbol, unknown>)[K] = parser ?? null;
}

