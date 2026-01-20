import { z } from 'zod';
import { ResponseFormat } from '../types.js';

// Common response format schema
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

// List portfolios input schema
export const ListPortfoliosInputSchema = z.object({
    response_format: ResponseFormatSchema
}).strict();

export type ListPortfoliosInput = z.infer<typeof ListPortfoliosInputSchema>;

// Get portfolio holdings input schema
export const GetPortfolioHoldingsInputSchema = z.object({
    group_id: z.number()
        .int()
        .positive()
        .describe("Portfolio/group ID to get holdings for"),
    response_format: ResponseFormatSchema
}).strict();

export type GetPortfolioHoldingsInput = z.infer<typeof GetPortfolioHoldingsInputSchema>;

// Get portfolio score input schema
export const GetPortfolioScoreInputSchema = z.object({
    group_id: z.number()
        .int()
        .positive()
        .describe("Portfolio/group ID to get scoring breakdown for"),
    response_format: ResponseFormatSchema
}).strict();

export type GetPortfolioScoreInput = z.infer<typeof GetPortfolioScoreInputSchema>;

// AI analyze portfolio input schema
export const AIAnalyzePortfolioInputSchema = z.object({
    group_id: z.number()
        .int()
        .positive()
        .describe("Portfolio/group ID to analyze"),
    question: z.string()
        .min(5)
        .max(500)
        .optional()
        .describe("Optional specific question to ask about the portfolio")
}).strict();

export type AIAnalyzePortfolioInput = z.infer<typeof AIAnalyzePortfolioInputSchema>;
