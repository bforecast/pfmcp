/**
 * MCP Server for Earnings Worker API - Cloudflare Workers Entry Point
 * 
 * Simple JSON-RPC based MCP implementation for Cloudflare Workers.
 * Handles MCP protocol directly without Node.js dependencies.
 */

import { getEarningsApiUrl } from './constants.js';

// Environment interface
interface Env {
    EARNINGS_API_URL: string;
    // Secrets
    AUTH_USERNAME?: string;
    AUTH_PASSWORD?: string;
    AUTH_COOKIE?: string;
    MCP_SHARED_SECRET?: string;
    // Bindings
    AI: any;
}

// ... existing code ...

// Tool definitions
const TOOLS = [
    {
        name: "earnings_list_portfolios",
        description: "List all portfolios with stats (CAGR, Sharpe, Sortino, etc.)",
        inputSchema: {
            type: "object",
            properties: {
                response_format: {
                    type: "string",
                    enum: ["markdown", "json"],
                    default: "markdown",
                    description: "Output format"
                }
            }
        }
    },
    {
        name: "earnings_get_portfolio_holdings",
        description: "Get portfolio holdings with allocations and prices",
        inputSchema: {
            type: "object",
            properties: {
                group_id: { type: "number", description: "Portfolio ID" },
                portfolio_name: { type: "string", description: "Portfolio Name (fuzzy match) if ID not known" },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            }
        }
    },
    {
        name: "earnings_get_portfolio_score",
        description: "Get detailed portfolio scoring breakdown",
        inputSchema: {
            type: "object",
            properties: {
                group_id: { type: "number", description: "Portfolio ID" },
                portfolio_name: { type: "string", description: "Portfolio Name (fuzzy match) if ID not known" },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            }
        }
    },
    {
        name: "earnings_get_stock_quote",
        description: "Get stock quote and price data",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Stock ticker symbol (e.g., AAPL)" },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            },
            required: ["symbol"]
        }
    },
    {
        name: "earnings_get_stock_details",
        description: "Get full stock details with history, earnings, and holdings",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Stock ticker symbol" },
                include_history: { type: "boolean", default: true },
                include_earnings: { type: "boolean", default: true },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            },
            required: ["symbol"]
        }
    },
    {
        name: "earnings_get_stock_stats",
        description: "Get stock statistical metrics (volatility, Sharpe, returns)",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Stock ticker symbol" },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            },
            required: ["symbol"]
        }
    },
    {
        name: "earnings_ai_analyze_portfolio",
        description: "AI-powered portfolio analysis using Llama 3.1 8B",
        inputSchema: {
            type: "object",
            properties: {
                group_id: { type: "number", description: "Portfolio ID" },
                portfolio_name: { type: "string", description: "Portfolio Name (fuzzy match) if ID not known" },
                question: { type: "string", description: "Optional specific question" }
            }
        }
    },
    {
        name: "earnings_ai_analyze_stock",
        description: "AI-powered stock analysis using Llama 3.1 8B",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Stock ticker symbol" },
                question: { type: "string", description: "Optional specific question" }
            },
            required: ["symbol"]
        }
    },
    {
        name: "earnings_ai_compare_portfolios",
        description: "Compare two portfolios side-by-side using AI",
        inputSchema: {
            type: "object",
            properties: {
                portfolio_id_a: { type: "string", description: "First Portfolio ID" },
                portfolio_id_b: { type: "string", description: "Second Portfolio ID" },
                question: { type: "string", description: "Optional specific question" }
            },
            required: ["portfolio_id_a", "portfolio_id_b"]
        }
    },
    {
        name: "earnings_ai_market_sentiment",
        description: "Analyze market trends based on top performing portfolios",
        inputSchema: {
            type: "object",
            properties: {
                top_n: { type: "number", description: "Number of top portfolios to analyze (default 5, max 10)", default: 5 },
                question: { type: "string", description: "Optional specific question" }
            },
        }
    },
    {
        name: "earnings_ai_comprehensive_stock_analysis",
        description: "Deep-dive analysis covering Valuation and Technical Trends (Short/Long term)",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Stock ticker symbol" },
                question: { type: "string", description: "Optional specific request" }
            },
            required: ["symbol"]
        }
    },
    {
        name: "earnings_get_health",
        description: "Check connectivity to the earnings backend API",
        inputSchema: {
            type: "object",
            properties: {}
        }
    }
];

// API helper
async function apiRequest(env: Env, path: string): Promise<any> {
    const baseUrl = env.EARNINGS_API_URL || 'https://pf.bforecast.com';
    try {
        const url = `${baseUrl}${path}`;
        const headers: Record<string, string> = {
            'User-Agent': 'Earnings-MCP-Server/1.0',
            'Accept': 'application/json'
        };

        // Pass auth headers
        if (env.MCP_SHARED_SECRET) {
            headers['X-Auth-Token'] = env.MCP_SHARED_SECRET;
        } else if (env.AUTH_COOKIE) {
            headers['Cookie'] = env.AUTH_COOKIE;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error ${response.status} for ${url}: ${text.substring(0, 200)}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Helper for standardizing percentage display
function formatPercent(val: number | undefined | null): string {
    if (val === undefined || val === null) return 'N/A';
    // Heuristic: If val > 1.5 or < -1.5, assume it's already a percentage (e.g. 5, 124.69)
    // If small decimal (e.g. 0.15), multiply by 100.
    // Note: This heuristic fails for returns between 1.5% and 150% if the API is mixed, but works for observed data.
    const isPercent = Math.abs(val) > 1.5;
    return (isPercent ? val : val * 100).toFixed(1) + '%';
}

// Helper to resolve portfolio ID from ID or Name
async function resolvePortfolioId(env: Env, args: any): Promise<{ id: number; name: string } | null> {
    if (args.group_id) {
        return { id: Number(args.group_id), name: `Portfolio ${args.group_id}` };
    }

    if (args.portfolio_name) {
        const nameQuery = args.portfolio_name.toLowerCase();
        const data = await apiRequest(env, '/api/portfolios');
        if (!Array.isArray(data)) return null;

        // Exact match
        let match = data.find((p: any) => p.name.toLowerCase() === nameQuery);
        if (match) return { id: match.id, name: match.name };

        // Prefix match
        match = data.find((p: any) => p.name.toLowerCase().startsWith(nameQuery));
        if (match) return { id: match.id, name: match.name };

        // Contains match
        match = data.find((p: any) => p.name.toLowerCase().includes(nameQuery));
        if (match) return { id: match.id, name: match.name };
    }
    return null;
}

// AI helper
async function runAI(env: Env, prompt: string): Promise<string> {
    if (!env.AI) {
        return "Error: AI binding not configured.";
    }

    try {
        const response: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                { role: 'system', content: 'You are a helpful financial analyst. Be concise.' },
                { role: 'user', content: prompt }
            ]
        });

        return response.response || JSON.stringify(response);
    } catch (error) {
        return `AI error: ${error instanceof Error ? error.message : String(error)}`;
    }
}

// Tool handlers
async function handleTool(env: Env, name: string, args: any): Promise<string> {
    try {
        switch (name) {
            case 'earnings_list_portfolios': {
                const data = await apiRequest(env, '/api/portfolios');
                if (args.response_format === 'json') return JSON.stringify(data, null, 2);
                if (!Array.isArray(data)) return `Error: Expected array but got ${typeof data}: ${JSON.stringify(data)}`;
                return data.map((p: any) =>
                    `## ${p.name} (ID: ${p.id})\n- Holdings: ${p.member_count}\n- CAGR: ${formatPercent(p.cagr)}\n- Sharpe: ${p.sharpe?.toFixed(2) || 'N/A'}\n- Score: ${p.last_score?.toFixed(1) || 'N/A'}`
                ).join('\n\n');
            }

            case 'earnings_get_portfolio_holdings': {
                const resolved = await resolvePortfolioId(env, args);
                if (!resolved) return 'Error: Please provide a valid group_id or portfolio_name.';

                const data = await apiRequest(env, `/api/dashboard-data?groupId=${resolved.id}`);
                if (args.response_format === 'json') return JSON.stringify(data, null, 2);
                const holdings = data.data || [];
                return `# ${resolved.name} Holdings\n\n` +
                    holdings.map((h: any) => {
                        return `- **${h.symbol}**: ${formatPercent(h.allocation)} @ $${h.price?.toFixed(2) || 'N/A'}`;
                    }).join('\n');
            }

            case 'earnings_get_portfolio_score': {
                const resolved = await resolvePortfolioId(env, args);
                if (!resolved) return 'Error: Please provide a valid group_id or portfolio_name.';

                const data = await apiRequest(env, `/api/scoring/${resolved.id}`);
                if (args.response_format === 'json') return JSON.stringify(data, null, 2);
                return `# ${resolved.name} Score\n\n**Total**: ${data.total_score?.toFixed(1) || 'N/A'}\n- Holdings: ${data.holdings_score?.toFixed(1)}\n- Performance: ${data.performance_score?.toFixed(1)}`;
            }

            case 'earnings_get_stock_quote':
            case 'earnings_get_stock_details':
            case 'earnings_get_stock_stats': {
                const symbol = args.symbol.toUpperCase();
                const data = await apiRequest(env, `/api/stock-details/${symbol}`);
                if (!data || !data.quote) return `No data found for ${symbol}`;

                if (args.response_format === 'json') return JSON.stringify(data.quote, null, 2);
                const q = data.quote;
                return `# ${symbol} - ${q.name || 'Unknown'}\n\n**Price**: $${q.price?.toFixed(2)}\n- P/E: ${q.pe_ratio?.toFixed(1) || 'N/A'}\n- Market Cap: $${q.market_cap ? (q.market_cap / 1e9).toFixed(1) + 'B' : 'N/A'}\n- Volatility: ${q.volatility ? (q.volatility * 100).toFixed(1) + '%' : 'N/A'}`;
            }

            case 'earnings_ai_analyze_portfolio': {
                const resolved = await resolvePortfolioId(env, args);
                if (!resolved) return 'Error: Please provide a valid group_id or portfolio_name.';

                const data = await apiRequest(env, `/api/portfolios`);
                const portfolio = data.find((p: any) => p.id === resolved.id);
                if (!portfolio) return 'Portfolio not found';

                const context = `Portfolio: ${portfolio.name}\nID: ${portfolio.id}\nCAGR: ${formatPercent(portfolio.cagr)}\nSharpe: ${portfolio.sharpe?.toFixed(2) || 'N/A'}\nHoldings: ${portfolio.member_count}`;
                const prompt = args.question
                    ? `${context}\n\nUser Question: ${args.question}`
                    : `${context}\n\nProvide 3 key insights about this portfolio's performance.`;

                return await runAI(env, prompt);
            }

            case 'earnings_ai_analyze_stock': {
                const symbol = args.symbol.toUpperCase();
                const data = await apiRequest(env, `/api/stock-details/${symbol}`);
                const q = data.quote;
                if (!q) return `No data found for ${symbol}`;

                const context = `Stock: ${symbol} (${q.name})\nPrice: $${q.price?.toFixed(2)}\nP/E: ${q.pe_ratio?.toFixed(1) || 'N/A'}\nMarket Cap: $${q.market_cap ? (q.market_cap / 1e9).toFixed(1) + 'B' : 'N/A'}\nVolatility: ${q.volatility ? (q.volatility * 100).toFixed(1) + '%' : 'N/A'}`;

                const prompt = args.question
                    ? `${context}\n\nUser Question: ${args.question}`
                    : `${context}\n\nProvide 3 key insights about this stock's valuation.`;

                return await runAI(env, prompt);
            }

            case 'earnings_ai_compare_portfolios': {
                const idA = Number(args.portfolio_id_a);
                const idB = Number(args.portfolio_id_b);

                const data = await apiRequest(env, `/api/portfolios`);

                const pA = data.find((p: any) => p.id === idA);
                const pB = data.find((p: any) => p.id === idB);

                if (!pA || !pB) return `Error: Could not find one or both portfolios (IDs: ${args.portfolio_id_a}, ${args.portfolio_id_b})`;

                const context = `
Portfolio A: ${pA.name} (ID: ${pA.id})
- CAGR: ${formatPercent(pA.cagr)}
- Sharpe: ${pA.sharpe?.toFixed(2) || 'N/A'}
- Holdings: ${pA.member_count}
- Score: ${pA.last_score?.toFixed(1) || 'N/A'}

Portfolio B: ${pB.name} (ID: ${pB.id})
- CAGR: ${formatPercent(pB.cagr)}
- Sharpe: ${pB.sharpe?.toFixed(2) || 'N/A'}
- Holdings: ${pB.member_count}
- Score: ${pB.last_score?.toFixed(1) || 'N/A'}
`;
                const prompt = args.question
                    ? `${context}\n\nUser Question: ${args.question}`
                    : `${context}\n\nCompare these two portfolios. Which one offers better risk-adjusted returns? What are the trade-offs?`;

                return await runAI(env, prompt);
            }

            case 'earnings_ai_market_sentiment': {
                const n = Math.min(Math.max(args.top_n || 5, 3), 10); // Clamp between 3 and 10

                const data = await apiRequest(env, `/api/portfolios`);
                if (!Array.isArray(data)) return 'Error fetching portfolios';

                // Sort by Score desc, then CAGR desc
                const topPortfolios = data
                    .filter((p: any) => p.last_score !== undefined)
                    .sort((a: any, b: any) => (b.last_score || 0) - (a.last_score || 0))
                    .slice(0, n);

                if (topPortfolios.length === 0) return 'No rated portfolios found to analyze.';

                const context = `Top ${n} Performing Portfolios:\n` + topPortfolios.map((p: any) =>
                    `- ${p.name}: Score ${p.last_score?.toFixed(1)}, Return ${formatPercent(p.cagr)}, Sharpe ${p.sharpe?.toFixed(2)}`
                ).join('\n');

                const prompt = args.question
                    ? `${context}\n\nUser Question: ${args.question}`
                    : `${context}\n\nBased on these winning portfolios, what market trends or strategies seem to be favoring right now? Synthesize a market sentiment summary.`;

                return await runAI(env, prompt);
            }



            case 'earnings_ai_comprehensive_stock_analysis': {
                const symbol = args.symbol.toUpperCase();
                const data = await apiRequest(env, `/api/stock-details/${symbol}`);
                const q = data.quote;
                if (!q) return `No data found for ${symbol}`;

                // Extract RS Rank 1M from SVG (it's in the quote object)
                let rsRank = "N/A";
                if (q.rs_rank_1m) {
                    const match = q.rs_rank_1m.match(/data-score="(\d+)"/);
                    if (match) rsRank = match[1];
                }

                // Calculate PEG if we have forward PE and growth
                let peg = "N/A";
                if (q.peg_ratio) {
                    peg = q.peg_ratio.toFixed(2);
                } else if (q.forward_pe && q.eps_next_year && q.eps_current_year) {
                    // Estimate growth: (next - current) / current * 100
                    const growth = ((q.eps_next_year - q.eps_current_year) / q.eps_current_year) * 100;
                    if (growth > 0) peg = (q.forward_pe / growth).toFixed(2);
                }

                const context = `
Stock: ${symbol} (${q.name})
Price: $${q.price?.toFixed(2)}

**Valuation:**
- P/E (Trailing): ${q.pe_ratio?.toFixed(1) || 'N/A'}
- Forward P/E: ${q.forward_pe?.toFixed(1) || 'N/A'}
- Price/Sales: ${q.ps_ratio?.toFixed(1) || 'N/A'}
- PEG Ratio: ${peg}

**Technicals:**
- SMA 20: $${q.sma_20?.toFixed(2) || 'N/A'} — Price is ${q.price > q.sma_20 ? 'ABOVE ✓ (Bullish)' : 'BELOW ✗ (Bearish)'}
- SMA 50: $${q.sma_50?.toFixed(2) || 'N/A'} — Price is ${q.price > q.sma_50 ? 'ABOVE ✓ (Bullish)' : 'BELOW ✗ (Bearish)'}
- SMA 200: $${q.sma_200?.toFixed(2) || 'N/A'} — Price is ${q.price > q.sma_200 ? 'ABOVE ✓ (Bullish)' : 'BELOW ✗ (Bearish)'}
- RS Rank (1M): ${rsRank} (0-99 scale, higher is better)

**Returns:**
- Daily Change: ${formatPercent(q.change_percent)}
- YTD: ${formatPercent(q.change_ytd)}
- 1 Year: ${formatPercent(q.change_1y)}
- Distance from 52W High: ${q.delta_52w_high?.toFixed(1) || 'N/A'}%
`;
                const prompt = args.question
                    ? `${context}\n\nUser Request: ${args.question}`
                    : `${context}\n\nPerform a comprehensive analysis of this stock.
1. Valuation Analysis: Is it overvalued or undervalued based on PE/PEG?
2. Technical Trend: What is the trend based on SMAs and Returns?
3. Momentum: What does the RS Rank indicate?
4. Verdict: Bullish, Bearish, or Neutral?`;

                return await runAI(env, prompt);
            }

            case 'earnings_get_health': {
                try {
                    const data = await apiRequest(env, '/health');
                    return `Backend Health: ${data.status || 'OK'}`;
                } catch (error) {
                    return `Backend Health: Error - ${error instanceof Error ? error.message : String(error)}`;
                }
            }

            default:
                return `Unknown tool: ${name}`;
        }
    } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}

// MCP JSON-RPC handler
async function handleMcpRequest(env: Env, body: any): Promise<any> {
    const { jsonrpc, method, params, id } = body;

    if (jsonrpc !== '2.0') {
        return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id };
    }

    switch (method) {
        case 'initialize':
            return {
                jsonrpc: '2.0',
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'earnings-mcp-server', version: '1.0.0' }
                },
                id
            };

        case 'tools/list':
            return {
                jsonrpc: '2.0',
                result: { tools: TOOLS },
                id
            };

        case 'resources/list':
            return {
                jsonrpc: '2.0',
                result: { resources: [] },
                id
            };

        case 'resources/read':
            return {
                jsonrpc: '2.0',
                result: { contents: [] },
                id
            };

        case 'tools/call':
            const { name, arguments: args } = params;
            const result = await handleTool(env, name, args || {});
            return {
                jsonrpc: '2.0',
                result: {
                    content: [{ type: 'text', text: result }]
                },
                id
            };

        default:
            return { jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id };
    }
}

// Session store for SSE streams (ephemeral, resets on cold start)
// Key: sessionId, Value: { writer, encoder, created }
const sessions = new Map<string, {
    writer: WritableStreamDefaultWriter<Uint8Array>;
    encoder: TextEncoder;
    created: number;
}>();

// Clean up old sessions (older than 30 minutes)
function cleanupSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    for (const [id, session] of sessions) {
        if (now - session.created > maxAge) {
            try { session.writer.close(); } catch { }
            sessions.delete(id);
        }
    }
}

// Generate interactive HTML testing console directly from TOOLS array (Single Source of Truth)
function generateToolsHtml(tools: typeof TOOLS): string {
    const toolsJson = JSON.stringify(tools);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Earnings MCP Server - Interactive Tools Console</title>
    <style>
        :root {
            --bg: #0f172a;
            --surface: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #38bdf8;
            --primary-hover: #0284c7;
            --accent: #10b981;
            --badge-bg: #0369a1;
            --code-bg: #090d16;
        }
        @media (prefers-color-scheme: light) {
            :root {
                --bg: #f8fafc;
                --surface: #ffffff;
                --border: #e2e8f0;
                --text: #0f172a;
                --text-muted: #64748b;
                --primary: #0284c7;
                --primary-hover: #0369a1;
                --accent: #059669;
                --badge-bg: #e0f2fe;
                --code-bg: #f1f5f9;
            }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.5;
            padding: 2rem 1rem;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        header {
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
        }
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 0.75rem;
        }
        h1 { font-size: 1.75rem; font-weight: 700; }
        .badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.6rem;
            border-radius: 9999px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-muted);
        }
        .badge.active { background: #064e3b; color: #6ee7b7; border-color: #059669; }
        .sub-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            color: var(--text-muted);
            font-size: 0.875rem;
        }
        .quick-actions {
            margin-bottom: 2rem;
            background: var(--surface);
            padding: 1rem 1.25rem;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        .quick-title {
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 0.75rem;
        }
        .btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button {
            cursor: pointer;
            border: none;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            padding: 0.5rem 0.9rem;
            transition: all 0.15s ease;
        }
        .btn-quick {
            background: var(--code-bg);
            color: var(--primary);
            border: 1px solid var(--border);
        }
        .btn-quick:hover {
            border-color: var(--primary);
            background: var(--surface);
        }
        .search-box {
            width: 100%;
            margin-bottom: 1.5rem;
            padding: 0.75rem 1rem;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
            font-size: 0.95rem;
            outline: none;
        }
        .search-box:focus { border-color: var(--primary); }
        .tool-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1.25rem;
        }
        .tool-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 0.5rem;
        }
        .tool-name {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 1.05rem;
            font-weight: 600;
            color: var(--primary);
        }
        .tool-desc {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 1rem;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 0.25rem;
            text-transform: uppercase;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            border: 1px solid var(--border);
            background: var(--code-bg);
            color: var(--text);
            font-size: 0.875rem;
            outline: none;
        }
        .form-group input:focus, .form-group select:focus {
            border-color: var(--primary);
        }
        .btn-exec {
            background: var(--primary);
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
        }
        .btn-exec:hover { background: var(--primary-hover); }
        .btn-exec:disabled { opacity: 0.5; cursor: not-allowed; }
        .result-box {
            margin-top: 1rem;
            padding: 1rem;
            background: var(--code-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.85rem;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 350px;
            overflow-y: auto;
        }
        .result-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border);
        }
        a { color: var(--primary); text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container">
    <header>
        <div class="header-top">
            <h1>Earnings MCP Server</h1>
            <div class="badges">
                <span class="badge active">● Live</span>
                <span class="badge">${tools.length} Tools (v2.0.0)</span>
                <span class="badge">Streamable HTTP (POST /mcp)</span>
            </div>
        </div>
        <div class="sub-bar">
            <span>Interactive Web Console & Direct Tool Execution</span>
            <div>
                <a href="/tools?format=json" target="_blank">📄 View Raw JSON</a> &nbsp;|&nbsp;
                <a href="/health" target="_blank">🩺 Health Check</a>
            </div>
        </div>
    </header>

    <div class="quick-actions">
        <div class="quick-title">⚡ Quick Tests (One-Click Execution)</div>
        <div class="btn-group">
            <button class="btn-quick" onclick="quickRun('earnings_get_stock_quote', { symbol: 'NVDA' })">⚡ NVDA Quote</button>
            <button class="btn-quick" onclick="quickRun('earnings_get_stock_quote', { symbol: 'AAPL' })">⚡ AAPL Quote</button>
            <button class="btn-quick" onclick="quickRun('earnings_get_stock_stats', { symbol: 'NVDA' })">⚡ NVDA Stats</button>
            <button class="btn-quick" onclick="quickRun('earnings_get_stock_details', { symbol: 'NVDA', include_history: true, include_earnings: true })">⚡ NVDA Details</button>
            <button class="btn-quick" onclick="quickRun('earnings_list_portfolios', { response_format: 'markdown' })">⚡ List Portfolios</button>
            <button class="btn-quick" onclick="quickRun('earnings_get_health', {})">⚡ Backend Health</button>
        </div>
    </div>

    <input type="text" id="search" class="search-box" placeholder="🔍 Filter tools by name or description (e.g. quote, portfolio, ai, stats)..." oninput="filterTools()">

    <div id="tools-container">
        ${tools.map(tool => {
            const props = (tool.inputSchema as any)?.properties || {};
            const propKeys = Object.keys(props);
            return `
            <div class="tool-card" id="card-${tool.name}" data-name="${tool.name.toLowerCase()}" data-desc="${(tool.description || '').toLowerCase()}">
                <div class="tool-header">
                    <span class="tool-name">${tool.name}</span>
                </div>
                <div class="tool-desc">${tool.description || ''}</div>
                ${propKeys.length > 0 ? `
                <div class="form-grid">
                    ${propKeys.map(key => {
                        const p = props[key];
                        let defaultVal = p.default !== undefined ? p.default : '';
                        if (key === 'symbol' && !defaultVal) defaultVal = 'NVDA';
                        if (key === 'group_id' && !defaultVal) defaultVal = '1';
                        
                        if (p.enum && Array.isArray(p.enum)) {
                            return `
                            <div class="form-group">
                                <label>${key}</label>
                                <select id="field-${tool.name}-${key}">
                                    ${p.enum.map((opt: string) => `<option value="${opt}" ${opt === defaultVal ? 'selected' : ''}>${opt}</option>`).join('')}
                                </select>
                            </div>`;
                        } else if (p.type === 'boolean') {
                            return `
                            <div class="form-group">
                                <label>${key}</label>
                                <select id="field-${tool.name}-${key}">
                                    <option value="true" ${defaultVal === true ? 'selected' : ''}>true</option>
                                    <option value="false" ${defaultVal === false ? 'selected' : ''}>false</option>
                                </select>
                            </div>`;
                        } else {
                            return `
                            <div class="form-group">
                                <label>${key}${(tool.inputSchema as any)?.required?.includes(key) ? ' *' : ''}</label>
                                <input type="${p.type === 'number' ? 'number' : 'text'}" 
                                       id="field-${tool.name}-${key}" 
                                       value="${defaultVal}" 
                                       placeholder="${p.description || key}">
                            </div>`;
                        }
                    }).join('')}
                </div>` : ''}
                <button class="btn-exec" id="btn-${tool.name}" onclick="execTool('${tool.name}')">▶ Execute Tool</button>
                <div class="result-box" id="res-${tool.name}" style="display:none;"></div>
            </div>`;
        }).join('')}
    </div>
</div>

<script>
const TOOLS_MAP = ${toolsJson};

function filterTools() {
    const q = document.getElementById('search').value.toLowerCase().trim();
    document.querySelectorAll('.tool-card').forEach(card => {
        const name = card.getAttribute('data-name');
        const desc = card.getAttribute('data-desc');
        card.style.display = (name.includes(q) || desc.includes(q)) ? 'block' : 'none';
    });
}

async function quickRun(name, args) {
    for (const [k, v] of Object.entries(args)) {
        const field = document.getElementById('field-' + name + '-' + k);
        if (field) field.value = v;
    }
    const card = document.getElementById('card-' + name);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    await callMcp(name, args);
}

async function execTool(name) {
    const toolDef = TOOLS_MAP.find(t => t.name === name);
    const args = {};
    if (toolDef && toolDef.inputSchema && toolDef.inputSchema.properties) {
        for (const [k, p] of Object.entries(toolDef.inputSchema.properties)) {
            const field = document.getElementById('field-' + name + '-' + k);
            if (field) {
                let val = field.value;
                if (p.type === 'number') val = val === '' ? undefined : Number(val);
                else if (p.type === 'boolean') val = val === 'true';
                if (val !== undefined && val !== '') args[k] = val;
            }
        }
    }
    await callMcp(name, args);
}

async function callMcp(name, args) {
    const btn = document.getElementById('btn-' + name);
    const resBox = document.getElementById('res-' + name);
    if (!resBox) return;

    if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Calling /mcp...';
    }
    resBox.style.display = 'block';
    resBox.innerHTML = '<span style="color:var(--text-muted)">Sending JSON-RPC request to POST /mcp...</span>';

    const startTime = performance.now();
    try {
        const payload = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: { name, arguments: args },
            id: Date.now()
        };
        const resp = await fetch('/mcp', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const duration = Math.round(performance.now() - startTime);
        const data = await resp.json();
        
        let output = '';
        if (data.result && data.result.content && data.result.content[0]) {
            output = data.result.content[0].text;
        } else if (data.error) {
            output = 'Error (' + data.error.code + '): ' + data.error.message;
        } else {
            output = JSON.stringify(data, null, 2);
        }

        resBox.innerHTML = '<div class="result-meta"><span>Status: ' + resp.status + ' OK</span><span>Duration: ' + duration + 'ms</span></div>' +
                           '<code>' + escapeHtml(output) + '</code>';
    } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        resBox.innerHTML = '<div class="result-meta"><span style="color:#ef4444">Fetch Failed</span><span>' + duration + 'ms</span></div>' +
                           '<code style="color:#ef4444">' + escapeHtml(String(err)) + '</code>';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = '▶ Execute Tool';
        }
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
</script>
</body>
</html>`;
}

// Memory cache for valid credentials (base64 -> expiry timestamp)
const authCache = new Map<string, number>();

async function verifyAuth(request: Request, env: Env): Promise<boolean> {
    const authHeader = request.headers.get('Authorization') || '';
    const authToken = request.headers.get('X-Auth-Token') || '';

    // 1. Direct Shared Secret in X-Auth-Token
    if (authToken && env.MCP_SHARED_SECRET && authToken === env.MCP_SHARED_SECRET) {
        return true;
    }

    // 2. Bearer Token in Authorization header (MCP client / Agent)
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (env.MCP_SHARED_SECRET && token === env.MCP_SHARED_SECRET) {
            return true;
        }
    }

    // 3. HTTP Basic Auth (Browser / User)
    if (authHeader.startsWith('Basic ')) {
        const base64 = authHeader.substring(6).trim();

        // Check in-memory cache (valid for 10 minutes)
        const now = Date.now();
        const cachedExpiry = authCache.get(base64);
        if (cachedExpiry && cachedExpiry > now) {
            return true;
        }

        try {
            const decoded = atob(base64);
            const colonIndex = decoded.indexOf(':');
            if (colonIndex === -1) return false;

            const user = decoded.substring(0, colonIndex);
            const pass = decoded.substring(colonIndex + 1);

            // A. Check against local worker secrets if configured
            if (env.AUTH_USERNAME && env.AUTH_PASSWORD) {
                if (user === env.AUTH_USERNAME && pass === env.AUTH_PASSWORD) {
                    authCache.set(base64, now + 10 * 60 * 1000);
                    return true;
                }
            }

            // B. Check if password matches MCP_SHARED_SECRET
            if (env.MCP_SHARED_SECRET && (pass === env.MCP_SHARED_SECRET || user === env.MCP_SHARED_SECRET)) {
                authCache.set(base64, now + 10 * 60 * 1000);
                return true;
            }

            // C. Verify seamlessly against earnings-worker /auth endpoint
            const targetUrl = env.EARNINGS_API_URL || 'https://pf.bforecast.com';
            const authResp = await fetch(`${targetUrl}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username: user, password: pass }),
                redirect: 'manual'
            });

            // On valid credentials, earnings-worker responds with 302 redirect without ?error=1
            const location = authResp.headers.get('Location') || '';
            if (authResp.status === 302 && !location.includes('error=')) {
                authCache.set(base64, now + 10 * 60 * 1000);
                return true;
            }
        } catch {
            return false;
        }
    }

    return false;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS headers - include MCP session header
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Authorization, X-Auth-Token',
            'Access-Control-Expose-Headers': 'mcp-session-id'
        };

        // Cache-control headers to prevent stale schemas in browsers and edge CDN
        const noCacheHeaders = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...corsHeaders
        };

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Public health check (unauthenticated for uptime monitors)
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'healthy',
                server: 'earnings-mcp-server',
                version: '2.0.0',
                transport: 'streamable-http',
                endpoints: { mcp: '/mcp', tools: '/tools' }
            }), {
                headers: { 'Content-Type': 'application/json', ...noCacheHeaders }
            });
        }

        // Authentication enforcement (HTTP Basic Auth for browsers, Bearer/Basic for API callers)
        const isAuthed = await verifyAuth(request, env);
        if (!isAuthed) {
            const accept = request.headers.get('accept') || '';
            // For browsers visiting web pages, trigger native browser Basic Auth prompt
            if (accept.includes('text/html') || url.pathname === '/tools' || url.pathname === '/') {
                return new Response('<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:3rem;"><h2>401 Unauthorized</h2><p>Authentication required. Please enter your earnings-worker credentials.</p></body></html>', {
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Basic realm="Earnings MCP Server", charset="UTF-8"',
                        'Content-Type': 'text/html; charset=utf-8',
                        ...noCacheHeaders
                    }
                });
            }

            // For MCP JSON-RPC callers, return 401 JSON
            return new Response(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Unauthorized. Please provide valid credentials via HTTP Basic Auth or Authorization: Bearer <TOKEN>.'
                },
                id: null
            }), {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="Earnings MCP Server", charset="UTF-8"',
                    'Content-Type': 'application/json; charset=utf-8',
                    ...noCacheHeaders
                }
            });
        }

        // Root redirect (browser visiting root redirects to interactive /tools console)
        if (url.pathname === '/') {
            const accept = request.headers.get('accept') || '';
            if (accept.includes('text/html')) {
                return Response.redirect(`${url.origin}/tools`, 302);
            }
            return new Response(JSON.stringify({
                status: 'authenticated',
                server: 'earnings-mcp-server',
                version: '2.0.0',
                transport: 'streamable-http',
                endpoints: { mcp: '/mcp', tools: '/tools' }
            }), {
                headers: { 'Content-Type': 'application/json', ...noCacheHeaders }
            });
        }

        // List tools (Interactive Web Console for browsers, raw JSON for API callers)
        if (url.pathname === '/tools') {
            const accept = request.headers.get('accept') || '';
            const wantsJson = url.searchParams.get('format') === 'json' || accept.includes('application/json');

            if (!wantsJson && accept.includes('text/html')) {
                return new Response(generateToolsHtml(TOOLS), {
                    headers: { 'Content-Type': 'text/html; charset=utf-8', ...noCacheHeaders }
                });
            }

            return new Response(JSON.stringify({ tools: TOOLS }, null, 2), {
                headers: { 'Content-Type': 'application/json; charset=utf-8', ...noCacheHeaders }
            });
        }

        // ============================================================
        // MCP Streamable HTTP Transport
        // ============================================================

        if (url.pathname === '/mcp') {
            const sessionId = request.headers.get('mcp-session-id');

            // ----------------------------------------------------------
            // GET /mcp - Establish SSE stream for server notifications
            // ----------------------------------------------------------
            if (request.method === 'GET') {
                return new Response(JSON.stringify({
                    error: "SSE GET transport is not supported on stateless edge workers. Please send JSON-RPC requests via HTTP POST.",
                    transport: "streamable-http",
                    supportedMethods: ["POST", "DELETE", "OPTIONS"]
                }), {
                    status: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Allow': 'POST, DELETE, OPTIONS',
                        ...corsHeaders
                    }
                });
            }

            // ----------------------------------------------------------
            // POST /mcp - Handle JSON-RPC requests
            // ----------------------------------------------------------
            if (request.method === 'POST') {
                let bodyText = "";
                try {
                    bodyText = await request.text();
                    if (!bodyText) throw new Error("Empty body");

                    const body = JSON.parse(bodyText);

                    // Generate or use existing session ID
                    const responseSessionId = sessionId || crypto.randomUUID();

                    // Check if this is a notification (no id field)
                    const isNotification = body.id === undefined || body.id === null;

                    if (isNotification) {
                        // Handle notification - no response needed
                        // Common notifications: notifications/initialized, notifications/cancelled
                        return new Response(null, {
                            status: 202, // Accepted
                            headers: {
                                'mcp-session-id': responseSessionId,
                                ...corsHeaders
                            }
                        });
                    }

                    const result = await handleMcpRequest(env, body);

                    // For long-running tools, we could stream the response
                    // For now, return standard JSON response
                    return new Response(JSON.stringify(result), {
                        headers: {
                            'Content-Type': 'application/json',
                            'mcp-session-id': responseSessionId,
                            ...corsHeaders
                        }
                    });
                } catch (error) {
                    return new Response(JSON.stringify({
                        jsonrpc: '2.0',
                        error: {
                            code: -32700,
                            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`
                        },
                        id: null
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
            }

            // ----------------------------------------------------------
            // DELETE /mcp - Close session (idempotent)
            // ----------------------------------------------------------
            if (request.method === 'DELETE') {
                if (sessionId && sessions.has(sessionId)) {
                    const session = sessions.get(sessionId);
                    try { session?.writer.close(); } catch { }
                    sessions.delete(sessionId);
                }
                // Return 204 No Content whether the session was in-memory or stateless
                return new Response(null, {
                    status: 204,
                    headers: corsHeaders
                });
            }

            // Method not allowed
            return new Response(JSON.stringify({
                error: 'Method not allowed. Use GET (SSE), POST (requests), or DELETE (close session)'
            }), {
                status: 405,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};
