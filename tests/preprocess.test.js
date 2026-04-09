import { describe, it, expect } from 'vitest';
import { stripCodeSnippets } from '../src/preprocess.js';

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
