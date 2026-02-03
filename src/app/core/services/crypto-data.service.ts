import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, map, Observable, switchMap, timer } from 'rxjs';
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
        // Timer para polling cada 10s (CoinGecko rate limit friendly-ish)
        return timer(0, 10000).pipe(
            switchMap(() => this.fetchFromCoinGecko())
        );
    }

    private fetchFromCoinGecko(): Observable<CryptoAsset[]> {
        const ids = 'bitcoin,ethereum,solana,cardano,polkadot';
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

        return this.http.get<any>(url).pipe(
            map(response => {
                return Array.from(this.assetsCache.values()).map(cachedAsset => {
                    const data = response[cachedAsset.id];
                    if (data) {
                        // Si la API falla o devuelve incorrecto, podríamos usar un fallback aquí
                        const newPrice = data.usd;
                        // CoinGecko da el cambio de 24h, podríamos usarlo directamente o calcular el instantáneo.
                        // Para consistencia con el worker, calcularemos el instantáneo en updateAssetInCache si quisiéramos,
                        // pero aquí usaremos el dato de la API para visualización y el historial para el worker.

                        // Ojo: updateAssetInCache calcula changePercent basado en el ULTIMO precio registrado por nosotros.
                        const updated = this.updateAssetInCache(cachedAsset, newPrice);

                        // Opcional: Sobreescribir el changePercent con el valor real de 24h de la API si se prefiere visualmente
                        // updated.changePercent = data.usd_24h_change; 

                        return updated;
                    }
                    return cachedAsset; // Fallback: devolver el último conocido si no viene en la API
                });
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