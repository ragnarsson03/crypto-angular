/// <reference lib="webworker" />
import { WorkerData, WorkerResponse } from './core/models/crypto.model';

addEventListener('message', ({ data }: { data: WorkerData }) => {

    if (data.action === 'CALCULATE_STATS') {
        const results: WorkerResponse[] = data.payload.map(asset => {
            return {
                id: asset.id,
                sma: calculateMovingAverage(asset.history),
                volatility: calculateVolatility(asset.history)
            };
        });

        // Send back the array of results directly
        postMessage(results);
    }
});

// Función pura: Promedio Móvil
function calculateMovingAverage(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, curr) => acc + curr, 0);
    return sum / prices.length;
}

// Función pura: Volatilidad (Desviación Estándar simplificada)
function calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const avg = calculateMovingAverage(prices);
    const squareDiffs = prices.map(price => Math.pow(price - avg, 2));
    const avgSquareDiff = calculateMovingAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}