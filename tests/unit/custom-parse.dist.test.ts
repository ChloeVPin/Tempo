import { describe, expect, it } from 'vitest';
import { LocalDate } from '../../dist/index.js';
import { createLocalDateParser, registerLocalDateParser } from '../../dist/format/index.js';

describe('custom LocalDate parsing from dist', () => {
  it('parses custom patterns through the published format entrypoint', () => {
    const date = LocalDate.parse('01/06/2026', 'dd/MM/yyyy');
    expect(date.toISO()).toBe('2026-06-01');
  });

  it('restores parser registration via the standalone dist export', () => {
    const originalParser = LocalDate.customPatternParser;
    LocalDate.customPatternParser = null;
    try {
      registerLocalDateParser(createLocalDateParser());
      expect(LocalDate.customPatternParser).not.toBeNull();

      const restored = LocalDate.parse('01/06/2026', 'dd/MM/yyyy');
      expect(restored.toISO()).toBe('2026-06-01');
    } finally {
      LocalDate.customPatternParser = originalParser;
    }
  });

  it('keeps unregistered patterns distinct from malformed patterns', () => {
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
