import fs from 'fs';
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Analyzing MU - Position Suggestion...");

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
                        symbol: "MU",
                        question: "Give me a position suggestion - should I go long, short, or stay out? Include entry strategy."
                    }
                },
                id: 220
            })
        });

        const data = await response.json();
        const text = data.result?.content?.[0]?.text || JSON.stringify(data, null, 2);
        fs.writeFileSync('mu_analysis.txt', text);
        console.log("Done.");

    } catch (e) {
        console.error(e.message);
    }
}

runTest();
