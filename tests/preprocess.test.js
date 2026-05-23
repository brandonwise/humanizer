import { describe, it, expect } from 'vitest';
import { prepareText, stripCodeSnippets, stripQuotedBlocks } from '../src/preprocess.js';

describe('stripCodeSnippets', () => {
  it('masks fenced code blocks and preserves line count', () => {
    const input = ['Intro line', '```js', "const x = 'Great question!';", '```', 'Outro line'].join(
      '\n',
    );

    const output = stripCodeSnippets(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Intro line');
    expect(output).toContain('Outro line');
    expect(output).not.toContain('Great question!');
    expect(output).not.toContain('const x');
  });

  it('masks inline code spans', () => {
    const input = 'Use `Great question!` only as an example.';
    const output = stripCodeSnippets(input);

    expect(output).not.toContain('Great question!');
    expect(output).toContain('Use');
    expect(output).toContain('only as an example.');
  });

  it('returns original text when no code snippets exist', () => {
    const input = 'This is plain prose with no snippet markers.';
    expect(stripCodeSnippets(input)).toBe(input);
  });
});

describe('stripQuotedBlocks', () => {
  it('masks markdown quote lines and preserves line count', () => {
    const input = [
      'Intro',
      '> Great question! This serves as a testament to innovation.',
      'Outro',
    ].join('\n');

    const output = stripQuotedBlocks(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Intro');
    expect(output).toContain('Outro');
    expect(output).not.toContain('Great question!');
    expect(output).not.toContain('testament to innovation');
  });

  it('masks HTML blockquotes', () => {
    const input = '<blockquote>Great question! I hope this helps!</blockquote>Real text.';
    const output = stripQuotedBlocks(input);

    expect(output).not.toContain('Great question!');
    expect(output).toContain('Real text.');
  });
});

describe('prepareText', () => {
  it('can combine code and quote masking', () => {
    const input = [
      '> Great question!',
      '```md',
      'Here is a comprehensive overview.',
      '```',
      'Real summary.',
    ].join('\n');

    const output = prepareText(input, { ignoreCode: true, ignoreQuotes: true });

    expect(output).not.toContain('Great question!');
    expect(output).not.toContain('comprehensive overview');
    expect(output).toContain('Real summary.');
  });
});
