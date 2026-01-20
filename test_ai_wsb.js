// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Requesting AI Analysis for 'WallstreetBets 2026' (ID: 63)...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_ai_analyze_portfolio",
                arguments: {
                    group_id: 63,
                    question: "What is this portfolio's strategy and risk profile?"
                }
            },
            id: 50
        })
    });

    const data = await response.json();
    console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));
}
runTest();
