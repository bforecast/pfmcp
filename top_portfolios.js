// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Fetching Portfolios to rank...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_list_portfolios",
                arguments: { response_format: "json" }
            },
            id: 30
        })
    });

    const json = await response.json();

    // Parse the inner JSON string returned by the tool
    let portfolios;
    try {
        const contentText = json.result.content[0].text;
        portfolios = JSON.parse(contentText);
    } catch (e) {
        console.error("Failed to parse result:", e);
        console.log(json);
        return;
    }

    if (!Array.isArray(portfolios)) {
        console.error("Expected array, got:", typeof portfolios);
        return;
    }

    // Sort by last_score descending
    const top3 = portfolios
        .filter(p => p.last_score !== undefined && p.last_score !== null)
        .sort((a, b) => b.last_score - a.last_score)
        .slice(0, 3);

    console.log("\nTop 3 Portfolios by Score:");
    top3.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Score: ${p.last_score.toFixed(1)} | Returns: ${(p.cagr * 100).toFixed(1)}% | Sharpe: ${p.sharpe?.toFixed(2) || 'N/A'}`);
    });
}
runTest();
