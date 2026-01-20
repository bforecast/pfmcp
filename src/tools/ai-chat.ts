import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fetchPortfolios, fetchDashboardData, fetchStockDetails, handleApiError } from '../services/api-client.js';
import { runLlamaInference, buildPortfolioContext, buildStockContext, isCloudflareAIConfigured } from '../services/cloudflare-ai.js';
import { AIAnalyzePortfolioInputSchema } from '../schemas/portfolio.js';
import { AIAnalyzeStockInputSchema } from '../schemas/stock.js';
import type { AIAnalyzePortfolioInput } from '../schemas/portfolio.js';
import type { AIAnalyzeStockInput } from '../schemas/stock.js';

/**
 * Register AI-powered analysis tools
 */
export function registerAITools(server: McpServer): void {

    // 1. AI Analyze Portfolio
    server.registerTool(
        "earnings_ai_analyze_portfolio",
        {
            title: "AI Analyze Portfolio",
            description: `Use AI (Llama 3.1 8B) to analyze a portfolio and provide insights.

The AI will analyze the portfolio's:
- Holdings composition and allocation
- Performance metrics (CAGR, Sharpe, Sortino)
- Risk characteristics (volatility, max drawdown)
- Overall score and quality

Args:
  - group_id (number): Portfolio/group ID to analyze
  - question (string, optional): Specific question about the portfolio

Returns:
  AI-generated analysis with actionable insights.

Examples:
  - "Analyze portfolio 1" -> earnings_ai_analyze_portfolio with group_id=1
  - "Is portfolio 2 too concentrated?" -> earnings_ai_analyze_portfolio with group_id=2, question="Is this portfolio too concentrated?"

Note: Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.`,
            inputSchema: AIAnalyzePortfolioInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: false, // AI responses may vary
                openWorldHint: true
            }
        },
        async (params: AIAnalyzePortfolioInput) => {
            try {
                // Check AI configuration
                if (!isCloudflareAIConfigured()) {
                    return {
                        content: [{
                            type: "text",
                            text: "Error: Cloudflare Workers AI is not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables to use AI analysis features."
                        }],
                        isError: true
                    };
                }

                // Fetch portfolio data
                const portfolios = await fetchPortfolios();
                const portfolio = portfolios.find(p => p.id === params.group_id);

                if (!portfolio) {
                    return {
                        content: [{ type: "text", text: `Portfolio ${params.group_id} not found.` }],
                        isError: true
                    };
                }

                // Fetch holdings
                const dashData = await fetchDashboardData(params.group_id);
                const holdings = dashData.data || [];

                // Build context for AI
                const context = buildPortfolioContext(portfolio, holdings);

                // Build prompt
                let prompt: string;
                if (params.question) {
                    prompt = `Here is the portfolio data:\n\n${context}\n\nQuestion: ${params.question}\n\nProvide a concise, data-driven answer.`;
                } else {
                    prompt = `Analyze this portfolio and provide key insights:\n\n${context}\n\nProvide:\n1. Overall assessment (1-2 sentences)\n2. Strengths (2-3 bullet points)\n3. Areas for improvement (2-3 bullet points)\n4. One actionable recommendation`;
                }

                // Call Cloudflare AI
                const aiResponse = await runLlamaInference(prompt);

                const output = {
                    group_id: params.group_id,
                    portfolio_name: portfolio.name,
                    question: params.question || "General analysis",
                    analysis: aiResponse,
                    context_summary: {
                        holdings_count: holdings.length,
                        cagr: portfolio.cagr,
                        sharpe: portfolio.sharpe,
                        score: portfolio.last_score
                    }
                };

                const textContent = [
                    `# AI Analysis: ${portfolio.name}`,
                    "",
                    params.question ? `**Question**: ${params.question}` : "",
                    "",
                    "## Analysis",
                    "",
                    aiResponse,
                    "",
                    "---",
                    `*Based on ${holdings.length} holdings | CAGR: ${portfolio.cagr !== null ? (portfolio.cagr * 100).toFixed(1) + '%' : 'N/A'} | Sharpe: ${portfolio.sharpe?.toFixed(2) || 'N/A'}*`
                ].filter(Boolean).join("\n");

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

    // 2. AI Analyze Stock
    server.registerTool(
        "earnings_ai_analyze_stock",
        {
            title: "AI Analyze Stock",
            description: `Use AI (Llama 3.1 8B) to analyze a stock and provide insights.

The AI will analyze the stock's:
- Current valuation (P/E, P/S, market cap)
- Performance metrics (returns, volatility, Sharpe)
- Portfolio holdings context
- Recent earnings data

Args:
  - symbol (string): Stock ticker symbol to analyze
  - question (string, optional): Specific question about the stock

Returns:
  AI-generated analysis with actionable insights.

Examples:
  - "Analyze AAPL" -> earnings_ai_analyze_stock with symbol="AAPL"
  - "Is MSFT overvalued?" -> earnings_ai_analyze_stock with symbol="MSFT", question="Is this stock overvalued?"

Note: Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.`,
            inputSchema: AIAnalyzeStockInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: false, // AI responses may vary
                openWorldHint: true
            }
        },
        async (params: AIAnalyzeStockInput) => {
            try {
                // Check AI configuration
                if (!isCloudflareAIConfigured()) {
                    return {
                        content: [{
                            type: "text",
                            text: "Error: Cloudflare Workers AI is not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables to use AI analysis features."
                        }],
                        isError: true
                    };
                }

                // Fetch stock data
                const details = await fetchStockDetails(params.symbol);

                if (!details.quote) {
                    return {
                        content: [{ type: "text", text: `Stock ${params.symbol} not found.` }],
                        isError: true
                    };
                }

                // Build context for AI
                const context = buildStockContext(details);

                // Build prompt
                let prompt: string;
                if (params.question) {
                    prompt = `Here is the stock data:\n\n${context}\n\nQuestion: ${params.question}\n\nProvide a concise, data-driven answer.`;
                } else {
                    prompt = `Analyze this stock and provide key insights:\n\n${context}\n\nProvide:\n1. Valuation assessment (1-2 sentences)\n2. Key strengths (2-3 bullet points)\n3. Key risks (2-3 bullet points)\n4. One-liner summary`;
                }

                // Call Cloudflare AI
                const aiResponse = await runLlamaInference(prompt);

                const q = details.quote;
                const output = {
                    symbol: params.symbol,
                    name: q.name,
                    question: params.question || "General analysis",
                    analysis: aiResponse,
                    context_summary: {
                        price: q.price,
                        pe_ratio: q.pe_ratio,
                        market_cap: q.market_cap,
                        held_by_portfolios: details.holdings?.length || 0
                    }
                };

                const textContent = [
                    `# AI Analysis: ${params.symbol} - ${q.name || 'Unknown'}`,
                    "",
                    params.question ? `**Question**: ${params.question}` : "",
                    "",
                    "## Analysis",
                    "",
                    aiResponse,
                    "",
                    "---",
                    `*Price: $${q.price?.toFixed(2) || 'N/A'} | P/E: ${q.pe_ratio?.toFixed(1) || 'N/A'} | Held by ${details.holdings?.length || 0} portfolios*`
                ].filter(Boolean).join("\n");

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
