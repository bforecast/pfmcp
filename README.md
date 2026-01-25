# Earnings MCP Server

MCP (Model Context Protocol) server for the earnings-worker portfolio and stock analysis API. Enables LLMs to query portfolio stats, scores, holdings, and stock data.

## Features

- **Portfolio Tools**: List portfolios, get holdings, view scoring breakdowns
- **Stock Tools**: Get quotes, detailed stock info, statistical metrics
- **AI Analysis**: Portfolio and stock analysis powered by Cloudflare Workers AI (Llama 3.1 8B)

## Installation

```bash
npm install
npm run build
```

## Configuration
The server is deployed on Cloudflare Workers. 

**Required Secrets** (Set via `wrangler secret put`):
- `MCP_SHARED_SECRET`: Shared token for authenticating with earnings-worker.

**AI Configuration**:
- Configured via `[ai]` binding in `wrangler.toml`. No separate secrets needed.

## Deployment
```bash
npm run deploy
```

## Testing
You can run the included test scripts to verify the deployed server:

```bash
# Run all tests (List, Quote, AI)
node test_script.js

# Test specific functionality
node test_aapl.js  # Stock Quote
node test_ai.js    # AI Analysis
```

### With MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### As stdio Transport (Node.js)
```bash
node dist/index.js
```

## Remote MCP Connection (Recommended)

Connect directly to the deployed worker without `bridge.js` - just like Context7 MCP:

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "earnings": {
      "url": "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp",
      "transport": "sse"
    }
  }
}
```

### Antigravity

Add to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "earnings": {
      "serverUrl": "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp"
    }
  }
}
```

### With Authentication (Optional)

#### Antigravity
```json
{
  "mcpServers": {
    "earnings": {
      "serverUrl": "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### Transport Details

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | GET | SSE stream for server notifications |
| `/mcp` | POST | JSON-RPC requests |
| `/mcp` | DELETE | Close session |
| `/health` | GET | Health check |
| `/tools` | GET | List available tools |


## Available Tools

| Tool | Description |
|------|-------------|
| `earnings_list_portfolios` | List all portfolios with stats (CAGR, Sharpe, etc.) |
| `earnings_get_portfolio_holdings` | Get portfolio holdings with allocations |
| `earnings_get_portfolio_score` | Get detailed portfolio scoring breakdown |
| `earnings_get_stock_quote` | Get stock quote and price data |
| `earnings_get_stock_details` | Get full stock details with history |
| `earnings_get_stock_stats` | Get stock statistical metrics |
| `earnings_ai_analyze_portfolio` | AI-powered portfolio analysis |
| `earnings_ai_analyze_stock` | AI-powered stock analysis |
| `earnings_ai_compare_portfolios` | Compare two portfolios side-by-side |
| `earnings_ai_market_sentiment` | Analyze market trends from top portfolios |
| `earnings_ai_comprehensive_stock_analysis` | Deep-dive (Value + Technicals) |

## Development

```bash
npm run dev  # Watch mode with tsx
```

## License

Private - For internal use only.
