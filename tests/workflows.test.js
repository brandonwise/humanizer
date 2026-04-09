/**
 * workflows.test.js — Tests for scan/compare workflows.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  normalizeExtensions,
  normalizeIgnoreDirs,
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

describe('normalizeIgnoreDirs', () => {
  it('merges defaults with user-supplied ignore dirs', () => {
    const dirs = normalizeIgnoreDirs(['generated']);
    expect(dirs.has('node_modules')).toBe(true);
    expect(dirs.has('generated')).toBe(true);
  });

  it('can disable default ignore dirs', () => {
    const dirs = normalizeIgnoreDirs(['generated'], false);
    expect(dirs.has('node_modules')).toBe(false);
    expect(dirs.has('generated')).toBe(true);
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

  it('supports custom ignored directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });

    fs.writeFileSync(path.join(tmp, 'docs', 'guide.md'), 'ship this change now');
    fs.writeFileSync(path.join(tmp, 'generated', 'noise.md'), 'Great question! I hope this helps!');

    const files = collectTextFiles(tmp, {
      exts: ['.md'],
      ignoreDirs: ['generated'],
    });

    expect(files.some((f) => f.endsWith('guide.md'))).toBe(true);
    expect(files.some((f) => f.includes('generated'))).toBe(false);
  });

  it('can disable default ignore directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'node_modules', 'pkg', 'doc.md'), 'scan me too');

    const files = collectTextFiles(tmp, {
      exts: ['.md'],
      includeDefaultIgnore: false,
    });

    expect(files.some((f) => f.includes('node_modules'))).toBe(true);
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
    expect(result.summary.uniquePatterns).toBeGreaterThan(0);
    expect(result.patternHotspots.length).toBeGreaterThan(0);
    expect(result.patternHotspots[0]).toHaveProperty('affectedFiles');
  });

  it('aggregates hotspot patterns across multiple files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const repeated1 =
      'Great question! This serves as a testament to innovation. Let me know if you need anything else.';
    const repeated2 =
      'Great question! This serves as a testament to modern workflows. Let me know if you need more detail.';

    fs.writeFileSync(path.join(tmp, 'one.md'), repeated1);
    fs.writeFileSync(path.join(tmp, 'two.md'), repeated2);

    const result = scanPath(tmp, { exts: ['md'], minWords: 3 });

    expect(result.patternHotspots.length).toBeGreaterThan(0);
    const sharedPattern = result.patternHotspots.find((p) => p.affectedFiles >= 2);
    expect(sharedPattern).toBeDefined();
    expect(sharedPattern.totalMatches).toBeGreaterThanOrEqual(sharedPattern.affectedFiles);
  });

  it('respects custom ignore dirs during scan', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'content'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });

    fs.writeFileSync(
      path.join(tmp, 'content', 'notes.md'),
      'The patch ships today. We validated with integration checks.',
    );
    fs.writeFileSync(
      path.join(tmp, 'generated', 'bot.md'),
      'Great question! This serves as a testament to innovation. I hope this helps!',
    );

    const result = scanPath(tmp, {
      exts: ['md'],
      minWords: 3,
      ignoreDirs: ['generated'],
    });

    expect(result.summary.scannedFiles).toBe(1);
    expect(result.files[0].file.endsWith('notes.md')).toBe(true);
  });

  it('can ignore code snippets during scan', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const content = [
      'Release notes',
      '```md',
      'Great question! This serves as a testament to innovation.',
      '```',
      'Shipped bug fixes and reduced latency by 18%.',
    ].join('\n');

    fs.writeFileSync(path.join(tmp, 'notes.md'), content);

    const regular = scanPath(tmp, { exts: ['md'], minWords: 3, ignoreCode: false });
    const ignoreCode = scanPath(tmp, { exts: ['md'], minWords: 3, ignoreCode: true });

    expect(regular.files[0].score).toBeGreaterThan(ignoreCode.files[0].score);
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

  it('supports ignoreCode option in compare workflows', () => {
    const before = '```md\nGreat question!\n```\nShipped bug fixes.';
    const after = '```md\nGreat question!\n```\nShipped bug fixes and lowered latency.';

    const regular = compareTexts(before, after);
    const codeAware = compareTexts(before, after, { ignoreCode: true });

    expect(regular.before.score).toBeGreaterThan(codeAware.before.score);
  });
});
