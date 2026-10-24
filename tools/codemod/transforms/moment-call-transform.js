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
    return (ts.isIdentifier(base) && base.text === 'moment') || isMomentCall(base);
  }
  return false;
};

const getNodeText = (node, sourceFile) => sourceFile.text.substring(node.getStart(sourceFile), node.getEnd(sourceFile));

const getLeadingTrivia = (node, magicString, sourceFile) =>
  magicString.slice(node.getFullStart(sourceFile), node.getStart(sourceFile));

const extractStringArgument = (momentExpr, sourceFile) => {
  if (!ts.isCallExpression(momentExpr)) {
    return null;
  }

  if (momentExpr.arguments.length > 0) {
    const arg = momentExpr.arguments[0];
    return getNodeText(arg, sourceFile);
  }

  if (
    ts.isPropertyAccessExpression(momentExpr.expression) &&
    ts.isCallExpression(momentExpr.expression.expression)
  ) {
    return extractStringArgument(momentExpr.expression.expression, sourceFile);
  }

  return null;
};

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

const ensureImport = (state, importStatement) => {
  if (state.source.includes(importStatement)) return;
  state.addedImports.add(importStatement);
};

const selectTargetType = (pattern, parseArg, isUtc) => {
  const unbracketed = pattern.replace(/\[[^\]]*\]/g, '');
  const hasZoneToken = /[zZ]|XXX/.test(unbracketed);
  const hasTimeToken = /[HhmsSaAk]/.test(unbracketed);
  const cleanInput = parseArg ? parseArg.replace(/^['"`]|['"`]$/g, '').trim() : '';
  const inputHasZoneOrOffset = isUtc || /(?:T|\s)\d{2}.*(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(cleanInput);

  if (hasZoneToken || inputHasZoneOrOffset) {
    return 'ZonedDateTime';
  }
  if (hasTimeToken) {
    return 'LocalDateTime';
  }
  return 'LocalDate';
};

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

const transformFormat = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'format') return false;
  const momentExpr = receiver.expression;
  if (!ts.isCallExpression(momentExpr)) return false;

  const isUtcStatic =
    ts.isPropertyAccessExpression(momentExpr.expression) &&
    momentExpr.expression.name?.text === 'utc' &&
    ts.isIdentifier(momentExpr.expression.expression) &&
    momentExpr.expression.expression.text === 'moment';

  const isUtcMethod =
    ts.isPropertyAccessExpression(momentExpr.expression) &&
    momentExpr.expression.name?.text === 'utc' &&
    isMomentCall(momentExpr.expression.expression);

  if (!isMomentCall(momentExpr) && !isUtcStatic && !isUtcMethod) return false;

  const args = callExpression.arguments;
  if (args.length !== 1 || args[0].kind !== ts.SyntaxKind.StringLiteral) return false;
  const pattern = args[0].text;

  if (!pattern) {
    replaceCall(callExpression, `${getNodeText(momentExpr, sourceFile)}.toISOString()`, magicString, sourceFile);
    return true;
  }

  const parseArg =
    extractStringArgument(momentExpr, sourceFile) ??
    (momentExpr.arguments.length > 0 ? getNodeText(momentExpr.arguments[0], sourceFile) : getNodeText(momentExpr, sourceFile));

  const target = selectTargetType(pattern, parseArg, isUtcStatic || isUtcMethod);
  const mappedPattern = mapMomentPattern(pattern);

  replaceCall(callExpression, `format(${target}.parse(${parseArg}), '${mappedPattern}')`, magicString, sourceFile);
  ensureImport(state, `import { ${target} } from '@chloevpin/tempo';`);
  ensureImport(state, "import { format } from '@chloevpin/tempo/format';");
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

  const warning = '/* TEMPO-CODEMOD: review diff semantics manually */\n';
  if (!state.source.includes(warning.trim())) {
    state.warnings.add(warning);
  }
  const args = callExpression.arguments;
  const argText = args.map((arg) => getNodeText(arg, sourceFile)).join(', ');
  replaceCall(callExpression, `${getNodeText(momentExpr, sourceFile)}.diff(${argText})`, magicString, sourceFile);
  return true;
};

const transformUtc = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'utc') return false;
  const momentExpr = receiver.expression;

  let parseArg = null;
  if (ts.isIdentifier(momentExpr) && momentExpr.text === 'moment') {
    parseArg = callExpression.arguments.length > 0 ? getNodeText(callExpression.arguments[0], sourceFile) : '';
  } else if (isMomentCall(momentExpr)) {
    parseArg =
      extractStringArgument(momentExpr, sourceFile) ??
      (momentExpr.arguments.length > 0 ? getNodeText(momentExpr.arguments[0], sourceFile) : '');
  } else {
    return false;
  }

  replaceCall(callExpression, `ZonedDateTime.parse(${parseArg})`, magicString, sourceFile);
  ensureImport(state, "import { ZonedDateTime } from '@chloevpin/tempo';");
  return true;
};

const CALL_TRANSFORMS = [transformFormat, transformAdd, transformDiff, transformUtc];

export default function transformFile({ source }) {
  const magicString = new MagicString(source);
  const sourceFile = parseSourceFile(source);
  const state = {
    source,
    warnings: new Set(),
    addedImports: new Set(),
  };

  function visit(node) {
    if (ts.isCallExpression(node)) {
      for (const transform of CALL_TRANSFORMS) {
        if (transform(node, magicString, sourceFile, state)) return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (state.addedImports.size > 0) {
    let insertPos = 0;
    for (const statement of sourceFile.statements) {
      const text = source.substring(statement.getStart(sourceFile), statement.getEnd(sourceFile));
      if (text.trim().startsWith('import ') || text.trim().startsWith('export ')) {
        insertPos = statement.getEnd(sourceFile);
      } else {
        break;
      }
    }

    const importsText = Array.from(state.addedImports).join('\n') + '\n';
    if (insertPos === 0) {
      const suffix = source.length > 0 && source[0] !== '\n' ? '\n' : '';
      magicString.prepend(`${importsText}${suffix}`);
    } else {
      const prefix = !source.substring(0, insertPos).endsWith('\n') ? '\n' : '';
      magicString.appendRight(insertPos, `${prefix}${importsText}`);
    }
  }

  let result = magicString.toString();
  if (state.warnings.size > 0) {
    for (const warning of state.warnings) {
      if (!source.includes(warning.trim())) {
        result = warning + result;
      }
    }
  }

  return result;
}
