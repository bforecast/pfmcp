import fs from 'fs';
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Analyzing MSFT (Comprehensive)...");

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
                        symbol: "MSFT"
                    }
                },
                id: 200
            })
        });

        if (!response.ok) {
            const err = await response.text();
            fs.writeFileSync('msft_result.txt', `Error: ${response.status} - ${err}`);
            return;
        }
        const data = await response.json();
        const text = data.result?.content?.[0]?.text || JSON.stringify(data, null, 2);
        fs.writeFileSync('msft_result.txt', text);
        console.log("Done. Result written to msft_result.txt");

    } catch (e) {
        fs.writeFileSync('msft_result.txt', `Fetch Error: ${e.message}`);
    }
}

runTest();
