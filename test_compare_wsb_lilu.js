// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Comparing 'WallstreetBets 2026' (63) vs 'Li Lu - Himalaya Capital Management' (33)...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "earnings_ai_compare_portfolios",
                    arguments: {
                        portfolio_id_a: "63",
                        portfolio_id_b: "33",
                        question: "Compare risk and strategy. Which is better for a conservative investor?"
                    }
                },
                id: 70
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

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
