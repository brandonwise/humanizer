# Humanizer integrations

Use humanizer with Claude, ChatGPT, VS Code, OpenClaw, or your own app.

## Integration options

| Method | Platforms | Setup | Best for |
|---|---|---|---|
| MCP server | Claude, ChatGPT, VS Code | Medium | Shared tool access across clients |
| OpenAI Custom GPT | ChatGPT Plus | Easy | ChatGPT-only workflow |
| HTTP API | Any client | Medium | Custom apps and automations |
| SKILL.md | OpenClaw | Easy | OpenClaw-native workflows |

## Big Node codebase (CI-friendly scan)

For monorepos, set scan defaults once and keep CI calls short.

`.humanizer.json`:

```json
{
  "scan": {
    "extensions": ["md", "txt"],
    "minWords": 30,
    "failAbove": 45,
    "ignoreDirs": ["generated", "vendor", "fixtures"]
  }
}
```

CI command:

```bash
npx humanizer scan . --config .humanizer.json
```

Need a one-off override for a noisy subtree?

```bash
npx humanizer scan . --config .humanizer.json --ignore-dirs generated,vendor,tmp
```

## MCP server (recommended)

### Install

```bash
cd humanizer/mcp-server
npm install
```

### Claude Desktop config

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "humanizer": {
      "command": "node",
      "args": ["/path/to/humanizer/mcp-server/index.js"]
    }
  }
}
```

### VS Code config

Add this to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "humanizer": {
      "command": "node",
      "args": ["${workspaceFolder}/humanizer/mcp-server/index.js"]
    }
  }
}
```

### MCP tools exposed

- `score` — quick score (0-100)
- `analyze` — full pattern + stats report
- `humanize` — suggestions, optional auto-fix
- `stats` — statistical analysis only

## OpenAI Custom GPT

1. Go to <https://chat.openai.com/gpts/editor>
2. Create a GPT
3. Paste instructions from `openai-gpt/instructions.md`
4. Name it (for example, "Humanizer")
5. Optional: add Actions using `api-server/openapi.yaml`

### With Actions API

1. Deploy the API server
2. In GPT editor, open **Configure** → **Create new action**
3. Import the schema from your deployed `/api/openapi` endpoint

## HTTP API server

### Run locally

```bash
cd humanizer
node api-server/server.js
```

### Deploy (Cloudflare Workers example)

```bash
npx wrangler deploy
```

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/score` | POST | Return score only |
| `/api/analyze` | POST | Return full analysis |
| `/api/humanize` | POST | Return suggestions + optional autofix |
| `/api/stats` | POST | Return stats only |
| `/api/openapi` | GET | Return OpenAPI schema |

### API example

```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"text": "This draft needs tighter wording and more specifics."}'
```

## OpenClaw skill

Install from ClawHub:

```bash
clawhub install ai-humanizer
```

Or copy manually:

```bash
cp SKILL.md ~/.config/openclaw/skills/humanizer.md
```

## Always-on writing mode

If you want your assistant to avoid common AI writing tells by default, keep these rules in your system prompt:

- Skip filler intros and closers
- Prefer plain verbs and concrete nouns
- Use specific evidence over broad claims
- Vary sentence length naturally
- Keep tone direct

For full pattern guidance, reference `SKILL.md`.

## Troubleshooting

### MCP server is not connecting

1. Verify the path is absolute
2. Run `node mcp-server/index.js` manually
3. Check Claude or VS Code logs

### API returns 500

1. Confirm Node version is 18+
2. Check module format compatibility
3. Review server logs for stack traces

### Score looks off

Run `analyze --verbose` and review exactly which patterns fired.
