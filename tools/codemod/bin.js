#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import momentImportTransform from './transforms/moment-import-transform.js';
import momentCallTransform from './transforms/moment-call-transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const hasDryRun = args.includes('--dry-run') || args.includes('-d');
const hasHelp = args.includes('--help') || args.includes('-h');
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IGNORED_ENTRIES = new Set(['.git', 'node_modules', 'dist', 'coverage']);

if (hasHelp || args.length === 0) {
  console.log(`@chloevpin/tempo-codemod\n`);
  console.log('Usage:');
  console.log('  node tools/codemod/bin.js [options] <path>');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run   Print transformed files without writing changes.');
  console.log('  -h, --help  Show this help message.');
  process.exit(hasHelp ? 0 : 1);
}

const paths = args.filter((arg) => !arg.startsWith('-'));

const readFileIfSupported = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const transformSource = (source) => {
  const afterImport = momentImportTransform({ source });
  if (afterImport === source) return momentCallTransform({ source });
  return momentCallTransform({ source: afterImport });
};

const transformFile = (filePath, context) => {
  const source = readFileIfSupported(filePath);
  if (source === null) {
    return;
  }

  const result = transformSource(source);
  if (result !== source) {
    console.log(`transformed ${filePath}`);
    if (hasDryRun) {
      console.log(result);
    } else {
      fs.writeFileSync(filePath, result, 'utf8');
    }

    context.transformed += 1;
  }

  context.processed += 1;
};

const shouldWalkFile = (entryPath) => {
  const ext = path.extname(entryPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }

  const basename = path.basename(entryPath);
  return !basename.startsWith('.');
};

paths.forEach((target) => {
  if (IGNORED_ENTRIES.has(path.basename(path.resolve(target)))) {
    return;
  }

  let stat;
  try {
    stat = fs.statSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const context = { processed: 0, transformed: 0 };

  if (stat.isDirectory()) {
    const walk = (directory) => {
      for (const entry of fs.readdirSync(directory)) {
        if (IGNORED_ENTRIES.has(entry)) {
          continue;
        }

        const entryPath = path.join(directory, entry);
        const entryStat = fs.statSync(entryPath);
        if (entryStat.isDirectory()) {
          walk(entryPath);
          continue;
        }

        if (shouldWalkFile(entryPath)) {
          transformFile(entryPath, context);
        }
      }
    };

    walk(target);
  } else {
    transformFile(target, context);
  }

  console.log(`processed ${context.processed}, transformed ${context.transformed}`);
});
