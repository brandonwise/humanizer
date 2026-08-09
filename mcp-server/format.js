function formatSuggestion(suggestion) {
  if (typeof suggestion === 'string') {
    return `- ${suggestion}`;
  }

  const line = Number.isFinite(suggestion?.line) ? `L${suggestion.line}: ` : '';
  const pattern = suggestion?.pattern ? `[${suggestion.pattern}] ` : '';
  const text = suggestion?.text ? `"${suggestion.text}"` : 'Finding';
  const fix = suggestion?.suggestion ? ` -> ${suggestion.suggestion}` : '';

  return `- ${line}${pattern}${text}${fix}`;
}

function formatHumanizeOutput(suggestions, options = {}) {
  let output = '## Humanization Suggestions\n\n';

  if (suggestions.critical?.length > 0) {
    output += '### 🔴 Critical (Dead giveaways)\n';
    for (const s of suggestions.critical) {
      output += `${formatSuggestion(s)}\n`;
    }
    output += '\n';
  }

  if (suggestions.important?.length > 0) {
    output += '### 🟠 Important (Noticeable patterns)\n';
    for (const s of suggestions.important) {
      output += `${formatSuggestion(s)}\n`;
    }
    output += '\n';
  }

  if (suggestions.guidance?.length > 0) {
    output += '### 🟡 Guidance (Writing tips)\n';
    for (const s of suggestions.guidance.slice(0, 5)) {
      output += `- ${s}\n`;
    }
    output += '\n';
  }

  if (options.autofix && suggestions.autofix?.text) {
    output += `### ✅ Auto-fixed Text\n\n${suggestions.autofix.text}\n`;
  }

  return output;
}

export { formatHumanizeOutput, formatSuggestion };
