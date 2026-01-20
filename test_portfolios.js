// Node 18+ has global fetch
const URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

async function runTest() {
    console.log("Listing Portfolios...");
    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "earnings_list_portfolios",
                arguments: { response_format: "markdown" } // Using markdown for readable output
            },
            id: 20
        })
    });
    const data = await response.json();
    console.log(data.result?.content?.[0]?.text || JSON.stringify(data, null, 2));
}
runTest();
