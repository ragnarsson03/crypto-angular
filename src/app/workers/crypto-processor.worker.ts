/// <reference lib="webworker" />

import { WorkerData, WorkerResponse } from '../core/models/crypto.model';

addEventListener('message', ({ data }: { data: WorkerData }) => {
    if (data.action === 'CALCULATE_STATS') {
        const results = calculateStats(data);
        postMessage(results);
    }
});

function calculateStats(data: WorkerData): WorkerResponse[] {
    return data.payload.map(asset => {
        const prices = asset.history;
        // If no history, defaults to 0
        if (!prices || prices.length === 0) {
            return { id: asset.id, sma: 0, volatility: 0 };
        }

        // 1. Calculate Simple Moving Average (SMA)
        const sum = prices.reduce((acc, p) => acc + p, 0);
        const sma = sum / prices.length;

        // 2. Calculate Volatility (Standard Deviation)
        const squaredDiffs = prices.map(p => Math.pow(p - sma, 2));
        const avgSquaredDiff = squaredDiffs.reduce((acc, d) => acc + d, 0) / prices.length;
        const volatility = Math.sqrt(avgSquaredDiff);

        return {
            id: asset.id, // Correct property name 'id' instead of 'assetId'
            sma,
            volatility
        };
    });
}
