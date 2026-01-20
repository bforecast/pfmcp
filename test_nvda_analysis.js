// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Analyzing NVDA (Comprehensive)...");

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
                    name: "earnings_ai_comprehensive_stock_analysis",
                    arguments: {
                        symbol: "NVDA"
                    }
                },
                id: 150
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
