/**
 * workflows.js — Higher-level analysis workflows.
 *
 * Adds repo/document workflows on top of the core analyzer:
 *   - scanPath: score many files at once
 *   - compareTexts / compareFiles: compare before/after drafts
 */

const fs = require('fs');
const path = require('path');
const { analyze } = require('./analyzer');

const DEFAULT_SCAN_EXTENSIONS = ['.md', '.txt', '.rst', '.adoc'];
const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.cache',
]);

/** Normalize extension list to lowercase with leading dots. */
function normalizeExtensions(exts) {
  if (!Array.isArray(exts) || exts.length === 0) return [...DEFAULT_SCAN_EXTENSIONS];
  return exts
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean)
    .map((e) => (e.startsWith('.') ? e : `.${e}`));
}

/**
 * Collect text files from a path.
 * If target is a file, returns that file only (if extension matches).
 */
function collectTextFiles(targetPath, opts = {}) {
  const { exts = DEFAULT_SCAN_EXTENSIONS, ignoreDirs = DEFAULT_IGNORE_DIRS } = opts;
  const normalizedExts = new Set(normalizeExtensions(exts));

  const absPath = path.resolve(targetPath);
  const st = fs.statSync(absPath);

  if (st.isFile()) {
    const ext = path.extname(absPath).toLowerCase();
    return normalizedExts.has(ext) ? [absPath] : [];
  }

  const files = [];
  const stack = [absPath];

  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          stack.push(full);
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (normalizedExts.has(ext)) {
        files.push(full);
      }
    }
  }

  return files.sort();
}

/** Count words (simple whitespace split). */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Scan file or directory and return per-file scores.
 */
function scanPath(targetPath, opts = {}) {
  const { exts = DEFAULT_SCAN_EXTENSIONS, minWords = 1, includeStats = false } = opts;

  const files = collectTextFiles(targetPath, { exts, ignoreDirs: opts.ignoreDirs });

  const results = [];
  const skipped = [];
  const patternHotspotMap = new Map();

  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf-8');
    } catch (err) {
      skipped.push({ file, reason: `read_error: ${err.message}` });
      continue;
    }

    const words = countWords(text);
    if (words < minWords) {
      skipped.push({ file, reason: `too_short: ${words} words` });
      continue;
    }

    const result = analyze(text, { includeStats, verbose: false });

    for (const finding of result.findings) {
      const existing = patternHotspotMap.get(finding.patternId) || {
        patternId: finding.patternId,
        patternName: finding.patternName,
        totalMatches: 0,
        affectedFiles: 0,
        maxPerFile: 0,
      };

      existing.totalMatches += finding.matchCount;
      existing.affectedFiles += 1;
      existing.maxPerFile = Math.max(existing.maxPerFile, finding.matchCount);

      patternHotspotMap.set(finding.patternId, existing);
    }

    results.push({
      file,
      score: result.score,
      label: scoreLabel(result.score),
      wordCount: result.wordCount,
      totalMatches: result.totalMatches,
      patternScore: result.patternScore,
      uniformityScore: result.uniformityScore,
      topPatterns: result.findings.slice(0, 3).map((f) => ({
        id: f.patternId,
        name: f.patternName,
        count: f.matchCount,
      })),
    });
  }

  results.sort((a, b) => b.score - a.score || b.totalMatches - a.totalMatches);

  const patternHotspots = [...patternHotspotMap.values()].sort(
    (a, b) =>
      b.totalMatches - a.totalMatches ||
      b.affectedFiles - a.affectedFiles ||
      b.maxPerFile - a.maxPerFile ||
      a.patternId - b.patternId,
  );

  const summary = {
    scannedFiles: results.length,
    skippedFiles: skipped.length,
    averageScore: results.length
      ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / results.length) * 100) / 100
      : 0,
    maxScore: results.length ? Math.max(...results.map((r) => r.score)) : 0,
    minScore: results.length ? Math.min(...results.map((r) => r.score)) : 0,
    uniquePatterns: patternHotspots.length,
  };

  return {
    targetPath: path.resolve(targetPath),
    summary,
    files: results,
    patternHotspots,
    skipped,
  };
}

/** Build pattern histogram from analysis result. */
function toPatternHistogram(result) {
  const map = new Map();
  for (const finding of result.findings) {
    map.set(finding.patternId, {
      patternId: finding.patternId,
      patternName: finding.patternName,
      beforeCount: 0,
      afterCount: 0,
    });
  }
  return map;
}

/**
 * Compare two text drafts and show score + pattern deltas.
 */
function compareTexts(beforeText, afterText) {
  const before = analyze(beforeText, { verbose: true, includeStats: true });
  const after = analyze(afterText, { verbose: true, includeStats: true });

  const histogram = toPatternHistogram(before);
  for (const f of after.findings) {
    if (!histogram.has(f.patternId)) {
      histogram.set(f.patternId, {
        patternId: f.patternId,
        patternName: f.patternName,
        beforeCount: 0,
        afterCount: 0,
      });
    }
  }

  for (const f of before.findings) {
    const item = histogram.get(f.patternId);
    item.beforeCount = f.matchCount;
  }
  for (const f of after.findings) {
    const item = histogram.get(f.patternId);
    item.afterCount = f.matchCount;
  }

  const deltas = [...histogram.values()].map((p) => ({
    ...p,
    delta: p.afterCount - p.beforeCount,
  }));

  const improvements = deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);

  const regressions = deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);

  return {
    before: {
      score: before.score,
      wordCount: before.wordCount,
      totalMatches: before.totalMatches,
      label: scoreLabel(before.score),
    },
    after: {
      score: after.score,
      wordCount: after.wordCount,
      totalMatches: after.totalMatches,
      label: scoreLabel(after.score),
    },
    delta: {
      score: after.score - before.score,
      matches: after.totalMatches - before.totalMatches,
    },
    improvements,
    regressions,
  };
}

/** Compare two files. */
function compareFiles(beforePath, afterPath) {
  const beforeText = fs.readFileSync(path.resolve(beforePath), 'utf-8');
  const afterText = fs.readFileSync(path.resolve(afterPath), 'utf-8');
  return compareTexts(beforeText, afterText);
}

function scoreLabel(s) {
  if (s <= 19) return 'Mostly human-sounding';
  if (s <= 44) return 'Lightly AI-touched';
  if (s <= 69) return 'Moderately AI-influenced';
  return 'Heavily AI-generated';
}

module.exports = {
  DEFAULT_SCAN_EXTENSIONS,
  normalizeExtensions,
  collectTextFiles,
  scanPath,
  compareTexts,
  compareFiles,
  scoreLabel,
};
