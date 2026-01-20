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
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            },
            required: ["group_id"]
        }
    },
    {
        name: "earnings_get_portfolio_score",
        description: "Get detailed portfolio scoring breakdown",
        inputSchema: {
            type: "object",
            properties: {
                group_id: { type: "number", description: "Portfolio ID" },
                response_format: { type: "string", enum: ["markdown", "json"], default: "markdown" }
            },
            required: ["group_id"]
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
                question: { type: "string", description: "Optional specific question" }
            },
            required: ["group_id"]
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
                const data = await apiRequest(env, `/api/dashboard-data?groupId=${args.group_id}`);
                if (args.response_format === 'json') return JSON.stringify(data, null, 2);
                const holdings = data.data || [];
                return `# Portfolio ${args.group_id} Holdings\n\n` +
                    holdings.map((h: any) => {
                        return `- **${h.symbol}**: ${formatPercent(h.allocation)} @ $${h.price?.toFixed(2) || 'N/A'}`;
                    }).join('\n');
            }

            case 'earnings_get_portfolio_score': {
                const data = await apiRequest(env, `/api/scoring/${args.group_id}`);
                if (args.response_format === 'json') return JSON.stringify(data, null, 2);
                return `# Portfolio Score\n\n**Total**: ${data.total_score?.toFixed(1) || 'N/A'}\n- Holdings: ${data.holdings_score?.toFixed(1)}\n- Performance: ${data.performance_score?.toFixed(1)}`;
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
                const data = await apiRequest(env, `/api/portfolios`);
                const portfolio = data.find((p: any) => p.id === args.group_id);
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

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Health check
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'healthy',
                server: 'earnings-mcp-server',
                version: '1.0.0',
                endpoints: { mcp: '/mcp', tools: '/tools' }
            }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // List tools (convenience endpoint)
        if (url.pathname === '/tools') {
            return new Response(JSON.stringify({ tools: TOOLS }, null, 2), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // MCP endpoint (GET - helpful message)
        if (url.pathname === '/mcp' && request.method === 'GET') {
            return new Response('MCP Server is running. Please use POST with JSON-RPC payload.', {
                status: 405, // Method Not Allowed
                headers: corsHeaders
            });
        }

        // MCP endpoint (POST)
        if (url.pathname === '/mcp' && request.method === 'POST') {
            let bodyText = "";
            try {
                bodyText = await request.text();
                if (!bodyText) throw new Error("Empty body");

                const body = JSON.parse(bodyText);
                const result = await handleMcpRequest(env, body);
                return new Response(JSON.stringify(result), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    jsonrpc: '2.0',
                    error: {
                        code: -32700,
                        message: `Parse error: ${error instanceof Error ? error.message : String(error)}. Received: ${bodyText.substring(0, 50)}...`
                    },
                    id: null
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};
