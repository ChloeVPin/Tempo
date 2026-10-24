import { format } from '@chloevpin/tempo/format';
import { ZonedDateTime } from '@chloevpin/tempo';

const valueInput = document.getElementById('format-value') as HTMLInputElement | null;
const patternInput = document.getElementById('format-pattern') as HTMLInputElement | null;
const output = document.getElementById('format-output') as HTMLPreElement | null;

function render() {
  const value = valueInput?.value ?? '';
  const pattern = patternInput?.value ?? '';

  if (!value || !pattern) {
    output!.textContent = 'Provide a value and pattern to preview formatted output.';
    return;
  }

  const supported = [
    'yyyy', 'yy', 'M', 'MM', 'd', 'dd',
    'HH', 'H', 'hh', 'h', 'mm', 'ss', 'SSS',
    'a', 'XXX', 'X', 'XX', 'zzzz', 'EEEE', 'MMMM'
  ];
  const tokenRegex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z])+/g;
  const unsupported = Array.from(value.matchAll(tokenRegex) ?? [])
    .map((match) => match[0]?.trim())
    .filter((token): token is string => Boolean(token) && !supported.includes(token));

  const knownIssues = unsupported.length
    ? `Unsupported or moment-style token${unsupported.length === 1 ? '' : 's'}: ${[...new Set(unsupported)].join(', ')}`
    : '';

  try {
    const zdt = ZonedDateTime.parse(value);
    const rendered = format(zdt, pattern);
    const lines = [
      `input: ${value}`,
      `pattern: ${pattern}`,
      ``,
      rendered,
    ];
    if (knownIssues) lines.push(``, knownIssues);
    output!.textContent = lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const lines = [
      `input: ${value}`,
      `pattern: ${pattern}`,
      ``,
      message,
    ];
    if (knownIssues) lines.push(``, knownIssues);
    output!.textContent = lines.join('\n');
  }
}

export function initFormatPreview() {
  valueInput?.addEventListener('input', render);
  patternInput?.addEventListener('input', render);
  render();
}
