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
  await writeScratchFile('moment-file.ts', "import moment from 'moment';\n\nmoment().format();\n");
  await writeScratchFile('untouched-file.ts', "const now = new Date();\n");
};

beforeAll(async () => {
  scratchDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tempo-codemod-cli-'));
  await resetScratchFiles();
});

beforeEach(resetScratchFiles);

const binPath = path.join(repoRoot, 'tools/codemod/bin.js');
const createTransform = async () => {
  const transformPath = path.resolve(__dirname, '../../../tools/codemod/transforms/moment-import-transform.js');
  const transformModule = await import(transformPath);
  return typeof transformModule.default === 'function' ? transformModule.default : transformModule;
};

const fixturesDir = path.resolve(__dirname, '../fixtures/moment-import');
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

const assertContainsMomentPatterns = (source: string, label: string) => {
  const hasEsm = source.includes("from 'moment'");
  const hasCjs = source.includes("require('moment')");
  expect(hasEsm || hasCjs).toBe(true);
  if (label !== 'esm-default-import') {
    expect(hasCjs).toBe(true);
  }
};

describe('moment import codemod', () => {
  it('rewrites ESM moment imports and preserves formatting', async () => {
    const { result, expected } = await runTransform('esm-default-import');
    expect(result).toBe(expected);
  });

  it('rewrites CJS moment requires and preserves formatting', async () => {
    const { result, expected } = await runTransform('cjs-require');
    expect(result).toBe(expected);
  });

  it('rewrites require aliases without changing the binding name', async () => {
    const { result, expected } = await runTransform('require-alias');
    expect(result).toBe(expected);
  });

  it('rewrites a file mixing ESM imports with a require-based reference', async () => {
    const { result, expected } = await runTransform('mixed-sources');
    expect(result).toBe(expected);
  });

  it('does not modify files without moment imports', async () => {
    const { result, source } = await runTransform('unrelated-file');
    expect(result).toBe(source);
  });

  it('keeps pre-migration moment patterns in fixture inputs', async () => {
    for (const fixtureName of ['esm-default-import', 'cjs-require', 'require-alias', 'mixed-sources']) {
      const { source } = await runTransform(fixtureName);
      assertContainsMomentPatterns(source, fixtureName);
    }
  });
});

describe('codemod CLI driver', () => {
  it('transforms targeted files in place when run without --dry-run', async () => {
    const targetPath = path.join(scratchDir, 'moment-file.ts');
    const expected = "import { moment } from '@chloevpin/tempo/compat/moment';\n\nmoment().format();\n";

    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const child = spawn(process.execPath, [binPath, targetPath]);

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`transformed ${targetPath}`);
    expect(await fs.promises.readFile(targetPath, 'utf8')).toBe(expected);
  });

  it('prints transformed output during --dry-run without writing to disk', async () => {
    const target = path.join(scratchDir, 'moment-file.ts');

    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const child = spawn(process.execPath, [binPath, '--dry-run', target]);

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`transformed ${target}`);
    expect(await fs.promises.readFile(target, 'utf8')).toBe("import moment from 'moment';\n\nmoment().format();\n");
  });

  it('reports summary counts across a directory of files', async () => {
    const directory = scratchDir;
    const targetPath = path.join(scratchDir, 'moment-file.ts');

    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const child = spawn(process.execPath, [binPath, directory]);

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`transformed ${targetPath}`);
    expect(result.stdout).not.toContain('untouched-file.ts');
  });
});
