import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPortfolios, fetchDashboardData, fetchPortfolioScore, handleApiError } from '../services/api-client.js';
import { ListPortfoliosInputSchema, GetPortfolioHoldingsInputSchema, GetPortfolioScoreInputSchema } from '../schemas/portfolio.js';
import { ResponseFormat } from '../types.js';
import type { ListPortfoliosInput, GetPortfolioHoldingsInput, GetPortfolioScoreInput } from '../schemas/portfolio.js';

/**
 * Register all portfolio-related tools
 */
export function registerPortfolioTools(server: McpServer): void {

    // 1. List Portfolios
    server.registerTool(
        "earnings_list_portfolios",
        {
            title: "List Portfolios",
            description: `List all portfolios in the earnings-worker system with their stats.

Returns portfolio information including:
- Portfolio ID, name, description, type
- Member count (number of holdings)
- Performance metrics: CAGR, Sharpe ratio, Sortino ratio, max drawdown
- Correlation to SPY, daily return, and overall score

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of portfolios with stats. Use portfolio IDs with other tools to get details.

Examples:
  - "Show me all portfolios" -> earnings_list_portfolios
  - "List portfolios with their Sharpe ratios" -> earnings_list_portfolios`,
            inputSchema: ListPortfoliosInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: ListPortfoliosInput) => {
            try {
                const portfolios = await fetchPortfolios();

                if (!portfolios || portfolios.length === 0) {
                    return {
                        content: [{ type: "text", text: "No portfolios found." }]
                    };
                }

                // Build structured output
                const output = {
                    count: portfolios.length,
                    portfolios: portfolios.map(p => ({
                        id: p.id,
                        name: p.name,
                        type: p.type,
                        member_count: p.member_count,
                        cagr: p.cagr,
                        sharpe: p.sharpe,
                        sortino: p.sortino,
                        max_drawdown: p.max_drawdown,
                        score: p.last_score,
                        updated_at: p.stats_updated_at
                    }))
                };

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [`# Portfolios (${portfolios.length})`, ""];
                    for (const p of portfolios) {
                        lines.push(`## ${p.name} (ID: ${p.id})`);
                        lines.push(`- **Holdings**: ${p.member_count} stocks`);
                        if (p.type) lines.push(`- **Type**: ${p.type}`);
                        if (p.cagr !== null) lines.push(`- **CAGR**: ${(p.cagr * 100).toFixed(2)}%`);
                        if (p.sharpe !== null) lines.push(`- **Sharpe**: ${p.sharpe.toFixed(2)}`);
                        if (p.sortino !== null) lines.push(`- **Sortino**: ${p.sortino.toFixed(2)}`);
                        if (p.max_drawdown !== null) lines.push(`- **Max Drawdown**: ${(p.max_drawdown * 100).toFixed(2)}%`);
                        if (p.last_score !== null) lines.push(`- **Score**: ${p.last_score.toFixed(1)}`);
                        lines.push("");
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

    // 2. Get Portfolio Holdings
    server.registerTool(
        "earnings_get_portfolio_holdings",
        {
            title: "Get Portfolio Holdings",
            description: `Get the holdings of a specific portfolio with allocations and current prices.

Returns detailed holding information:
- Stock symbol and name
- Allocation percentage
- Current price and daily change
- Forward PEG ratio
- YTD return

Args:
  - group_id (number): Portfolio/group ID (get from earnings_list_portfolios)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of holdings with allocations and metrics.

Examples:
  - "Show holdings for portfolio 1" -> earnings_get_portfolio_holdings with group_id=1
  - "What stocks are in Warren Buffett's portfolio?" -> First list portfolios, then get holdings`,
            inputSchema: GetPortfolioHoldingsInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: GetPortfolioHoldingsInput) => {
            try {
                const data = await fetchDashboardData(params.group_id);

                if (!data.data || data.data.length === 0) {
                    return {
                        content: [{ type: "text", text: `No holdings found for portfolio ${params.group_id}.` }]
                    };
                }

                const holdings = data.data;
                const output = {
                    group_id: params.group_id,
                    last_updated: data.lastUpdated,
                    count: holdings.length,
                    holdings: holdings.map(h => ({
                        symbol: h.symbol,
                        name: h.name,
                        allocation: h.allocation,
                        price: h.price,
                        forward_peg: h.forward_peg,
                        change_1d: h.change_1d,
                        change_ytd: h.change_ytd
                    }))
                };

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [`# Portfolio ${params.group_id} Holdings (${holdings.length} stocks)`, ""];
                    if (data.lastUpdated) lines.push(`*Last updated: ${data.lastUpdated}*`, "");

                    lines.push("| Symbol | Name | Allocation | Price | 1D Change | YTD |");
                    lines.push("|--------|------|------------|-------|-----------|-----|");

                    for (const h of holdings) {
                        const alloc = h.allocation ? `${(h.allocation * 100).toFixed(1)}%` : 'N/A';
                        const price = h.price ? `$${h.price.toFixed(2)}` : 'N/A';
                        const change1d = h.change_1d !== null ? `${h.change_1d >= 0 ? '+' : ''}${(h.change_1d * 100).toFixed(2)}%` : 'N/A';
                        const ytd = h.change_ytd !== null ? `${h.change_ytd >= 0 ? '+' : ''}${(h.change_ytd * 100).toFixed(2)}%` : 'N/A';
                        lines.push(`| ${h.symbol} | ${h.name || ''} | ${alloc} | ${price} | ${change1d} | ${ytd} |`);
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

    // 3. Get Portfolio Score
    server.registerTool(
        "earnings_get_portfolio_score",
        {
            title: "Get Portfolio Score",
            description: `Get detailed scoring breakdown for a portfolio.

Returns comprehensive scoring information:
- Total score (0-100)
- Holdings quality score
- Performance score
- Component scores: quality, valuation, momentum, diversification
- Individual stock scores within the portfolio

Args:
  - group_id (number): Portfolio/group ID (get from earnings_list_portfolios)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Detailed scoring breakdown with component analysis.

Examples:
  - "What's the score for portfolio 1?" -> earnings_get_portfolio_score with group_id=1
  - "Show me the quality breakdown" -> earnings_get_portfolio_score with response_format="json"`,
            inputSchema: GetPortfolioScoreInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: true
            }
        },
        async (params: GetPortfolioScoreInput) => {
            try {
                const score = await fetchPortfolioScore(params.group_id);

                const output = {
                    group_id: score.group_id,
                    total_score: score.total_score,
                    holdings_score: score.holdings_score,
                    performance_score: score.performance_score,
                    components: score.components,
                    stock_count: score.stock_details?.length || 0,
                    top_stocks: score.stock_details?.slice(0, 5).map(s => ({
                        symbol: s.symbol,
                        weight: s.weight,
                        score: s.score
                    }))
                };

                let textContent: string;
                if (params.response_format === ResponseFormat.MARKDOWN) {
                    const lines = [
                        `# Portfolio ${params.group_id} Score`,
                        "",
                        `**Total Score**: ${score.total_score.toFixed(1)} / 100`,
                        "",
                        "## Score Components",
                        `- **Holdings Quality**: ${score.holdings_score.toFixed(1)}`,
                        `- **Performance**: ${score.performance_score.toFixed(1)}`,
                        ""
                    ];

                    if (score.components) {
                        lines.push("## Breakdown");
                        lines.push(`- Quality: ${score.components.quality?.toFixed(1) || 'N/A'}`);
                        lines.push(`- Valuation: ${score.components.valuation?.toFixed(1) || 'N/A'}`);
                        lines.push(`- Momentum: ${score.components.momentum?.toFixed(1) || 'N/A'}`);
                        lines.push(`- Diversification: ${score.components.diversification?.toFixed(1) || 'N/A'}`);
                        lines.push("");
                    }

                    if (score.stock_details && score.stock_details.length > 0) {
                        lines.push("## Top 5 Stocks by Score");
                        const sorted = [...score.stock_details].sort((a, b) => b.score - a.score).slice(0, 5);
                        for (const s of sorted) {
                            lines.push(`- **${s.symbol}**: Score ${s.score.toFixed(1)}, Weight ${(s.weight * 100).toFixed(1)}%`);
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
}
