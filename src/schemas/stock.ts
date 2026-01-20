import { z } from 'zod';
import { ResponseFormat } from '../types.js';

// Common response format schema
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

// Get stock quote input schema
export const GetStockQuoteInputSchema = z.object({
    symbol: z.string()
        .min(1)
        .max(10)
        .transform(s => s.toUpperCase())
        .describe("Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
    response_format: ResponseFormatSchema
}).strict();

export type GetStockQuoteInput = z.infer<typeof GetStockQuoteInputSchema>;

// Get stock details input schema
export const GetStockDetailsInputSchema = z.object({
    symbol: z.string()
        .min(1)
        .max(10)
        .transform(s => s.toUpperCase())
        .describe("Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
    include_history: z.boolean()
        .default(true)
        .describe("Include 1-year price history in response"),
    include_earnings: z.boolean()
        .default(true)
        .describe("Include earnings estimates in response"),
    response_format: ResponseFormatSchema
}).strict();

export type GetStockDetailsInput = z.infer<typeof GetStockDetailsInputSchema>;

// Get stock stats input schema
export const GetStockStatsInputSchema = z.object({
    symbol: z.string()
        .min(1)
        .max(10)
        .transform(s => s.toUpperCase())
        .describe("Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)"),
    response_format: ResponseFormatSchema
}).strict();

export type GetStockStatsInput = z.infer<typeof GetStockStatsInputSchema>;

// AI analyze stock input schema
export const AIAnalyzeStockInputSchema = z.object({
    symbol: z.string()
        .min(1)
        .max(10)
        .transform(s => s.toUpperCase())
        .describe("Stock ticker symbol to analyze"),
    question: z.string()
        .min(5)
        .max(500)
        .optional()
        .describe("Optional specific question to ask about the stock")
}).strict();

export type AIAnalyzeStockInput = z.infer<typeof AIAnalyzeStockInputSchema>;
