// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest(name, payload) {
    console.log(`\n=== Running Test: ${name} ===`);
    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

async function main() {
    // Test 1: List Tools
    await runTest("Tools List", {
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1
    });

    // Test 2: Get Stock Quote
    await runTest("Stock Quote (AAPL)", {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
            name: "earnings_get_stock_quote",
            arguments: { symbol: "AAPL", response_format: "json" }
        },
        id: 2
    });

    // Test 3: AI Analysis
    await runTest("AI Analysis (MSFT)", {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
            name: "earnings_ai_analyze_stock",
            arguments: { symbol: "MSFT", question: "Is this a good buy?" }
        },
        id: 3
    });
}

main();
