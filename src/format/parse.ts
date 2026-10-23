import { TempoError, type ParseResult } from '../errors.js';
import { tokenize, type FormatToken } from './tokens.js';

export interface ParsedDateFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function createLocalDateParser(): (input: string, pattern: string) => ParseResult<ParsedDateFields> {
  return (input: string, pattern: string): ParseResult<ParsedDateFields> => parseDateFields(input, pattern);
}

/** Parse the numeric LocalDate subset of the formatter token language. */
export function parseDateFields(input: string, pattern: string): ParseResult<ParsedDateFields> {
  if (typeof input !== 'string' || typeof pattern !== 'string') {
    return {
      ok: false,
      reason: 'INVALID_PARSE',
      message: 'Expected string input and pattern',
      input: String(input),
    };
  }

  const captures: Array<'year' | 'month' | 'day'> = [];
  let source = '^';
  try {
    for (const token of tokenize(pattern)) {
      source += tokenSource(token, captures);
    }
  } catch (error) {
    const message = error instanceof TempoError ? error.message : 'Invalid date pattern';
    return { ok: false, reason: 'INVALID_FORMAT', message, input };
  }
  if (captures.length !== 3) {
    return {
      ok: false,
      reason: 'INVALID_FORMAT',
      message: 'LocalDate patterns must contain exactly one year, month, and day field',
      input,
    };
  }
  source += '$';

  const match = new RegExp(source, 'u').exec(input);
  if (!match) {
    return {
      ok: false,
      reason: 'INVALID_PARSE',
      message: `Input does not match pattern ${pattern}`,
      input,
    };
  }
  const values: { year?: number; month?: number; day?: number } = {};
  captures.forEach((field, index) => {
    values[field] = Number(match[index + 1]);
  });
  return {
    ok: true,
    value: values as ParsedDateFields,
  };
}

function tokenSource(token: FormatToken, captures: Array<'year' | 'month' | 'day'>): string {
  if (token.kind === 'literal') return escapeRegex(token.text);

  let field: 'year' | 'month' | 'day';
  let expression: string;
  switch (token.kind) {
    case 'year':
      if (token.text === 'yy') {
        throw new TempoError('INVALID_FORMAT', "Custom parsing does not support ambiguous 'yy' years");
      }
      field = 'year';
      expression = '[+-]?\\d{4,}';
      break;
    case 'month':
      if (token.text !== 'M' && token.text !== 'MM') {
        throw new TempoError('INVALID_FORMAT', `Custom parsing does not support '${token.text}' months`);
      }
      field = 'month';
      expression = token.text === 'M' ? '\\d{1,2}' : '\\d{2}';
      break;
    case 'day':
      field = 'day';
      expression = token.text === 'd' ? '\\d{1,2}' : '\\d{2}';
      break;
    default:
      throw new TempoError('INVALID_FORMAT', `Token '${token.text}' is not supported for LocalDate parsing`);
  }

  if (captures.includes(field)) {
    throw new TempoError('INVALID_FORMAT', `Pattern contains duplicate ${field} fields`);
  }
  captures.push(field);
  return `(${expression})`;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
