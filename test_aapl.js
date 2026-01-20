// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Testing AAPL Quote...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_get_stock_quote",
                arguments: { symbol: "AAPL", response_format: "json" }
            },
            id: 2
        })
    });
    const txt = await response.text();
    console.log(txt);
}
runTest();
