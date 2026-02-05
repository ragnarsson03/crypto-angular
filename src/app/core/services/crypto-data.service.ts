
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, map, Observable, switchMap, timer, catchError, of, forkJoin, merge } from 'rxjs';
import { CryptoAsset } from '../models/crypto.model';

@Injectable({
    providedIn: 'root'
})
export class CryptoDataService {
    private http = inject(HttpClient);

    private assetsCache: Map<string, CryptoAsset> = new Map();
    private readonly API_BASE = 'https://api.binance.com/api/v3';

    // Configuración Base (Metadata pura)
    private readonly BASE_CONFIG = [
        { id: 'bitcoin', symbol: 'BTC' },
        { id: 'ethereum', symbol: 'ETH' },
        { id: 'solana', symbol: 'SOL' },
        { id: 'cardano', symbol: 'ADA' },
        { id: 'polkadot', symbol: 'DOT' }
    ];

    constructor() {
        this.initializeCache();
    }

    private initializeCache() {
        // Inicialización en CERO (Skeleton State)
        this.BASE_CONFIG.forEach(token => {
            this.assetsCache.set(token.id, {
                ...token,
                price: 0,
                changePercent: 0,
                volume: 0,
                high24h: 0,
                low24h: 0,
                history: []
            });
        });
    }

    // --- MODO: Simulación (Hydrated from Real Market) ---
    getSimulatedPrices(): Observable<CryptoAsset[]> {
        // 1. Verificar si necesitamos hidratación inicial con precios reales
        const needsHydration = this.assetsCache.get('bitcoin')?.price === 0;

        if (needsHydration) {
            // 2. Primero obtenemos los precios REALES de Binance
            return this.fetchRealTimeTicker().pipe(
                catchError(err => {
                    // Si falla la API, usamos fallback de semillas mock
                    console.warn('⚠️ API hydration failed. Using fallback seeds for simulation.');
                    this.seedSimulationData();
                    return of(Array.from(this.assetsCache.values()));
                }),
                switchMap(() => {
                    // 3. Una vez hidratado, iniciamos el motor de simulación
                    return timer(0, 200).pipe(
                        map(() => this.updateSimulationStep())
                    );
                })
            );
        } else {
            // Ya tenemos precios (cambio de pestaña), continuamos simulación
            return timer(0, 200).pipe(
                map(() => this.updateSimulationStep())
            );
        }
    }

    // --- MODO: Mercado Real ---
    getRealPrices(): Observable<CryptoAsset[]> {
        return merge(
            this.fetchInitialHistory(),
            timer(0, 5000).pipe(switchMap(() => this.fetchRealTimeTicker()))
        );
    }

    // --- Lógica de Simulación ---
    private seedSimulationData() {
        const basePrices: Record<string, number> = {
            'bitcoin': 65000, 'ethereum': 3200, 'solana': 140, 'cardano': 0.45, 'polkadot': 7.5
        };

        this.BASE_CONFIG.forEach(token => {
            const current = this.assetsCache.get(token.id)!;
            this.assetsCache.set(token.id, {
                ...current,
                price: basePrices[token.id] || 100,
                volume: 500000 + Math.random() * 500000
            });
        });
    }

    private updateSimulationStep(): CryptoAsset[] {
        return Array.from(this.assetsCache.values()).map(asset => {
            const volatility = 0.015;
            const changeFactor = 1 + (Math.random() * volatility - (volatility / 2));
            const newPrice = asset.price * changeFactor;

            const changes: Partial<CryptoAsset> = {
                price: newPrice,
                volume: asset.volume + (Math.random() * 1000),
                changePercent: asset.changePercent + (Math.random() * 0.1 - 0.05)
            };

            return this.updateAssetInCache(asset, changes);
        });
    }

    // --- Lógica API ---
    private fetchRealTimeTicker(): Observable<CryptoAsset[]> {
        const symbols = JSON.stringify(this.BASE_CONFIG.map(t => `${t.symbol}USDT`));
        const params = `?symbols=${encodeURIComponent(symbols)}`;

        return this.fetchFromApi<any[]>('/ticker/24hr', params).pipe(
            map(response => {
                const responseMap = new Map(response.map(item => [item.symbol, item]));

                return this.BASE_CONFIG.map(token => {
                    const apiData = responseMap.get(`${token.symbol}USDT`);
                    const current = this.assetsCache.get(token.id)!;

                    if (apiData) {
                        return this.updateAssetInCache(current, this.normalizeApiData(apiData));
                    }
                    return current;
                });
            }),
            catchError(err => {
                console.error('❌ Ticker API failed:', err.message);
                return of([]);
            })
        );
    }

    private fetchInitialHistory(): Observable<CryptoAsset[]> {
        const requests = this.BASE_CONFIG.map(token => {
            const symbol = `${token.symbol}USDT`;
            const params = `?symbol=${symbol}&interval=1h&limit=50`;

            return this.fetchFromApi<any[][]>('/klines', params).pipe(
                map(klines => {
                    const history = klines.map(k => parseFloat(k[4]));
                    const current = this.assetsCache.get(token.id)!;
                    const updated = { ...current, history };
                    this.assetsCache.set(token.id, updated);
                    return updated;
                }),
                catchError(err => of(this.assetsCache.get(token.id)!))
            );
        });
        return forkJoin(requests);
    }

    // --- Helpers ---
    private fetchFromApi<T>(endpoint: string, params: string): Observable<T> {
        const url = `${this.API_BASE}${endpoint}${params}`;
        return this.http.get<T>(url);
    }

    private normalizeApiData(data: any): Partial<CryptoAsset> {
        return {
            price: parseFloat(data.lastPrice),
            changePercent: parseFloat(data.priceChangePercent),
            volume: parseFloat(data.volume),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice)
        };
    }

    private updateAssetInCache(asset: CryptoAsset, changes: Partial<CryptoAsset>): CryptoAsset {
        const newPrice = changes.price || asset.price;
        const history = asset.history ? [...asset.history] : [];

        // Solo agregamos al historial si el precio cambió o es simulación
        if (newPrice !== asset.price || history.length === 0) {
            history.push(newPrice);
            if (history.length > 50) history.shift();
        }

        const updated = { ...asset, ...changes, history };
        this.assetsCache.set(asset.id, updated);
        return updated;
    }
}
