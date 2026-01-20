// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Testing AI Analysis...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_ai_analyze_stock",
                arguments: { symbol: "MSFT", question: "Is this a good buy? Short answer." }
            },
            id: 3
        })
    });
    const txt = await response.text();
    console.log(txt);
}
runTest();
