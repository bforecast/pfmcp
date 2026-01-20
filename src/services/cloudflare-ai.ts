import { getCloudflareAccountId, getCloudflareApiToken, CLOUDFLARE_AI_MODEL } from '../constants.js';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface CloudflareAIResponse {
    result: {
        response: string;
    };
    success: boolean;
    errors: any[];
    messages: any[];
}

/**
 * Check if Cloudflare AI is configured
 */
export function isCloudflareAIConfigured(): boolean {
    return Boolean(getCloudflareAccountId() && getCloudflareApiToken());
}

/**
 * Run inference on Cloudflare Workers AI Llama 3.1 8B
 */
export async function runLlamaInference(
    prompt: string,
    systemPrompt: string = "You are a helpful financial analyst assistant. Provide concise, data-driven insights based on the provided portfolio and stock data."
): Promise<string> {
    if (!isCloudflareAIConfigured()) {
        return "Error: Cloudflare Workers AI is not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.";
    }

    const accountId = getCloudflareAccountId();
    const apiToken = getCloudflareApiToken();
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_AI_MODEL}`;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return `Error: Cloudflare AI request failed (${response.status}): ${errorText}`;
        }

        const data = await response.json() as CloudflareAIResponse;

        if (!data.success) {
            return `Error: Cloudflare AI returned errors: ${JSON.stringify(data.errors)}`;
        }

        return data.result.response;
    } catch (error) {
        return `Error: Failed to call Cloudflare AI: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * Build a portfolio context string for AI analysis
 */
export function buildPortfolioContext(portfolio: any, holdings: any[]): string {
    const lines: string[] = [
        `Portfolio: ${portfolio.name}`,
        `Holdings: ${portfolio.member_count || holdings.length} stocks`,
        ``
    ];

    // Add stats if available
    if (portfolio.cagr !== null) lines.push(`CAGR: ${(portfolio.cagr * 100).toFixed(2)}%`);
    if (portfolio.sharpe !== null) lines.push(`Sharpe Ratio: ${portfolio.sharpe.toFixed(2)}`);
    if (portfolio.sortino !== null) lines.push(`Sortino Ratio: ${portfolio.sortino.toFixed(2)}`);
    if (portfolio.max_drawdown !== null) lines.push(`Max Drawdown: ${(portfolio.max_drawdown * 100).toFixed(2)}%`);
    if (portfolio.last_score !== null) lines.push(`Score: ${portfolio.last_score.toFixed(1)}`);

    lines.push('');
    lines.push('Top Holdings:');

    // Add top holdings
    const topHoldings = holdings.slice(0, 10);
    for (const h of topHoldings) {
        const alloc = h.allocation ? `${(h.allocation * 100).toFixed(1)}%` : 'N/A';
        const change = h.change_1d !== null ? `${h.change_1d >= 0 ? '+' : ''}${(h.change_1d * 100).toFixed(2)}%` : '';
        lines.push(`- ${h.symbol}: ${alloc} ${change}`);
    }

    return lines.join('\n');
}

/**
 * Build a stock context string for AI analysis
 */
export function buildStockContext(details: any): string {
    const q = details.quote;
    const lines: string[] = [
        `Stock: ${q.symbol} - ${q.name || 'Unknown'}`,
        `Price: $${q.price?.toFixed(2) || 'N/A'}`,
        ``
    ];

    if (q.market_cap) lines.push(`Market Cap: $${(q.market_cap / 1e9).toFixed(2)}B`);
    if (q.pe_ratio) lines.push(`P/E Ratio: ${q.pe_ratio.toFixed(2)}`);
    if (q.forward_pe) lines.push(`Forward P/E: ${q.forward_pe.toFixed(2)}`);
    if (q.ps_ratio) lines.push(`P/S Ratio: ${q.ps_ratio.toFixed(2)}`);
    if (q.dividend_yield) lines.push(`Dividend Yield: ${(q.dividend_yield * 100).toFixed(2)}%`);
    if (q.change_percent !== null) lines.push(`Today: ${q.change_percent >= 0 ? '+' : ''}${(q.change_percent * 100).toFixed(2)}%`);

    // Stats
    if (q.volatility) lines.push(`Volatility: ${(q.volatility * 100).toFixed(2)}%`);
    if (q.sharpe_ratio_1y) lines.push(`Sharpe (1Y): ${q.sharpe_ratio_1y.toFixed(2)}`);
    if (q.return_1y !== null) lines.push(`Return (1Y): ${(q.return_1y * 100).toFixed(2)}%`);

    // Holdings
    if (details.holdings && details.holdings.length > 0) {
        lines.push('');
        lines.push('Held by portfolios:');
        for (const h of details.holdings.slice(0, 5)) {
            lines.push(`- ${h.name}: ${(h.allocation * 100).toFixed(1)}%`);
        }
    }

    return lines.join('\n');
}
