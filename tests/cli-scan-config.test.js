import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const CLI_PATH = path.resolve(process.cwd(), 'src', 'cli.js');

function runCli(args) {
  return spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
  });
}

describe('scan config handling', () => {
  it('loads scan defaults from --config and applies ignoreDirs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-config-'));
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });

    fs.writeFileSync(
      path.join(tmp, 'docs', 'notes.md'),
      'We shipped the patch Tuesday and validated error budgets overnight.',
    );
    fs.writeFileSync(
      path.join(tmp, 'generated', 'noise.md'),
      'Great question! This serves as a testament to innovation. I hope this helps!',
    );

    const configPath = path.join(tmp, 'humanizer.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          scan: {
            extensions: ['md'],
            minWords: 3,
            ignoreDirs: ['generated'],
          },
        },
        null,
        2,
      ),
    );

    const run = runCli(['scan', tmp, '--json', '--config', configPath]);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');

    const payload = JSON.parse(run.stdout);
    expect(payload.summary.scannedFiles).toBe(1);
    expect(payload.files[0].file.endsWith(path.join('docs', 'notes.md'))).toBe(true);
  });

  it('lets CLI flags override config defaults', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-config-'));
    const target = path.join(tmp, 'draft.md');

    fs.writeFileSync(target, 'Short patch note with enough words to pass local validation.');

    const configPath = path.join(tmp, 'humanizer.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          scan: {
            extensions: ['md'],
            minWords: 500,
          },
        },
        null,
        2,
      ),
    );

    const run = runCli(['scan', target, '--json', '--config', configPath, '--min-words', '1']);

    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout);
    expect(payload.summary.scannedFiles).toBe(1);
  });

  it('honors failAbove from config when CLI flag is absent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-config-'));
    const target = path.join(tmp, 'slop.md');

    fs.writeFileSync(
      target,
      'Great question! Here is a comprehensive overview that serves as a testament to innovation. I hope this helps!',
    );

    const configPath = path.join(tmp, 'humanizer.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          scan: {
            extensions: ['md'],
            minWords: 3,
            failAbove: 10,
          },
        },
        null,
        2,
      ),
    );

    const run = runCli(['scan', target, '--config', configPath]);

    expect(run.status).toBe(2);
    expect(run.stdout).toContain('REPO SCAN');
  });

  it('supports ignoreCode from config', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-config-'));
    const target = path.join(tmp, 'notes.md');

    fs.writeFileSync(
      target,
      [
        '```md',
        'Great question! This serves as a testament to innovation.',
        '```',
        'Shipped fixes.',
      ].join('\n'),
    );

    const configPath = path.join(tmp, 'humanizer.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          scan: {
            extensions: ['md'],
            minWords: 1,
            ignoreCode: true,
          },
        },
        null,
        2,
      ),
    );

    const run = runCli(['scan', target, '--json', '--config', configPath]);
    expect(run.status).toBe(0);

    const payload = JSON.parse(run.stdout);
    expect(payload.files[0].score).toBeLessThan(35);
  });

  it('supports baseline regression gating from config', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-config-'));
    const target = path.join(tmp, 'doc.md');
    const baselinePath = path.join(tmp, 'baseline.json');

    fs.writeFileSync(
      target,
      'Great question! Here is a comprehensive overview. This serves as a testament to innovation. I hope this helps!',
    );

    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          targetPath: tmp,
          files: [
            {
              file: target,
              score: 10,
              totalMatches: 1,
            },
          ],
        },
        null,
        2,
      ),
    );

    const configPath = path.join(tmp, 'humanizer.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          scan: {
            extensions: ['md'],
            minWords: 1,
            baseline: './baseline.json',
            regressionThreshold: 5,
            failOnRegression: true,
          },
        },
        null,
        2,
      ),
    );

    const run = runCli(['scan', target, '--json', '--config', configPath]);

    expect(run.status).toBe(3);

    const payload = JSON.parse(run.stdout);
    expect(payload.baselineComparison.summary.regressions).toBe(1);
    expect(payload.baselineComparison.regressions[0].relativePath).toBe('doc.md');
  });
});
