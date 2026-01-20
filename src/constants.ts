// API Configuration - reads from globalThis in Cloudflare Workers or process.env in Node.js
export function getEarningsApiUrl(): string {
    return (globalThis as any).__EARNINGS_API_URL || process.env.EARNINGS_API_URL || 'https://earnings.bforecast.workers.dev';
}



export const CLOUDFLARE_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Response limits
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_TIMEOUT = 30000;

// Pagination defaults
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

