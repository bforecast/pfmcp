// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Fetching Stock Stats for TSLA...");

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "earnings_get_stock_stats",
                    arguments: {
                        symbol: "TSLA"
                    }
                },
                id: 100
            })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${await response.text()}`);
            return;
        }
        const data = await response.json();
        console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Failed:", e.message);
    }
}

runTest();
