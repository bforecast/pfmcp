#!/usr/bin/env node
/**
 * MCP Server for Earnings Worker API - Node.js Entry Point (stdio transport)
 * 
 * This is the standalone Node.js version that runs with stdio transport.
 * For Cloudflare Workers deployment, use worker.ts instead.
 * 
 * Features:
 * - Portfolio management: list, holdings, scores
 * - Stock analysis: quotes, details, statistics
 * - AI-powered insights: portfolio and stock analysis via Cloudflare Workers AI
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import tool registrations
import { registerPortfolioTools } from './tools/portfolios.js';
import { registerStockTools } from './tools/stocks.js';
import { registerAITools } from './tools/ai-chat.js';

// Import configuration
import { getEarningsApiUrl, getCloudflareAccountId } from './constants.js';

// Create MCP server instance
const server = new McpServer({
    name: "earnings-mcp-server",
    version: "1.0.0"
});

// Register all tools
registerPortfolioTools(server);
registerStockTools(server);
registerAITools(server);

// Main function to start the server
async function main() {
    // Log configuration (to stderr so it doesn't interfere with stdio transport)
    console.error("=== Earnings MCP Server (stdio) ===");
    console.error(`API URL: ${getEarningsApiUrl()}`);
    console.error(`Cloudflare AI: ${getCloudflareAccountId() ? 'Configured' : 'Not configured'}`);
    console.error("");

    // Start with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("MCP server running via stdio");
    console.error("Available tools:");
    console.error("  - earnings_list_portfolios");
    console.error("  - earnings_get_portfolio_holdings");
    console.error("  - earnings_get_portfolio_score");
    console.error("  - earnings_get_stock_quote");
    console.error("  - earnings_get_stock_details");
    console.error("  - earnings_get_stock_stats");
    console.error("  - earnings_ai_analyze_portfolio");
    console.error("  - earnings_ai_analyze_stock");
}

// Run the server
main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
});
