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
        { id: 'bitcoin', symbol: 'BTC', price: 95000, changePercent: 0, history: [] }, // Base 2026
        { id: 'ethereum', symbol: 'ETH', price: 6500, changePercent: 0, history: [] },
        { id: 'solana', symbol: 'SOL', price: 350, changePercent: 0, history: [] },
        { id: 'cardano', symbol: 'ADA', price: 1.20, changePercent: 0, history: [] },
        { id: 'polkadot', symbol: 'DOT', price: 15.0, changePercent: 0, history: [] }
    ];

    constructor() {
        this.initializeCache();
    }

    private initializeCache() {
        this.initialAssets.forEach(a => this.assetsCache.set(a.id, { ...a }));
    }

    // --- MODO: Simulación Alta Frecuencia (200ms) ---
    getSimulatedPrices(): Observable<CryptoAsset[]> {
        return interval(200).pipe(
            map(() => this.generateSimulatedData())
        );
    }

    private generateSimulatedData(): CryptoAsset[] {
        return Array.from(this.assetsCache.values()).map(asset => {
            // Simular fluctuación aleatoria (+/- 2%)
            const volatility = 0.02;
            const change = 1 + (Math.random() * volatility - (volatility / 2));
            const newPrice = asset.price * change;

            return this.updateAssetInCache(asset, newPrice);
        });
    }

    // --- MODO: Mercado Real (API) ---
    getRealPrices(): Observable<CryptoAsset[]> {
        // Timer para polling cada 10s
        return timer(0, 10000).pipe(
            switchMap(() => this.fetchFromBinance())
        );
    }

    private fetchFromBinance(): Observable<CryptoAsset[]> {
        // Símbolos de Binance para nuestros assets
        const symbols = '["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT","DOTUSDT"]';
        // Codificar URL params correctamente es buena práctica, aunque Binance acepta raw string en algunos casos, mejor encoded.
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`;

        return this.http.get<any[]>(url).pipe(
            map(response => {
                // Mapa inverso para relacionar Symbol de Binance -> ID Interno
                const symbolToIdMap: { [key: string]: string } = {
                    'BTCUSDT': 'bitcoin',
                    'ETHUSDT': 'ethereum',
                    'SOLUSDT': 'solana',
                    'ADAUSDT': 'cardano',
                    'DOTUSDT': 'polkadot'
                };

                return Array.from(this.assetsCache.values()).map(cachedAsset => {
                    // Buscar el objeto correspondiente en la respuesta de Binance
                    // Binance retorna array: [{symbol: "BTCUSDT", price: "78684.12"}, ...]
                    // Necesitamos encontrar el que coincida con el symbol mapeado

                    // Nota: Podríamos optimizar creando un Map de la respuesta primero, pero para 5 items filter/find está bien.
                    const binanceTicket = response.find(item => symbolToIdMap[item.symbol] === cachedAsset.id);

                    if (binanceTicket) {
                        const newPrice = parseFloat(binanceTicket.price);
                        return this.updateAssetInCache(cachedAsset, newPrice);
                    }

                    return cachedAsset; // Fallback: mantener último precio conocido
                });
            }),
            // Resiliencia: Si falla la petición HTTP, devolvemos lo que hay en caché en lugar de romper el stream
            catchError(err => {
                console.error('Binance API Error (CORS/Network):', err);
                return of(Array.from(this.assetsCache.values()));
            })
        );
    }

    // --- Lógica Común de Actualización ---
    private updateAssetInCache(asset: CryptoAsset, newPrice: number): CryptoAsset {
        // Calcular % cambio vs el tick anterior
        const changePercent = asset.price !== 0 ? ((newPrice - asset.price) / asset.price) * 100 : 0;

        // Actualizar historial (fifo 50 items)
        const newHistory = [...asset.history, newPrice].slice(-50);

        const updatedAsset: CryptoAsset = {
            ...asset,
            price: newPrice,
            changePercent: changePercent,
            history: newHistory
        };

        // Guardar en caché para la próxima iteración
        this.assetsCache.set(asset.id, updatedAsset);

        return updatedAsset;
    }
}