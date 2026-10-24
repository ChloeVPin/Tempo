import MagicString from 'magic-string';
import ts from 'typescript';

const parseSourceFile = (source) =>
  ts.createSourceFile('transform.ts', source, ts.ScriptTarget.Latest, true);

const isMomentCall = (node) => {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return callee.text === 'moment';
  }
  if (ts.isPropertyAccessExpression(callee)) {
    if (callee.name?.text !== 'utc') return false;
    const base = callee.expression;
    return ts.isIdentifier(base) && base.text === 'moment';
  }
  return false;
};

const getNodeText = (node, sourceFile) => sourceFile.text.substring(node.getStart(sourceFile), node.getEnd(sourceFile));

const getLeadingTrivia = (node, magicString, sourceFile) =>
  magicString.slice(node.getFullStart(sourceFile), node.getStart(sourceFile));

const mapMomentPattern = (pattern) => {
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '[') {
      const end = pattern.indexOf(']', i + 1);
      if (end === -1) {
        out += `'${pattern.slice(i)}'`;
        break;
      }
      out += `'${pattern.slice(i + 1, end).replace(/'/g, "''")}'`;
      i = end + 1;
      continue;
    }
    const rest = pattern.slice(i);
    const mapped = matchToken(rest);
    if (mapped) {
      out += mapped.tempo;
      i += mapped.consumed;
      continue;
    }
    out += quoteIfNeeded(pattern[i]);
    i += 1;
  }
  return out;
};

const matchToken = (rest) => {
  const table = [
    ['YYYY', 'yyyy'],
    ['YY', 'yy'],
    ['Y', 'y'],
    ['MMMM', 'MMMM'],
    ['MMM', 'MMM'],
    ['MM', 'MM'],
    ['M', 'M'],
    ['DD', 'dd'],
    ['D', 'd'],
    ['dddd', 'EEEE'],
    ['ddd', 'EEE'],
    ['HH', 'HH'],
    ['H', 'H'],
    ['hh', 'hh'],
    ['h', 'h'],
    ['mm', 'mm'],
    ['m', 'm'],
    ['ss', 'ss'],
    ['s', 's'],
    ['SSS', 'SSS'],
    ['A', 'a'],
    ['a', 'a'],
    ['ZZ', 'XX'],
    ['Z', 'XXX'],
  ];
  for (const [momentToken, tempo] of table) {
    if (rest.startsWith(momentToken)) return { tempo, consumed: momentToken.length };
  }
  return null;
};

const quoteIfNeeded = (ch) => (/[A-Za-z]/.test(ch) ? `'${ch}'` : ch);

const UNIT_ALIASES = {
  d: 'days',
  day: 'days',
  days: 'days',
  w: 'weeks',
  week: 'weeks',
  weeks: 'weeks',
  M: 'months',
  month: 'months',
  months: 'months',
  y: 'years',
  year: 'years',
  years: 'years',
  h: 'hours',
  hour: 'hours',
  hours: 'hours',
  min: 'minutes',
  minute: 'minutes',
  minutes: 'minutes',
  s: 'seconds',
  sec: 'seconds',
  second: 'seconds',
  seconds: 'seconds',
  ms: 'milliseconds',
  millisecond: 'milliseconds',
  milliseconds: 'milliseconds',
};

const normalizeUnit = (unit) => UNIT_ALIASES[unit] || unit;

const replaceCall = (node, replacement, magicString, sourceFile) => {
  const leading = getLeadingTrivia(node, magicString, sourceFile);
  magicString.overwrite(node.getFullStart(sourceFile), node.getEnd(sourceFile), `${leading}${replacement}`);
};

const transformFormat = (callExpression, magicString, sourceFile) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'format') return false;
  const momentExpr = receiver.expression;
  if (!isMomentCall(momentExpr)) return false;

  const args = callExpression.arguments;
  if (args.length !== 1 || args[0].kind !== ts.SyntaxKind.StringLiteral) return false;
  const pattern = args[0].text;

  if (!pattern) {
    replaceCall(callExpression, `${getNodeText(momentExpr, sourceFile)}.toISO()`, magicString, sourceFile);
    return true;
  }

  let target = 'LocalDate';
  if (/[Hhmsa]/u.test(pattern) || /HH:mm:ss/u.test(pattern)) target = 'LocalDateTime';
  else if (/[zZ]|[+-]\d{2}/u.test(pattern) || /XXX/u.test(pattern)) target = 'ZonedDateTime';

  const mappedPattern = mapMomentPattern(pattern);
  if (target === 'LocalDate') {
    replaceCall(callExpression, `format(LocalDate.parse(${getNodeText(momentExpr, sourceFile)}), '${mappedPattern}')`, magicString, sourceFile);
  } else if (target === 'LocalDateTime') {
    replaceCall(callExpression, `format(LocalDateTime.parse(${getNodeText(momentExpr, sourceFile)}), '${mappedPattern}')`, magicString, sourceFile);
  } else {
    replaceCall(callExpression, `format(${getNodeText(momentExpr, sourceFile)}.zoned, '${mappedPattern}')`, magicString, sourceFile);
  }
  return true;
};

const transformAdd = (callExpression, magicString, sourceFile) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'add') return false;
  const momentExpr = receiver.expression;
  if (!isMomentCall(momentExpr)) return false;

  const args = callExpression.arguments;
  if (args.length < 1 || args[0].kind !== ts.SyntaxKind.NumericLiteral) return false;

  const amount = args[0].text;
  let unit = 'milliseconds';
  if (args.length === 2 && args[1].kind === ts.SyntaxKind.StringLiteral) {
    unit = normalizeUnit(args[1].text);
  }

  replaceCall(callExpression, `${getNodeText(momentExpr, sourceFile)}.plus({ ${unit}: ${amount} })`, magicString, sourceFile);
  return true;
};

const transformDiff = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'diff') return false;
  const momentExpr = receiver.expression;
  if (!isMomentCall(momentExpr)) return false;

  state.warnings.push(`/* TEMPO-CODEMOD: review diff semantics manually */\n`);
  const args = callExpression.arguments;
  const argText = args.map((arg) => getNodeText(arg, sourceFile)).join(', ');
  replaceCall(callExpression, `${getNodeText(momentExpr, sourceFile)}.diff(${argText})`, magicString, sourceFile);
  return true;
};

const transformUtc = (callExpression, magicString, sourceFile) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'utc') return false;
  const momentExpr = receiver.expression;
  if (!ts.isCallExpression(momentExpr) || !ts.isPropertyAccessExpression(momentExpr.expression)) return false;
  const base = momentExpr.expression;
  if (!ts.isIdentifier(base) || base.text !== 'moment') return false;

  const argText = getNodeText(momentExpr.arguments[0], sourceFile);
  replaceCall(callExpression, `ZonedDateTime.parse(${argText})`, magicString, sourceFile);
  return true;
};

const CALL_TRANSFORMS = [transformFormat, transformAdd, transformDiff, transformUtc];

export default function transformFile({ source }) {
  const magicString = new MagicString(source);
  const sourceFile = parseSourceFile(source);
  const state = { warnings: [] };

  function visit(node) {
    if (ts.isCallExpression(node)) {
      for (const transform of CALL_TRANSFORMS) {
        if (transform(node, magicString, sourceFile, state)) return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  let result = magicString.toString();
  if (state.warnings.length > 0) {
    result = state.warnings.join('') + result;
  }

  return result;
}
