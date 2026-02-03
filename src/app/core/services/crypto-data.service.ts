import { Injectable } from '@angular/core';
import { interval, map, Observable } from 'rxjs';
import { CryptoAsset } from '../models/crypto.model';

@Injectable({
    providedIn: 'root'
})
export class CryptoDataService {
    private readonly initialAssets: CryptoAsset[] = [
        { id: 'bitcoin', symbol: 'BTC', price: 45000, changePercent: 0, history: [] },
        { id: 'ethereum', symbol: 'ETH', price: 3200, changePercent: 0, history: [] },
        { id: 'solana', symbol: 'SOL', price: 110, changePercent: 0, history: [] },
        { id: 'cardano', symbol: 'ADA', price: 0.65, changePercent: 0, history: [] },
        { id: 'polkadot', symbol: 'DOT', price: 7.5, changePercent: 0, history: [] }
    ];

    /*
     * Returns an observable that emits updated asset prices every 200ms.
     * Simulates price fluctuations and updates price history.
     */
    getRealTimePrices(): Observable<CryptoAsset[]> {
        return interval(200).pipe(
            map(() => this.simulatePriceChanges())
        );
    }

    private simulatePriceChanges(): CryptoAsset[] {
        return this.initialAssets.map(asset => {
            // Simulate random price fluctuation (+/- 2%)
            const volatility = 0.02;
            const change = 1 + (Math.random() * volatility - (volatility / 2));
            const newPrice = asset.price * change;

            // Calculate percent change relative to the previous price
            const changePercent = ((newPrice - asset.price) / asset.price) * 100;

            // Update history, keeping the last 50 data points for calculations
            const newHistory = [...asset.history, newPrice].slice(-50);

            // Return new object reference (immutability)
            const updatedAsset: CryptoAsset = {
                ...asset,
                price: newPrice,
                changePercent: changePercent,
                history: newHistory
            };

            // Update local state (side effect for simulation persistence) without mutation
            Object.assign(asset, updatedAsset);

            return updatedAsset;
        });
    }
}