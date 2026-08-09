#!/usr/bin/env node
/**
 * Humanizer MCP Server
 *
 * Exposes AI writing detection and humanization tools via Model Context Protocol.
 * Works with Claude Desktop, ChatGPT, VS Code, and other MCP clients.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import humanizer modules
import { analyze, score } from '../src/analyzer.js';
import { humanize } from '../src/humanizer.js';
import { computeStats } from '../src/stats.js';
import { formatHumanizeOutput } from './format.js';

const server = new Server(
  {
    name: 'humanizer',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'score',
        description:
          'Quick AI score (0-100). Higher = more AI-like. 0-25 human, 26-50 light AI touch, 51-75 moderate, 76-100 heavy AI.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze for AI patterns',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'analyze',
        description:
          'Full AI writing analysis with pattern matches, scores by category, and statistical analysis (burstiness, vocabulary diversity, readability).',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze',
            },
            verbose: {
              type: 'boolean',
              description: 'Include all pattern matches (default: false)',
              default: false,
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'humanize',
        description:
          'Get suggestions to make text sound more human. Groups issues by priority (critical, important, guidance) with specific fixes.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to humanize',
            },
            autofix: {
              type: 'boolean',
              description: 'Apply safe mechanical fixes automatically (default: false)',
              default: false,
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'stats',
        description:
          'Statistical text analysis only: burstiness, type-token ratio, sentence variation, trigram repetition, readability score.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze statistically',
            },
          },
          required: ['text'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'score': {
        const s = score(args.text);
        const badge = s <= 25 ? '🟢' : s <= 50 ? '🟡' : s <= 75 ? '🟠' : '🔴';
        return {
          content: [
            {
              type: 'text',
              text: `${badge} AI Score: ${s}/100\n\n${
                s <= 25
                  ? 'Mostly human-sounding'
                  : s <= 50
                    ? 'Lightly AI-touched'
                    : s <= 75
                      ? 'Moderately AI-influenced'
                      : 'Heavily AI-generated'
              }`,
            },
          ],
        };
      }

      case 'analyze': {
        const result = analyze(args.text, {
          verbose: args.verbose || false,
          includeStats: true,
        });

        let output = '## AI Analysis\n\n';
        output += `**Score:** ${result.score}/100\n`;
        output += `**Pattern Score:** ${result.patternScore}/100\n`;
        output += `**Uniformity Score:** ${result.uniformityScore}/100\n\n`;

        if (result.categories) {
          output += '### Category Breakdown\n';
          for (const [cat, data] of Object.entries(result.categories)) {
            if (data.count > 0) {
              output += `- **${cat}:** ${data.count} issues\n`;
            }
          }
          output += '\n';
        }

        if (result.stats) {
          output += '### Statistical Signals\n';
          output += `- Burstiness: ${result.stats.burstiness?.toFixed(2) || 'N/A'} (human: 0.5-1.0, AI: 0.1-0.3)\n`;
          output += `- Type-Token Ratio: ${result.stats.typeTokenRatio?.toFixed(2) || 'N/A'} (human: 0.5-0.7, AI: 0.3-0.5)\n`;
          output += `- Readability (FK): ${result.stats.fleschKincaid?.toFixed(1) || 'N/A'}\n`;
        }

        if (args.verbose && result.findings?.length > 0) {
          output += '\n### Pattern Matches\n';
          for (const f of result.findings.slice(0, 10)) {
            output += `- **${f.pattern}:** "${f.match}" (weight: ${f.weight})\n`;
          }
          if (result.findings.length > 10) {
            output += `\n...and ${result.findings.length - 10} more\n`;
          }
        }

        return { content: [{ type: 'text', text: output }] };
      }

      case 'humanize': {
        const suggestions = humanize(args.text, { autofix: args.autofix || false });
        const output = formatHumanizeOutput(suggestions, { autofix: args.autofix || false });

        return { content: [{ type: 'text', text: output }] };
      }

      case 'stats': {
        const stats = computeStats(args.text);

        let output = '## Statistical Analysis\n\n';
        output += '| Metric | Value | Human Range | AI Range |\n';
        output += '|--------|-------|-------------|----------|\n';
        output += `| Burstiness | ${stats.burstiness?.toFixed(3) || 'N/A'} | 0.5-1.0 | 0.1-0.3 |\n`;
        output += `| Type-Token Ratio | ${stats.typeTokenRatio?.toFixed(3) || 'N/A'} | 0.5-0.7 | 0.3-0.5 |\n`;
        output += `| Sentence CoV | ${stats.sentenceCoV?.toFixed(3) || 'N/A'} | 0.4-0.8 | 0.15-0.35 |\n`;
        output += `| Trigram Repetition | ${stats.trigramRepetition?.toFixed(3) || 'N/A'} | <0.05 | >0.10 |\n`;
        output += `| Flesch-Kincaid | ${stats.fleschKincaid?.toFixed(1) || 'N/A'} | varies | 8-12 |\n`;

        return { content: [{ type: 'text', text: output }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Humanizer MCP server running on stdio');
}

main().catch(console.error);
