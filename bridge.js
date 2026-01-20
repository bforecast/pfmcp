/**
 * MCP Bridge (ES Module)
 * Proxies JSON-RPC messages from Stdio to the Cloudflare Worker.
 * Usage: node bridge.js
 */

import * as readline from 'readline';

const WORKER_URL = "https://earnings-mcp-server.brilliantforecast.workers.dev/mcp";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const request = JSON.parse(line);
        handleRequest(request);
    } catch (e) {
        console.error("Parse Error:", e.message);
    }
});

async function handleRequest(request) {
    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            console.error(`Worker Error: ${response.status} ${response.statusText}`);
            try { console.error(await response.text()); } catch (e) { }
            return;
        }

        const data = await response.json();
        // MCP Strictness: Output must be exactly one JSON line
        process.stdout.write(JSON.stringify(data) + "\n");
    } catch (error) {
        console.error("Bridge Connection Error:", error.message);
    }
}
