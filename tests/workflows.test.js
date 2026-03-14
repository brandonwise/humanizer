/**
 * workflows.test.js — Tests for scan/compare workflows.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  normalizeExtensions,
  collectTextFiles,
  scanPath,
  compareTexts,
  compareFiles,
} from '../src/workflows.js';

describe('normalizeExtensions', () => {
  it('normalizes bare extensions with dots', () => {
    expect(normalizeExtensions(['md', '.TXT', ' rst '])).toEqual(['.md', '.txt', '.rst']);
  });

  it('falls back to defaults on empty input', () => {
    const exts = normalizeExtensions([]);
    expect(exts.length).toBeGreaterThan(0);
    expect(exts).toContain('.md');
  });
});

describe('collectTextFiles', () => {
  it('collects matching files recursively and ignores node_modules', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'node_modules', 'x'), { recursive: true });

    fs.writeFileSync(path.join(tmp, 'README.md'), 'hello world');
    fs.writeFileSync(path.join(tmp, 'docs', 'guide.txt'), 'guide content');
    fs.writeFileSync(path.join(tmp, 'docs', 'script.js'), 'console.log(1);');
    fs.writeFileSync(path.join(tmp, 'node_modules', 'x', 'hidden.md'), 'should be ignored');

    const files = collectTextFiles(tmp, { exts: ['.md', '.txt'] });

    expect(files.some((f) => f.endsWith('README.md'))).toBe(true);
    expect(files.some((f) => f.endsWith('guide.txt'))).toBe(true);
    expect(files.some((f) => f.endsWith('script.js'))).toBe(false);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });
});

describe('scanPath', () => {
  it('returns sorted file scores and summary', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const aiText =
      'Great question! Here is a comprehensive overview. This serves as a testament to innovation. I hope this helps!';
    const humanText = 'The patch fixes two bugs. Build time dropped from 9m to 7m.';

    fs.writeFileSync(path.join(tmp, 'ai.md'), aiText);
    fs.writeFileSync(path.join(tmp, 'human.md'), humanText);

    const result = scanPath(tmp, { exts: ['md'], minWords: 3 });

    expect(result.summary.scannedFiles).toBe(2);
    expect(result.files.length).toBe(2);
    expect(result.files[0].score).toBeGreaterThanOrEqual(result.files[1].score);
    expect(result.files[0].file.endsWith('ai.md')).toBe(true);
  });
});

describe('compareTexts and compareFiles', () => {
  it('shows improvement when after text is cleaner', () => {
    const before =
      'Great question! Here is a comprehensive overview. In order to help, this serves as a testament to innovation. I hope this helps!';
    const after =
      'The release fixes three bugs and reduces API latency by 18%. We shipped it on Monday and monitored error rates overnight.';

    const result = compareTexts(before, after);

    expect(result.delta.score).toBeLessThan(0);
    expect(result.delta.matches).toBeLessThan(0);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it('compares files from disk', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-compare-'));
    const beforePath = path.join(tmp, 'before.md');
    const afterPath = path.join(tmp, 'after.md');

    fs.writeFileSync(beforePath, 'Great question! Here is a comprehensive breakdown.');
    fs.writeFileSync(afterPath, 'Short answer: we fixed it yesterday.');

    const result = compareFiles(beforePath, afterPath);
    expect(result.before.score).toBeGreaterThanOrEqual(0);
    expect(result.after.score).toBeGreaterThanOrEqual(0);
    expect(typeof result.delta.score).toBe('number');
  });
});
