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
const MARKDOWN_BLOCKQUOTE_LINES = /^[ \t]*>.*$/gm;
const HTML_BLOCKQUOTES = /<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi;

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

/**
 * Strip (mask) quoted blocks while preserving original line breaks.
 *
 * Supports markdown/email-style blockquotes (leading >) and HTML blockquotes.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.markdown  Mask markdown/email quote lines (default true)
 * @param {boolean} opts.html  Mask HTML <blockquote> blocks (default true)
 * @returns {string}
 */
function stripQuotedBlocks(text, opts = {}) {
  if (!text || typeof text !== 'string') return '';

  const { markdown = true, html = true } = opts;
  let processed = text;

  if (html) {
    processed = processed.replace(HTML_BLOCKQUOTES, (m) => maskSnippet(m));
  }

  if (markdown) {
    processed = processed.replace(MARKDOWN_BLOCKQUOTE_LINES, (m) => maskSnippet(m));
  }

  return processed;
}

/**
 * Apply optional preprocessing transforms used by CLI workflows.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.ignoreCode
 * @param {boolean} opts.ignoreQuotes
 * @returns {string}
 */
function prepareText(text, opts = {}) {
  if (!text || typeof text !== 'string') return '';

  const { ignoreCode = false, ignoreQuotes = false } = opts;
  let processed = text;

  if (ignoreCode) {
    processed = stripCodeSnippets(processed);
  }

  if (ignoreQuotes) {
    processed = stripQuotedBlocks(processed);
  }

  return processed;
}

module.exports = {
  prepareText,
  stripCodeSnippets,
  stripQuotedBlocks,
};
