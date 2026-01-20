// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Fetching Holdings for Portfolio 15 (AI Earnings Beats)...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_get_portfolio_holdings",
                arguments: { group_id: 15, response_format: "markdown" }
            },
            id: 25
        })
    });
    const data = await response.json();
    console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));
}
runTest();
