import MagicString from 'magic-string';
import ts from 'typescript';

const MOMENT_MODULE_SPECIFIER = 'moment';
const COMPAT_MODULE_SPECIFIER = '@chloevpin/tempo/compat/moment';

const parseSourceFile = (source) =>
  ts.createSourceFile('transform.ts', source, ts.ScriptTarget.Latest, true);

const isMomentSource = (source) =>
  source && source.kind === ts.SyntaxKind.StringLiteral && source.text === MOMENT_MODULE_SPECIFIER;

const getLeadingTrivia = (node, magicString, sourceFile) =>
  magicString.slice(node.getFullStart(sourceFile), node.getStart(sourceFile));

const buildImportReplacement = (localName, quote) => {
  const binding = localName === 'moment' ? 'moment' : `moment as ${localName}`;
  return `import { ${binding} } from ${quote}${COMPAT_MODULE_SPECIFIER}${quote};`;
};

const buildRequireReplacement = (localName, quote) => {
  const binding = localName === 'moment' ? 'moment' : `moment: ${localName}`;
  return `{ ${binding} } = require(${quote}${COMPAT_MODULE_SPECIFIER}${quote})`;
};

const replaceImportDeclaration = (node, magicString, sourceFile) => {
  if (!isMomentSource(node.moduleSpecifier) || !node.importClause) {
    return;
  }

  const defaultName = node.importClause.name;
  if (!defaultName || defaultName.kind !== ts.SyntaxKind.Identifier || node.importClause.namedBindings) {
    return;
  }

  const localName = defaultName.text;
  const quote = node.moduleSpecifier.raw?.[0] ?? "'";
  const replacement = buildImportReplacement(localName, quote);

  magicString.overwrite(node.getStart(sourceFile), node.getEnd(), replacement);
};

const replaceRequireDeclaration = (statement, declaration, magicString, sourceFile) => {
  if (statement.declarationList.declarations.length !== 1) {
    return;
  }

  const callExpression = declaration.initializer;
  if (
    !callExpression ||
    callExpression.kind !== ts.SyntaxKind.CallExpression ||
    callExpression.expression.kind !== ts.SyntaxKind.Identifier ||
    callExpression.expression.text !== 'require'
  ) {
    return;
  }

  const localName = declaration.name?.text;
  if (!localName || declaration.name?.kind !== ts.SyntaxKind.Identifier) {
    return;
  }

  const momentArgument = callExpression.arguments?.find(isMomentSource);
  if (!momentArgument) {
    return;
  }

  const quote = momentArgument.raw?.[0] ?? "'";
  const replacement = buildRequireReplacement(localName, quote);

  magicString.overwrite(
    declaration.getStart(sourceFile),
    declaration.getEnd(),
    replacement
  );
};

export default function transformFile({ source }) {
  const magicString = new MagicString(source);
  const sourceFile = parseSourceFile(source);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      replaceImportDeclaration(node, magicString, sourceFile);
      return;
    }

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        replaceRequireDeclaration(node, declaration, magicString, sourceFile);
      });
    }
  });

  if (!magicString.hasChanged()) {
    return source;
  }

  return magicString.toString();
}
