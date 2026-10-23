export type TempoErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_MONTH_DAY'
  | 'INVALID_TIME'
  | 'INVALID_DURATION'
  | 'INVALID_PARSE'
  | 'INVALID_FORMAT'
  | 'INVALID_OFFSET'
  | 'INVALID_ROUNDING_MODE'
  | 'TIMEZONE_GAP'
  | 'TIMEZONE_OVERLAP'
  | 'UNKNOWN_TIMEZONE'
  | 'OUT_OF_RANGE'
  | 'INCOMPATIBLE_UNIT'
  | 'INVALID_INTERVAL';

export interface TempoErrorOptions {
  readonly input?: unknown;
  readonly index?: number;
  readonly cause?: unknown;
}

export class TempoError extends Error {
  readonly code: TempoErrorCode;
  readonly input?: unknown;
  readonly index?: number;

  constructor(code: TempoErrorCode, message: string, options: TempoErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'TempoError';
    this.code = code;
    this.input = options.input;
    this.index = options.index;
  }
}

export type ParseSuccess<T> = { readonly ok: true; readonly value: T };
export type ParseFailure = {
  readonly ok: false;
  readonly reason: TempoErrorCode;
  readonly message: string;
  readonly input: string;
  readonly index?: number;
};
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function parseOk<T>(value: T): ParseSuccess<T> {
  return { ok: true, value };
}

export function parseFail(
  reason: TempoErrorCode,
  message: string,
  input: string,
  index?: number,
): ParseFailure {
  return index === undefined
    ? { ok: false, reason, message, input }
    : { ok: false, reason, message, input, index };
}

export function unwrapParse<T>(result: ParseResult<T>): T {
  if (result.ok) return result.value;
  throw new TempoError(result.reason, result.message, {
    input: result.input,
    index: result.index,
  });
}
