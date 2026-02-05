
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, map, Observable, switchMap, timer, catchError, of, tap, forkJoin, merge } from 'rxjs';
import { BinanceTickerResponse, CryptoAsset } from '../models/crypto.model';
import { BinanceAdapterHelper } from './helpers/binance-adapter.helper';
import { SimulationHelper } from './helpers/simulation.helper';

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

    // --- MODO: Simulación (Hydrated) ---
    getSimulatedPrices(): Observable<CryptoAsset[]> {
        const needsHydration = this.assetsCache.get('bitcoin')?.price === 0;
        const source$ = needsHydration ? this.fetchRealTimeTicker() : of([]);

        return source$.pipe(
            tap((results: CryptoAsset[]) => {
                const stillEmpty = this.assetsCache.get('bitcoin')?.price === 0;
                if (needsHydration && (results?.length === 0 || stillEmpty)) {
                    console.warn('⚠️ API Hydration empty/failed. Enforcing fallback seeds.');
                    this.seedSimulationData();
                } else if (needsHydration) {
                    // Si hidratación exitosa, generamos historial sintético sobre el precio real
                    this.ensureHistoryIntegrity();
                }
            }),
            catchError(() => {
                this.seedSimulationData();
                return of([]);
            }),
            switchMap(() => {
                return timer(0, 200).pipe(
                    map(() => this.updateSimulationStep())
                );
            })
        );
    }

    // --- MODO: Mercado Real ---
    getRealPrices(): Observable<CryptoAsset[]> {
        return merge(
            this.fetchInitialHistory(),
            timer(0, 5000).pipe(switchMap(() => this.fetchRealTimeTicker()))
        );
    }

    // --- Helpers Internos (Delegados) ---
    private seedSimulationData() {
        const basePrices: Record<string, number> = {
            'bitcoin': 96000, 'ethereum': 3500, 'solana': 150, 'cardano': 0.50, 'polkadot': 8.0
        };

        this.BASE_CONFIG.forEach(token => {
            const current = this.assetsCache.get(token.id)!;
            const price = basePrices[token.id] || 100;
            // Generar 50 puntos de historia para que no nazca plana
            const history = SimulationHelper.generateSyntheticHistory(price);

            this.assetsCache.set(token.id, {
                ...current,
                price: price,
                volume: 500000 + Math.random() * 500000,
                history: history
            });
        });
    }

    private ensureHistoryIntegrity() {
        // Asegura que si venimos de API real pero sin klines, generamos algo de historia visual
        this.assetsCache.forEach(asset => {
            if (asset.history.length < 2 && asset.price > 0) {
                asset.history = SimulationHelper.generateSyntheticHistory(asset.price);
            }
        });
    }

    private updateSimulationStep(): CryptoAsset[] {
        return Array.from(this.assetsCache.values()).map(asset => {
            const changes = SimulationHelper.updateSimulationStep(asset);
            return this.updateAssetInCache(asset, changes);
        });
    }

    // --- Lógica API (Delegada a Adapter) ---
    private fetchRealTimeTicker(): Observable<CryptoAsset[]> {
        const symbols = JSON.stringify(this.BASE_CONFIG.map(t => `${t.symbol}USDT`));
        const params = `?symbols=${encodeURIComponent(symbols)}`;

        return this.fetchFromApi<BinanceTickerResponse[]>('/ticker/24hr', params).pipe(
            map(response => {
                const responseMap = new Map(response.map(item => [item.symbol, item]));

                return this.BASE_CONFIG.map(token => {
                    const apiData = responseMap.get(`${token.symbol}USDT`);
                    const current = this.assetsCache.get(token.id)!;

                    if (apiData) {
                        const normalized = BinanceAdapterHelper.normalizeTicker(apiData);
                        return this.updateAssetInCache(current, normalized);
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
                    const history = BinanceAdapterHelper.normalizeKlines(klines);
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

    private fetchFromApi<T>(endpoint: string, params: string): Observable<T> {
        const url = `${this.API_BASE}${endpoint}${params}`;
        return this.http.get<T>(url);
    }

    private updateAssetInCache(asset: CryptoAsset, changes: Partial<CryptoAsset>): CryptoAsset {
        const newPrice = changes.price || asset.price;
        const history = asset.history ? [...asset.history] : [];

        if (newPrice !== asset.price || history.length === 0) {
            history.push(newPrice);
            if (history.length > 50) history.shift();
        }

        const updated = { ...asset, ...changes, history };
        this.assetsCache.set(asset.id, updated);
        return updated;
    }
}
