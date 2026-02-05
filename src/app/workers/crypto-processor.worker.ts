/// <reference lib="webworker" />

import { WorkerData, WorkerResponse } from '../core/models/crypto.model';

/**
 * Utility class for pure mathematical calculations.
 * Stateless and functional approach for memory efficiency.
 */
class MathUtils {
    static calculateSMA(data: number[]): number {
        if (data.length === 0) return 0;
        return data.reduce((acc, val) => acc + val, 0) / data.length;
    }

    static calculateVolatility(data: number[], sma: number): number {
        if (data.length === 0) return 0;
        const squaredDiffs = data.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0);
        return Math.sqrt(squaredDiffs / data.length);
    }
}

addEventListener('message', ({ data }: { data: WorkerData }) => {
    if (data.action === 'CALCULATE_STATS') {
        try {
            const results = processCryptoData(data);
            postMessage(results);
        } catch (err) {
            console.error('Worker Calculation Error:', err);
        }
    }
});

function processCryptoData(data: WorkerData): WorkerResponse[] {
    return data.payload.map(asset => {
        // Sanitization: Ensure all history items are strict Numbers (Binance API resiliency)
        // Filter out any potential NaN or Invalid numbers early
        const prices = (asset.history || [])
            .map(p => Number(p))
            .filter(n => !isNaN(n));

        if (prices.length === 0) {
            return { id: asset.id, sma: 0, volatility: 0 };
        }

        const sma = MathUtils.calculateSMA(prices);
        const volatility = MathUtils.calculateVolatility(prices, sma);

        return {
            id: asset.id,
            sma,
            volatility
        };
    });
}
