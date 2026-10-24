import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
});
