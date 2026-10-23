import { LocalDate } from '../core/local-date.js';
import { format, clearFormatCache, type Formattable } from './format.js';
import { tokenize, type FormatToken } from './tokens.js';
import { createLocalDateParser, type ParsedDateFields } from './parse.js';

LocalDate.registerLocalDateParser((input: string, pattern: string) =>
  createLocalDateParser()(input, pattern),
);

export { format, clearFormatCache, type Formattable };
export { tokenize, type FormatToken };
export { createLocalDateParser, type ParsedDateFields };
