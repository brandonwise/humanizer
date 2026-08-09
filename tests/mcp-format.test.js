import { describe, expect, it } from 'vitest';
import { humanize } from '../src/humanizer.js';
import { formatHumanizeOutput, formatSuggestion } from '../mcp-server/format.js';

describe('MCP humanize formatting', () => {
  it('formats object suggestions as readable finding lines', () => {
    const output = formatSuggestion({
      pattern: 'AI vocabulary',
      text: 'delve',
      line: 1,
      suggestion: 'Tier 1 AI word: "delve". Use a simpler, more specific alternative.',
    });

    expect(output).toBe(
      '- L1: [AI vocabulary] "delve" -> Tier 1 AI word: "delve". Use a simpler, more specific alternative.',
    );
  });

  it('keeps string suggestions compatible', () => {
    expect(formatSuggestion('Cut chatbot filler.')).toBe('- Cut chatbot filler.');
  });

  it('does not render humanize findings as [object Object]', () => {
    const suggestions = humanize(
      'Great question! This comprehensive overview will delve into a seamless solution that serves as a testament to innovation. I hope this helps!',
    );
    const output = formatHumanizeOutput(suggestions);

    expect([...suggestions.critical, ...suggestions.important].length).toBeGreaterThan(0);
    expect(output).not.toContain('[object Object]');
    expect(output).toMatch(/- L\d+: \[[^\]]+\] ".+"/);
  });

  it('includes autofixed text only when requested', () => {
    const suggestions = humanize('In order to help, I hope this helps!', { autofix: true });

    expect(formatHumanizeOutput(suggestions)).not.toContain('Auto-fixed Text');
    expect(formatHumanizeOutput(suggestions, { autofix: true })).toContain('Auto-fixed Text');
  });
});
