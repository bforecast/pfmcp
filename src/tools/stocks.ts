import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchStockDetails, handleApiError } from '../services/api-client.js';
import { GetStockQuoteInputSchema, GetStockDetailsInputSchema, GetStockStatsInputSchema } from '../schemas/stock.js';
import { ResponseFormat } from '../types.js';
import type { GetStockQuoteInput, GetStockDetailsInput, GetStockStatsInput } from '../schemas/stock.js';

/**
 * Register all stock-related tools
 */
export function registerStockTools(server: McpServer): void {

    // 1. Get Stock Quote
    server.registerTool(
        "earnings_get_stock_quote",
        {
            title: "Get Stock Quote",
            description: `Get current stock quote and basic price information.

Returns:
- Current price and daily change
- Market cap
- P/E ratio (trailing and forward)
- P/S ratio
- Dividend yield
- 52-week high and change from high
- Trading volume

Args:
  - symbol (string): Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Examples:
  - "What's the price of AAPL?" -> earnings_get_stock_quote with symbol="AAPL"
  - "Show me MSFT's P/E ratio" -> earnings_get_stock_quote with symbol="MSFT"`,
            inputSchema: GetStockQuoteInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: GetStockQuoteInput) => {
            try {
                const details = await fetchStockDetails(params.symbol);
                const q = details.quote;

                if (!q) {
                    return {
                        content: [{ type: "text", text: `Stock ${params.symbol} not found.` }],
                        isError: true
                    };
                }

                const output = {
                    symbol: q.symbol,
                    name: q.name,
                    price: q.price,
                    change_percent: q.change_percent,
                    market_cap: q.market_cap,
                    pe_ratio: q.pe_ratio,
                    forward_pe: q.forward_pe,
                    ps_ratio: q.ps_ratio,
                    dividend_yield: q.dividend_yield,
                    fifty_two_week_high: q.fifty_two_week_high,
                    fifty_two_week_high_change_percent: q.fifty_two_week_high_change_percent,
                    volume: q.volume,
                    updated_at: q.updated_at
                };

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [
                        `# ${q.symbol} - ${q.name || 'Unknown'}`,
                        "",
                        `**Price**: $${q.price?.toFixed(2) || 'N/A'}`
                    ];

                    if (q.change_percent !== null) {
                        const sign = q.change_percent >= 0 ? '+' : '';
                        lines.push(`**Today**: ${sign}${(q.change_percent * 100).toFixed(2)}%`);
                    }

                    lines.push("");
                    lines.push("## Valuation");
                    if (q.market_cap) lines.push(`- **Market Cap**: $${(q.market_cap / 1e9).toFixed(2)}B`);
                    if (q.pe_ratio) lines.push(`- **P/E Ratio**: ${q.pe_ratio.toFixed(2)}`);
                    if (q.forward_pe) lines.push(`- **Forward P/E**: ${q.forward_pe.toFixed(2)}`);
                    if (q.ps_ratio) lines.push(`- **P/S Ratio**: ${q.ps_ratio.toFixed(2)}`);
                    if (q.dividend_yield) lines.push(`- **Dividend Yield**: ${(q.dividend_yield * 100).toFixed(2)}%`);

                    lines.push("");
                    lines.push("## 52-Week");
                    if (q.fifty_two_week_high) lines.push(`- **52W High**: $${q.fifty_two_week_high.toFixed(2)}`);
                    if (q.fifty_two_week_high_change_percent !== null) {
                        lines.push(`- **From High**: ${(q.fifty_two_week_high_change_percent * 100).toFixed(2)}%`);
                    }

                    textContent = lines.join("\n");
                } else {
                    textContent = JSON.stringify(output, null, 2);
                }

                return {
                    content: [{ type: "text", text: textContent }],
                    structuredContent: output
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: handleApiError(error) }],
                    isError: true
                };
            }
        }
    );

    // 2. Get Stock Details (Full)
    server.registerTool(
        "earnings_get_stock_details",
        {
            title: "Get Stock Details",
            description: `Get comprehensive stock details including quote, price history, earnings, and portfolio holdings.

Returns:
- Quote: price, valuation metrics, market cap
- Price history: 1-year daily closing prices (optional)
- Earnings: estimates and actuals for recent quarters (optional)
- Holdings: which portfolios hold this stock and at what allocation

Args:
  - symbol (string): Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
  - include_history (boolean): Include 1-year price history (default: true)
  - include_earnings (boolean): Include earnings estimates (default: true)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Examples:
  - "Tell me everything about AAPL" -> earnings_get_stock_details with symbol="AAPL"
  - "Show GOOGL with earnings data" -> earnings_get_stock_details with symbol="GOOGL"`,
            inputSchema: GetStockDetailsInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: GetStockDetailsInput) => {
            try {
                const details = await fetchStockDetails(params.symbol);
                const q = details.quote;

                if (!q) {
                    return {
                        content: [{ type: "text", text: `Stock ${params.symbol} not found.` }],
                        isError: true
                    };
                }

                const output: any = {
                    symbol: q.symbol,
                    name: q.name,
                    quote: {
                        price: q.price,
                        change_percent: q.change_percent,
                        market_cap: q.market_cap,
                        pe_ratio: q.pe_ratio,
                        forward_pe: q.forward_pe,
                        ps_ratio: q.ps_ratio,
                        dividend_yield: q.dividend_yield
                    },
                    stats: {
                        volatility: q.volatility,
                        sharpe_ratio_1y: q.sharpe_ratio_1y,
                        return_1y: q.return_1y,
                        max_drawdown: q.max_drawdown
                    }
                };

                if (params.include_history && details.history) {
                    output.history_count = details.history.length;
                    output.history_range = details.history.length > 0 ? {
                        from: details.history[0]?.date,
                        to: details.history[details.history.length - 1]?.date
                    } : null;
                }

                if (params.include_earnings && details.earnings) {
                    output.earnings = details.earnings;
                }

                if (details.holdings) {
                    output.holdings = details.holdings;
                }

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [
                        `# ${q.symbol} - ${q.name || 'Unknown'}`,
                        "",
                        `**Price**: $${q.price?.toFixed(2) || 'N/A'}`
                    ];

                    if (q.change_percent !== null) {
                        const sign = q.change_percent >= 0 ? '+' : '';
                        lines.push(`**Today**: ${sign}${(q.change_percent * 100).toFixed(2)}%`);
                    }

                    lines.push("");
                    lines.push("## Valuation");
                    if (q.market_cap) lines.push(`- Market Cap: $${(q.market_cap / 1e9).toFixed(2)}B`);
                    if (q.pe_ratio) lines.push(`- P/E: ${q.pe_ratio.toFixed(2)}`);
                    if (q.forward_pe) lines.push(`- Forward P/E: ${q.forward_pe.toFixed(2)}`);
                    if (q.ps_ratio) lines.push(`- P/S: ${q.ps_ratio.toFixed(2)}`);

                    lines.push("");
                    lines.push("## Statistics");
                    if (q.volatility) lines.push(`- Volatility: ${(q.volatility * 100).toFixed(2)}%`);
                    if (q.sharpe_ratio_1y) lines.push(`- Sharpe (1Y): ${q.sharpe_ratio_1y.toFixed(2)}`);
                    if (q.return_1y !== null) lines.push(`- Return (1Y): ${(q.return_1y * 100).toFixed(2)}%`);
                    if (q.max_drawdown !== null) lines.push(`- Max Drawdown: ${(q.max_drawdown * 100).toFixed(2)}%`);

                    if (params.include_history && details.history && details.history.length > 0) {
                        lines.push("");
                        lines.push(`## Price History (${details.history.length} days)`);
                        lines.push(`From ${details.history[0]?.date} to ${details.history[details.history.length - 1]?.date}`);
                    }

                    if (params.include_earnings && details.earnings && details.earnings.length > 0) {
                        lines.push("");
                        lines.push("## Recent Earnings");
                        for (const e of details.earnings.slice(0, 4)) {
                            const actual = e.eps_actual !== null ? `Actual: $${e.eps_actual}` : '';
                            const est = e.eps_estimate !== null ? `Est: $${e.eps_estimate}` : '';
                            lines.push(`- ${e.fiscal_date_ending}: ${est} ${actual}`);
                        }
                    }

                    if (details.holdings && details.holdings.length > 0) {
                        lines.push("");
                        lines.push("## Held By Portfolios");
                        for (const h of details.holdings) {
                            lines.push(`- ${h.name}: ${(h.allocation * 100).toFixed(1)}%`);
                        }
                    }

                    textContent = lines.join("\n");
                } else {
                    textContent = JSON.stringify(output, null, 2);
                }

                return {
                    content: [{ type: "text", text: textContent }],
                    structuredContent: output
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: handleApiError(error) }],
                    isError: true
                };
            }
        }
    );

    // 3. Get Stock Stats
    server.registerTool(
        "earnings_get_stock_stats",
        {
            title: "Get Stock Stats",
            description: `Get statistical metrics for a stock.

Returns risk and return metrics:
- Volatility (annualized)
- Sharpe ratio (1 year)
- Return (1 year)
- Return (YTD)
- Max drawdown

Args:
  - symbol (string): Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Examples:
  - "What's AAPL's Sharpe ratio?" -> earnings_get_stock_stats with symbol="AAPL"
  - "Show me TSLA's volatility" -> earnings_get_stock_stats with symbol="TSLA"`,
            inputSchema: GetStockStatsInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: GetStockStatsInput) => {
            try {
                const details = await fetchStockDetails(params.symbol);
                const q = details.quote;

                if (!q) {
                    return {
                        content: [{ type: "text", text: `Stock ${params.symbol} not found.` }],
                        isError: true
                    };
                }

                const output = {
                    symbol: q.symbol,
                    name: q.name,
                    volatility: q.volatility,
                    sharpe_ratio_1y: q.sharpe_ratio_1y,
                    return_1y: q.return_1y,
                    return_ytd: q.return_ytd,
                    max_drawdown: q.max_drawdown,
                    updated_at: q.updated_at
                };

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [
                        `# ${q.symbol} Statistics`,
                        ""
                    ];

                    lines.push("## Risk Metrics");
                    if (q.volatility !== null) lines.push(`- **Volatility**: ${(q.volatility * 100).toFixed(2)}%`);
                    if (q.max_drawdown !== null) lines.push(`- **Max Drawdown**: ${(q.max_drawdown * 100).toFixed(2)}%`);

                    lines.push("");
                    lines.push("## Risk-Adjusted Returns");
                    if (q.sharpe_ratio_1y !== null) lines.push(`- **Sharpe Ratio (1Y)**: ${q.sharpe_ratio_1y.toFixed(2)}`);

                    lines.push("");
                    lines.push("## Returns");
                    if (q.return_1y !== null) lines.push(`- **1 Year**: ${(q.return_1y * 100).toFixed(2)}%`);
                    if (q.return_ytd !== null) lines.push(`- **YTD**: ${(q.return_ytd * 100).toFixed(2)}%`);

                    textContent = lines.join("\n");
                } else {
                    textContent = JSON.stringify(output, null, 2);
                }

                return {
                    content: [{ type: "text", text: textContent }],
                    structuredContent: output
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: handleApiError(error) }],
                    isError: true
                };
            }
        }
    );
}
