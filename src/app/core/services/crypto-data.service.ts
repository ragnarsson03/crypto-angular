import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, map, Observable, switchMap, timer, catchError, of } from 'rxjs';
import { CryptoAsset } from '../models/crypto.model';

@Injectable({
    providedIn: 'root'
})
export class CryptoDataService {
    private http = inject(HttpClient);

    // Cache local para mantener el historial de precios (necesario para el Worker)
    private assetsCache: Map<string, CryptoAsset> = new Map();

    private readonly initialAssets: CryptoAsset[] = [
        { id: 'bitcoin', symbol: 'BTC', price: 95000, changePercent: 0, volume: 0, high24h: 0, low24h: 0, history: [] },
        { id: 'ethereum', symbol: 'ETH', price: 6500, changePercent: 0, volume: 0, high24h: 0, low24h: 0, history: [] },
        { id: 'solana', symbol: 'SOL', price: 350, changePercent: 0, volume: 0, high24h: 0, low24h: 0, history: [] },
        { id: 'cardano', symbol: 'ADA', price: 1.20, changePercent: 0, volume: 0, high24h: 0, low24h: 0, history: [] },
        { id: 'polkadot', symbol: 'DOT', price: 15.0, changePercent: 0, volume: 0, high24h: 0, low24h: 0, history: [] }
    ];

    constructor() {
        this.initializeCache();
    }

    private initializeCache() {
        this.initialAssets.forEach(a => this.assetsCache.set(a.id, { ...a }));
    }

    // --- MODO: Simulación Alta Frecuencia (200ms) ---
    getSimulatedPrices(): Observable<CryptoAsset[]> {
        // Usamos timer(0, 200) para emitir inmediatamente
        return timer(0, 200).pipe(
            map(() => this.generateSimulatedData())
        );
    }

    private generateSimulatedData(): CryptoAsset[] {
        return Array.from(this.assetsCache.values()).map(asset => {
            // Simular fluctuación aleatoria (+/- 2%)
            const volatility = 0.02;
            const change = 1 + (Math.random() * volatility - (volatility / 2));
            const newPrice = asset.price * change;

            // Simular otros datos
            const simulatedData = {
                price: newPrice,
                changePercent: asset.changePercent + (Math.random() * 0.1 - 0.05),
                volume: Math.random() * 1000000,
                high24h: newPrice * 1.05,
                low24h: newPrice * 0.95
            };

            return this.updateAssetInCache(asset, simulatedData);
        });
    }

    // --- MODO: Mercado Real (API Optimizada) ---
    getRealPrices(): Observable<CryptoAsset[]> {
        // Polling cada 5s para evitar baneos
        return timer(0, 5000).pipe(
            switchMap(() => this.fetchFromBinance())
        );
    }

    private fetchFromBinance(): Observable<CryptoAsset[]> {
        const symbols = '["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT","DOTUSDT"]';
        // Endpoint OPTIMIZADO: ticker/24hr trae todo (Price, Change, Vol, High, Low)
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;

        return this.http.get<any[]>(url).pipe(
            map(response => {
                const symbolToIdMap: { [key: string]: string } = {
                    'BTCUSDT': 'bitcoin',
                    'ETHUSDT': 'ethereum',
                    'SOLUSDT': 'solana',
                    'ADAUSDT': 'cardano',
                    'DOTUSDT': 'polkadot'
                };

                return Array.from(this.assetsCache.values()).map(cachedAsset => {
                    const binanceData = response.find(item => symbolToIdMap[item.symbol] === cachedAsset.id);

                    if (binanceData) {
                        return this.updateAssetInCache(cachedAsset, this.normalizeData(binanceData));
                    }
                    return cachedAsset;
                });
            }),
            catchError(err => {
                console.error('Binance API Error:', err);
                return of(Array.from(this.assetsCache.values()));
            })
        );
    }

    // Normalización estricta de datos externos
    private normalizeData(apiData: any): Partial<CryptoAsset> {
        return {
            price: Number(apiData.lastPrice),
            changePercent: Number(apiData.priceChangePercent),
            volume: Number(apiData.volume),
            high24h: Number(apiData.highPrice),
            low24h: Number(apiData.lowPrice)
        };
    }

    // --- Lógica Común de Actualización ---
    private updateAssetInCache(asset: CryptoAsset, newData: Partial<CryptoAsset>): CryptoAsset {
        const newPrice = newData.price || asset.price;
        // En simulación calculamos el changePercent, en real viene de la API
        // Si newData trae changePercent lo usamos, sino lo calculamos (caso fallback)
        const changePercent = newData.changePercent !== undefined
            ? newData.changePercent
            : (asset.price !== 0 ? ((newPrice - asset.price) / asset.price) * 100 : 0);

        const newHistory = [...asset.history, newPrice].slice(-50);

        const updatedAsset: CryptoAsset = {
            ...asset,
            price: newPrice,
            changePercent: changePercent,
            volume: newData.volume || 0,
            high24h: newData.high24h || 0,
            low24h: newData.low24h || 0,
            history: newHistory
        };

        this.assetsCache.set(asset.id, updatedAsset);
        return updatedAsset;
    }
}