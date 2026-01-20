const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Analyzing NVDA (Comprehensive)...");

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
                id: 170
            })
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            console.error(await response.text());
            return;
        }
        const data = await response.json();
        console.log("Analysis Result:");
        console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Fetch Error Detail:", e);
    }
}

runTest();
