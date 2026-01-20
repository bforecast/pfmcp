import fs from 'fs';
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Analyzing MSFT - Buy or Sell?...");

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
                        symbol: "MSFT",
                        question: "Should I buy or sell this stock? Give me a clear recommendation with reasoning."
                    }
                },
                id: 210
            })
        });

        if (!response.ok) {
            const err = await response.text();
            fs.writeFileSync('msft_buysell.txt', `Error: ${response.status} - ${err}`);
            return;
        }
        const data = await response.json();
        const text = data.result?.content?.[0]?.text || JSON.stringify(data, null, 2);
        fs.writeFileSync('msft_buysell.txt', text);
        console.log("Done. Result written to msft_buysell.txt");

    } catch (e) {
        fs.writeFileSync('msft_buysell.txt', `Fetch Error: ${e.message}`);
    }
}

runTest();
