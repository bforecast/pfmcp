import { getEarningsApiUrl, DEFAULT_TIMEOUT } from '../constants.js';
import type { Portfolio, DashboardData, StockDetails, PortfolioScore } from '../types.js';

/**
 * Handle API errors and return user-friendly messages
 */
export function handleApiError(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes('404')) {
            return "Error: Resource not found. Please check the ID or symbol is correct.";
        } else if (error.message.includes('403')) {
            return "Error: Permission denied. Authentication may be required.";
        } else if (error.message.includes('429')) {
            return "Error: Rate limit exceeded. Please wait before making more requests.";
        } else if (error.message.includes('500')) {
            return `Error: Server error - ${error.message}`;
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
            return "Error: Request timed out. The server may be slow or unavailable.";
        }
        return `Error: ${error.message}`;
    }
    return `Error: Unexpected error occurred: ${String(error)}`;
}

/**
 * Make an API request using fetch
 */
async function apiRequest<T>(path: string, params?: Record<string, string>): Promise<T> {
    const baseUrl = getEarningsApiUrl();
    const url = new URL(path, baseUrl);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Fetch all portfolios with stats
 */
export async function fetchPortfolios(): Promise<Portfolio[]> {
    return apiRequest<Portfolio[]>('/api/portfolios');
}

/**
 * Fetch dashboard data for a specific portfolio
 */
export async function fetchDashboardData(groupId?: number): Promise<DashboardData> {
    const params = groupId ? { groupId: groupId.toString() } : undefined;
    return apiRequest<DashboardData>('/api/dashboard-data', params);
}

/**
 * Fetch stock details by symbol
 */
export async function fetchStockDetails(symbol: string): Promise<StockDetails> {
    return apiRequest<StockDetails>(`/api/stock-details/${symbol.toUpperCase()}`);
}

/**
 * Fetch portfolio scoring details
 */
export async function fetchPortfolioScore(groupId: number): Promise<PortfolioScore> {
    return apiRequest<PortfolioScore>(`/api/scoring/${groupId}`);
}

/**
 * Fetch cron summary (system health)
 */
export async function fetchCronSummary(): Promise<any> {
    return apiRequest<any>('/api/cron-summary');
}
