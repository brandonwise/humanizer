/**
 * preprocess.js — Text preprocessing helpers.
 *
 * Used to optionally ignore code snippets when analyzing documentation.
 * We preserve line structure by masking non-newline characters so line
 * numbers in findings stay stable.
 */

const NON_NEWLINE = /[^\n]/g;
const FENCED_CODE_BLOCKS = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE_SPANS = /`[^`\n]+`/g;

function maskSnippet(snippet) {
  return snippet.replace(NON_NEWLINE, ' ');
}

/**
 * Strip (mask) code snippets while preserving original line breaks.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.fenced  Mask fenced code blocks (default true)
 * @param {boolean} opts.inline  Mask inline backtick code spans (default true)
 * @returns {string}
 */
function stripCodeSnippets(text, opts = {}) {
  if (!text || typeof text !== 'string') return '';

  const { fenced = true, inline = true } = opts;
  let processed = text;

  if (fenced) {
    processed = processed.replace(FENCED_CODE_BLOCKS, (m) => maskSnippet(m));
  }

  if (inline) {
    processed = processed.replace(INLINE_CODE_SPANS, (m) => maskSnippet(m));
  }

  return processed;
}

module.exports = {
  stripCodeSnippets,
};
