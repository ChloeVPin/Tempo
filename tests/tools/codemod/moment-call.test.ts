import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const { spawn } = await import('node:child_process');

let scratchDir: string;

const writeScratchFile = async (fileName: string, contents: string) => {
  await fs.promises.writeFile(path.join(scratchDir, fileName), contents);
};

const resetScratchFiles = async () => {
  await writeScratchFile('moment-file.ts', "import moment from 'moment';\n\nmoment().format('YYYY-MM-DD');\n");
  await writeScratchFile('unrelated-file.ts', "const now = new Date();\n");
};

beforeAll(async () => {
  scratchDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tempo-codemod-call-'));
  await resetScratchFiles();
});

beforeEach(resetScratchFiles);

const createTransform = async () => {
  const transformPath = path.resolve(__dirname, '../../../tools/codemod/transforms/moment-call-transform.js');
  const transformModule = await import(transformPath);
  return typeof transformModule.default === 'function' ? transformModule.default : transformModule;
};

const fixturesDir = path.resolve(__dirname, '../fixtures/moment-call');
const runTransform = async (fixtureName: string) => {
  const fixturePath = path.join(fixturesDir, `${fixtureName}.ts`);
  const expectedPath = path.join(fixturesDir, `${fixtureName}.expected.ts`);
  const source = await fs.promises.readFile(fixturePath, 'utf8');
  const expected = await fs.promises.readFile(expectedPath, 'utf8');

  const transformModule = await createTransform();
  const transform = typeof transformModule === 'function' ? transformModule : transformModule.default;
  const result = transform({ source, path: fixturePath });

  return { source, result, expected };
};

describe('moment call codemod', () => {
  it('rewrites format to local date parse and preserves imports', async () => {
    const { result, expected } = await runTransform('format-local-date');
    expect(result).toBe(expected);
  });

  it('rewrites format with time tokens to LocalDateTime.parse', async () => {
    const { result, expected } = await runTransform('format-local-date-time');
    expect(result).toBe(expected);
  });

  it('rewrites add to Tempo plus syntax', async () => {
    const { result, expected } = await runTransform('add');
    expect(result).toBe(expected);
  });

  it('rewrites diff to Tempo diff syntax and leaves warning comment', async () => {
    const { result, expected } = await runTransform('diff');
    expect(result).toBe(expected);
  });

  it('rewrites utc to ZonedDateTime with UTC zone', async () => {
    const { result, expected } = await runTransform('utc');
    expect(result).toBe(expected);
  });

  it('does not match [zZ] inside bracketed literals', async () => {
    const transform = await createTransform();
    const source = "const iso = moment('2026-01-01').format('YYYY-MM-DD [Z]');\n";
    const result = transform({ source });
    expect(result).toContain('LocalDate.parse');
    expect(result).not.toContain('ZonedDateTime');
    expect(result).toContain("import { LocalDate } from '@chloevpin/tempo';");
  });

  it('maintains idempotency for warnings on repeated runs', async () => {
    const transform = await createTransform();
    const source = "const delta = moment('2026-01-02').diff(moment('2026-01-01'), 'day');\n";
    const firstPass = transform({ source });
    const secondPass = transform({ source: firstPass });
    const matches = secondPass.match(/TEMPO-CODEMOD: review diff semantics manually/g);
    expect(matches).toHaveLength(1);
  });

  it('executes transformed format-local-date output against dist without throwing', async () => {
    const { result } = await runTransform('format-local-date');
    const executableCode = `${result.replace("const moment = require('moment');", '// moment unused')}\nif (iso !== '2026-01-01') throw new Error('mismatch: ' + iso);\n`;

    const execResult = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', executableCode], { cwd: repoRoot });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
    });

    expect(execResult.code).toBe(0);
    expect(execResult.stderr).toBe('');
  });
});
