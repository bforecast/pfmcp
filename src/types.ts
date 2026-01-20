// Portfolio Types
export interface Portfolio {
    id: number;
    name: string;
    description: string | null;
    type: string | null;
    reference: string | null;
    created_at: string;
    member_count: number;
    // Stats from portfolio_stats
    cagr: number | null;
    std_dev: number | null;
    max_drawdown: number | null;
    sharpe: number | null;
    sortino: number | null;
    correlation_spy: number | null;
    change_1d: number | null;
    dr: number | null;
    last_score: number | null;
    stats_updated_at: string | null;
}

export interface PortfolioHolding {
    symbol: string;
    name: string;
    allocation: number;
    price: number;
    forward_peg: number | null;
    change_1d: number | null;
    change_ytd: number | null;
}

export interface DashboardData {
    lastUpdated: string | null;
    data: PortfolioHolding[];
}

// Stock Types
export interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    market_cap: number | null;
    pe_ratio: number | null;
    forward_pe: number | null;
    ps_ratio: number | null;
    dividend_yield: number | null;
    fifty_two_week_high: number | null;
    fifty_two_week_high_change_percent: number | null;
    change_percent: number | null;
    volume: number | null;
    updated_at: string | null;
}

export interface StockStats {
    symbol: string;
    volatility: number | null;
    sharpe_ratio_1y: number | null;
    return_1y: number | null;
    return_ytd: number | null;
    max_drawdown: number | null;
    updated_at: string | null;
}

export interface PriceHistory {
    date: string;
    close: number;
}

export interface EarningsEstimate {
    symbol: string;
    fiscal_date_ending: string;
    eps_estimate: number | null;
    eps_actual: number | null;
    revenue_estimate: number | null;
    revenue_actual: number | null;
}

export interface StockDetails {
    quote: StockQuote & StockStats;
    history: PriceHistory[];
    earnings: EarningsEstimate[];
    holdings: Array<{
        id: number;
        name: string;
        allocation: number;
    }>;
}

// Scoring Types
export interface PortfolioScore {
    group_id: number;
    total_score: number;
    holdings_score: number;
    performance_score: number;
    components: {
        quality: number;
        valuation: number;
        momentum: number;
        diversification: number;
    };
    raw_metrics: Record<string, number>;
    stock_details: Array<{
        symbol: string;
        weight: number;
        score: number;
        raw: Record<string, number>;
    }>;
}

// Response format enum
export enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}

// API Response wrapper
export interface ApiResponse<T> {
    data?: T;
    error?: string;
}
