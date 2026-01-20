// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("TEST 1: Market Sentiment (Top 5)...");
    await callTool("earnings_ai_market_sentiment", { top_n: 5 });

    console.log("\nTEST 2: Compare Portfolios (82 vs 81)...");
    await callTool("earnings_ai_compare_portfolios", {
        portfolio_id_a: "82",
        portfolio_id_b: "81",
        question: "Which one is safer?"
    });
}

async function callTool(name, args) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: { name, arguments: args },
                id: Math.floor(Math.random() * 1000)
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${await response.text()}`);
            return;
        }
        const data = await response.json();
        console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Failed:", e.message);
    } finally {
        clearTimeout(timeout);
    }
}

runTest();
