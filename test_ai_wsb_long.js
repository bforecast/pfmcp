// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Requesting AI Analysis for 'WallstreetBets 2026' (ID: 63) - 60s Timeout...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
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
                        question: "What is this portfolio's strategy and risk profile? (Short answer)"
                    }
                },
                id: 60
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    } finally {
        clearTimeout(timeout);
    }
}
runTest();
