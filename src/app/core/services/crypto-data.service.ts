
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, map, Observable, switchMap, timer, catchError, of, forkJoin, merge } from 'rxjs';
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

    // --- MODO: Mercado Real (Hydrated + Live Ticker) ---
    getRealPrices(): Observable<CryptoAsset[]> {
        // Merge: Combina la hidratación inicial (History) + Ticker en vivo (Polling)
        // Esto asegura que la gráfica se pinte rápido mientras llegan los precios en tiempo real
        return merge(
            this.fetchInitialHistory(),
            timer(0, 5000).pipe(switchMap(() => this.fetchFromBinance()))
        );
    }

    // --- Helper: Fetch with Proxy Fallback ---
    private fetchWithFallback<T>(endpoint: string, params: string = ''): Observable<T> {
        const proxyUrl = `/api/v3${endpoint}${params}`;
        const directUrl = `https://api.binance.com/api/v3${endpoint}${params}`;

        return this.http.get<T>(proxyUrl).pipe(
            catchError(error => {
                // Manejo especial para 404 (Proxy no configurado o inactivo) para no ensuciar la consola
                if (error.status === 404) {
                    console.warn(`ℹ️ Modo Dev: Proxy local no detectado. Usando conexión directa a Binance.`);
                } else {
                    console.warn(`⚠️ Proxy Error [${proxyUrl}]: ${error.status} ${error.statusText}`);
                }

                // Fallback inmediato
                return this.http.get<T>(directUrl);
            })
        );
    }

    // Fetch inicial de K-Lines para poblar las gráficas (Sparklines)
    private fetchInitialHistory(): Observable<CryptoAsset[]> {
        const requests = Array.from(this.assetsCache.values()).map(asset => {
            const binanceSymbol = `${asset.symbol}USDT`;
            const params = `?symbol=${binanceSymbol}&interval=1h&limit=50`;

            return this.fetchWithFallback<any[][]>('/klines', params).pipe(
                map(klines => {
                    const history = klines.map(k => parseFloat(k[4]));
                    const current = this.assetsCache.get(asset.id)!;
                    const updated = { ...current, history };
                    this.assetsCache.set(asset.id, updated);
                    return updated;
                }),
                catchError(err => {
                    console.error(`❌ History Fetch Failed [${asset.symbol}]:`, err.message);
                    return of(asset);
                })
            );
        });

        return forkJoin(requests);
    }

    private fetchFromBinance(): Observable<CryptoAsset[]> {
        // Formato simple pero robusto
        const symbols = '["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT","DOTUSDT"]';
        const params = `?symbols=${encodeURIComponent(symbols)}`;

        return this.fetchWithFallback<any[]>('/ticker/24hr', params).pipe(
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
                console.error('❌ Critical API Error (Ticker):', err.message);
                return of([]);
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