import MagicString from 'magic-string';
import ts from 'typescript';

const parseSourceFile = (source) =>
  ts.createSourceFile('transform.ts', source, ts.ScriptTarget.Latest, true);

const getNodeText = (node, sourceFile) =>
  sourceFile.text.substring(node.getStart(sourceFile), node.getEnd(sourceFile));

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

const escapePatternLiteral = (pattern) =>
  pattern.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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

const parseMomentChain = (node, sourceFile) => {
  let current = node;
  const operations = [];
  let isUtc = false;

  while (ts.isCallExpression(current)) {
    const expr = current.expression;

    // moment(...)
    if (ts.isIdentifier(expr) && expr.text === 'moment') {
      const argText = current.arguments.length > 0 ? getNodeText(current.arguments[0], sourceFile) : null;
      const cleanArg =
        current.arguments.length > 0 &&
        (ts.isStringLiteral(current.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(current.arguments[0]))
          ? current.arguments[0].text
          : (argText ? argText.replace(/^['"`]|['"`]$/g, '').trim() : null);
      operations.reverse();
      return { rootNode: current, isUtc, argText, cleanArg, operations };
    }

    // moment.utc(...)
    if (
      ts.isPropertyAccessExpression(expr) &&
      expr.name?.text === 'utc' &&
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'moment'
    ) {
      isUtc = true;
      const argText = current.arguments.length > 0 ? getNodeText(current.arguments[0], sourceFile) : null;
      const cleanArg =
        current.arguments.length > 0 &&
        (ts.isStringLiteral(current.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(current.arguments[0]))
          ? current.arguments[0].text
          : (argText ? argText.replace(/^['"`]|['"`]$/g, '').trim() : null);
      operations.reverse();
      return { rootNode: current, isUtc, argText, cleanArg, operations };
    }

    // <chain>.utc()
    if (ts.isPropertyAccessExpression(expr) && expr.name?.text === 'utc') {
      isUtc = true;
      current = expr.expression;
      continue;
    }

    // <chain>.add(...) or <chain>.subtract(...)
    if (
      ts.isPropertyAccessExpression(expr) &&
      (expr.name?.text === 'add' || expr.name?.text === 'subtract')
    ) {
      const methodName = expr.name.text;
      const args = current.arguments;
      if (args.length >= 1) {
        const amount = getNodeText(args[0], sourceFile);
        let unit = 'milliseconds';
        if (args.length >= 2 && ts.isStringLiteral(args[1])) {
          unit = normalizeUnit(args[1].text);
        }
        operations.push({ type: methodName, amount, unit });
        current = expr.expression;
        continue;
      }
    }

    break;
  }

  return null;
};

const buildTempoChain = (chainInfo, options, state) => {
  const { pattern = null, isUtc = chainInfo.isUtc } = options;

  let requireZone = isUtc;
  let requireTime = false;

  if (pattern !== null) {
    const unbracketed = pattern.replace(/\[[^\]]*\]/g, '');
    if (/[zZ]|XXX/.test(unbracketed)) requireZone = true;
    if (/[HhmsSaAk]/.test(unbracketed)) requireTime = true;
  }

  const cleanInput = chainInfo.cleanArg ?? '';
  const inputHasZoneOrOffset =
    isUtc ||
    /(?:T|\s)\d{2}.*(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(cleanInput) ||
    cleanInput.includes('[');
  const inputHasTime = /(?:T|\s)\d{2}:\d{2}/.test(cleanInput);
  const inputIsDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(cleanInput);
  const hasTimeOp = chainInfo.operations.some((op) =>
    ['hours', 'minutes', 'seconds', 'milliseconds'].includes(op.unit)
  );

  let baseExpr;
  const rawArg = chainInfo.argText;

  if (requireZone || inputHasZoneOrOffset) {
    if (!rawArg) {
      baseExpr = "ZonedDateTime.now('UTC')";
      state.tempoNamedImports.add('ZonedDateTime');
    } else if (inputIsDateOnly) {
      baseExpr = `LocalDateTime.combine(LocalDate.parse(${rawArg}), LocalTime.of(0, 0)).toZonedDateTime('UTC')`;
      state.tempoNamedImports.add('LocalDate');
      state.tempoNamedImports.add('LocalDateTime');
      state.tempoNamedImports.add('LocalTime');
    } else if (inputHasZoneOrOffset) {
      baseExpr = `ZonedDateTime.parse(${rawArg})`;
      state.tempoNamedImports.add('ZonedDateTime');
    } else {
      baseExpr = `LocalDateTime.parse(${rawArg}).toZonedDateTime('UTC')`;
      state.tempoNamedImports.add('LocalDateTime');
    }
  } else if (requireTime || hasTimeOp || inputHasTime) {
    if (!rawArg) {
      baseExpr = 'LocalDateTime.now()';
      state.tempoNamedImports.add('LocalDateTime');
    } else if (inputIsDateOnly) {
      baseExpr = `LocalDateTime.combine(LocalDate.parse(${rawArg}), LocalTime.of(0, 0))`;
      state.tempoNamedImports.add('LocalDate');
      state.tempoNamedImports.add('LocalDateTime');
      state.tempoNamedImports.add('LocalTime');
    } else {
      baseExpr = `LocalDateTime.parse(${rawArg})`;
      state.tempoNamedImports.add('LocalDateTime');
    }
  } else {
    // Date-only
    if (!rawArg) {
      baseExpr = 'LocalDate.today()';
      state.tempoNamedImports.add('LocalDate');
    } else {
      baseExpr = `LocalDate.parse(${rawArg})`;
      state.tempoNamedImports.add('LocalDate');
    }
  }

  let expr = baseExpr;
  for (const op of chainInfo.operations) {
    const methodName = op.type === 'add' ? 'plus' : 'minus';
    expr = `${expr}.${methodName}({ ${op.unit}: ${op.amount} })`;
  }

  return expr;
};

const transformFormat = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'format') return false;

  const chainInfo = parseMomentChain(receiver.expression, sourceFile);
  if (!chainInfo) return false;

  const args = callExpression.arguments;
  if (args.length !== 1 || (!ts.isStringLiteral(args[0]) && !ts.isNoSubstitutionTemplateLiteral(args[0]))) {
    return false;
  }
  const pattern = args[0].text;

  if (!pattern) {
    const targetExpr = buildTempoChain(chainInfo, { pattern: null }, state);
    replaceCall(callExpression, `${targetExpr}.toISO()`, magicString, sourceFile);
    return true;
  }

  const targetExpr = buildTempoChain(chainInfo, { pattern }, state);
  const mappedPattern = mapMomentPattern(pattern);
  const escapedPattern = escapePatternLiteral(mappedPattern);

  replaceCall(callExpression, `format(${targetExpr}, '${escapedPattern}')`, magicString, sourceFile);
  state.formatImport = true;
  return true;
};

const transformAdd = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver)) return false;
  const methodName = receiver.name?.text;
  if (methodName !== 'add' && methodName !== 'subtract') return false;

  const chainInfo = parseMomentChain(callExpression, sourceFile);
  if (!chainInfo) return false;

  const replacement = buildTempoChain(chainInfo, { pattern: null }, state);
  replaceCall(callExpression, replacement, magicString, sourceFile);
  return true;
};

const transformDiff = (callExpression, magicString, sourceFile, state) => {
  if (!ts.isCallExpression(callExpression)) return false;
  const receiver = callExpression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name?.text !== 'diff') return false;
  const momentExpr = receiver.expression;
  if (!parseMomentChain(momentExpr, sourceFile)) return false;

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

  let chainInfo = null;
  if (ts.isPropertyAccessExpression(receiver) && receiver.name?.text === 'utc') {
    chainInfo = parseMomentChain(callExpression, sourceFile);
  } else if (
    ts.isPropertyAccessExpression(callExpression.expression) &&
    callExpression.expression.name?.text === 'utc'
  ) {
    chainInfo = parseMomentChain(callExpression, sourceFile);
  }

  if (!chainInfo) return false;

  const replacement = buildTempoChain(chainInfo, { pattern: null, isUtc: true }, state);
  replaceCall(callExpression, replacement, magicString, sourceFile);
  return true;
};

const CALL_TRANSFORMS = [transformFormat, transformDiff, transformAdd, transformUtc];

export default function transformFile({ source }) {
  const magicString = new MagicString(source);
  const sourceFile = parseSourceFile(source);
  const state = {
    source,
    warnings: new Set(),
    tempoNamedImports: new Set(),
    formatImport: false,
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

  const importLines = [];
  if (state.tempoNamedImports.size > 0) {
    const sorted = Array.from(state.tempoNamedImports).sort().join(', ');
    const stmt = `import { ${sorted} } from '@chloevpin/tempo';`;
    if (!source.includes(stmt)) {
      importLines.push(stmt);
    }
  }
  if (state.formatImport) {
    const stmt = "import { format } from '@chloevpin/tempo/format';";
    if (!source.includes(stmt)) {
      importLines.push(stmt);
    }
  }

  if (importLines.length > 0) {
    let insertPos = 0;
    for (const statement of sourceFile.statements) {
      const text = source.substring(statement.getStart(sourceFile), statement.getEnd(sourceFile));
      if (text.trim().startsWith('import ') || text.trim().startsWith('export ')) {
        insertPos = statement.getEnd(sourceFile);
      } else {
        break;
      }
    }

    const importsText = importLines.join('\n') + '\n';
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
