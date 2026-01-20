// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Fetching NVDA Quote...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_get_stock_quote",
                arguments: { symbol: "NVDA", response_format: "json" }
            },
            id: 10
        })
    });
    const txt = await response.text();
    console.log(txt);
}
runTest();
