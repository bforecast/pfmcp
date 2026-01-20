// Debug script to see exact field names
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Debugging TSLA data structure...");

    try {
        // Get raw stock details with json format
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
                id: 999
            })
        });

        const text = await response.text();
        console.log("Raw response:", text.substring(0, 2000));

    } catch (e) {
        console.error("Failed:", e.message);
    }
}

runTest();
