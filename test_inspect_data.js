// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Inspecting Full JSON for TSLA...");

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "earnings_get_stock_details",
                    arguments: {
                        symbol: "TSLA",
                        response_format: "json"
                    }
                },
                id: 110
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        // Log the deeply nested quote/stats object to see available fields
        const resultString = data.result?.content?.[0]?.text;
        const resultJson = JSON.parse(resultString);
        console.log(JSON.stringify(resultJson, null, 2));

    } catch (e) {
        console.error("Failed:", e.message);
    }
}

runTest();
