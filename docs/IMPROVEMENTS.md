# Humanizer improvements and roadmap

This file tracks what shipped and what we plan to build next.

## Shipped in v2.5

### Baseline-aware doc gating (`--baseline`, `--fail-on-regression`)

- Added baseline comparison support to `scan` so teams can compare current scores against a prior scan JSON file.
- Added configurable regression threshold (`--regression-threshold`) to ignore tiny score noise.
- Added regression-only CI gating (`--fail-on-regression`) so legacy docs do not block progress unless they get worse.
- Added config support (`scan.baseline`, `scan.regressionThreshold`, `scan.failOnRegression`).

Why: absolute score gates punish teams with existing docs debt. Regression-only gating keeps quality moving in the right direction while teams pay down old content gradually.

## Shipped in v2.4

### Code-aware analysis mode (`--ignore-code`)

- Added optional code-snippet masking for analysis, score, stats, suggest, report, scan, and compare workflows.
- Supports both fenced code blocks (```/~~~) and inline backtick snippets.
- Preserves line breaks while masking snippets, so finding line numbers stay stable.

Why: technical docs often include code examples that intentionally contain AI-style phrasing. Those snippets should not dominate writing-quality scores.

## Shipped in v2.3

### Detection hardening (pattern 29)

- Added **Invisible unicode obfuscation** detection (zero-width chars, soft hyphens, dense NBSP usage).
- Added safe auto-fix support to strip/normalize these characters.

Why: more detector-evasion tools now inject hidden unicode to appear "human" while remaining machine-generated.

## Shipped in v2.2

### New detection patterns (25-28)

- Reasoning chain artifacts
- Excessive structure
- Confidence calibration
- Acknowledgment loops

These additions improved detection on recent 2025-2026 model output where responses sound polished but still contain predictable assistant patterns.

### New CLI workflows

- `scan`: analyze a file or directory and rank documents by score
- `compare`: compare two drafts and show score + pattern deltas

These workflows make humanizer usable in docs QA and CI gates, not just one-off checks.

### Test coverage

- Added workflow tests (`tests/workflows.test.js`)
- Test suite now includes scan and compare behavior

## Why these updates mattered

The older feature set worked well for obvious chatbot text. The new patterns close gaps in subtler assistant writing, especially:

- question restatement loops
- over-structured responses to simple prompts
- confidence framing that sounds unnatural

## Current known limitations

- Docs that intentionally contain AI-style examples will score high unless `--ignore-code` is enabled
- Very short text can still be noisy

## Next candidate improvements

### Better non-English handling

Reduce false positives on multilingual docs and mixed-language text.

Why: current vocabulary-heavy checks are English-first.

## Validation checklist for each new pattern

- At least 5 positive tests
- At least 5 negative tests
- Edge cases for short/technical text
- Performance check to avoid slowing batch scans

## Notes for contributors

If you add a new pattern, include:

- clear rationale
- examples that should trigger
- examples that should not trigger
- a practical rewrite suggestion
