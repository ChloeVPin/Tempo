import { describe, expect, it } from 'vitest';
import { LocalDate } from '../../src/core/local-date.js';
import { TempoError } from '../../src/errors.js';
import { format } from '../../src/format/format.js';
import { createLocalDateParser, registerLocalDateParser } from '../../src/format/index.js';

const parseWithPattern = (input: string, pattern: string): LocalDate => LocalDate.parse(input, pattern);

describe('custom LocalDate parsing', () => {
  it('parses numeric date tokens strictly', () => {
    expect(parseWithPattern('01/06/2026', 'dd/MM/yyyy').toISO()).toBe('2026-06-01');
    expect(parseWithPattern('1/6/2026', 'd/M/yyyy').toISO()).toBe('2026-06-01');
  });

  it('round-trips formatter output with quoted literals', () => {
    const pattern = "dd 'of' MM yyyy";
    const date = LocalDate.of(2026, 6, 1);

    expect(parseWithPattern(format(date, pattern), pattern).equals(date)).toBe(true);
  });

  it('rejects mismatched input, unsupported tokens, and duplicate fields', () => {
    expect(() => parseWithPattern('2026/06/01', 'dd/MM/yyyy')).toThrowError(TempoError);
    expect(() => parseWithPattern('01/06/2026 trailing', 'dd/MM/yyyy')).toThrowError(TempoError);
    expect(() => parseWithPattern('Monday 01/06/2026', 'EEEE dd/MM/yyyy')).toThrowError(TempoError);
    expect(() => parseWithPattern('01/06/2026', 'dd/MM/yyyy yyyy')).toThrowError(TempoError);
    expect(() => parseWithPattern('06/2026', 'MM/yyyy')).toThrowError(TempoError);
  });

  it('preserves strict calendar validation', () => {
    try {
      parseWithPattern('31/02/2026', 'dd/MM/yyyy');
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_MONTH_DAY' });
    }
  });

  it('restores distinct parser error codes for unregistered and malformed patterns', () => {
    LocalDate.customPatternParser = null;
    try {
      try {
        LocalDate.parse('01/06/2026', 'dd/MM/yyyy');
      } catch (error) {
        expect(error).toMatchObject({ code: 'INVALID_PARSE' });
      }
    } finally {
      registerLocalDateParser(createLocalDateParser());
    }

    try {
      LocalDate.parse('01/06/2026', 'EEEE dd/MM/yyyy');
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_FORMAT' });
    }
  });
});
