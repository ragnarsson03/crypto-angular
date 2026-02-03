import { Injectable } from '@angular/core';
import { Observable, interval, map, shareReplay } from 'rxjs';
import { CryptoAsset } from '../models/crypto.model';

@Injectable({
    providedIn: 'root'
})
export class CryptoDataService {

    // Lista inicial de criptos (Requisito: Al menos 5)
    private readonly INITIAL_DATA: CryptoAsset[] = [
        { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 45000, lastPrice: 45000, changePercent: 0, history: [] },
        { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 3000, lastPrice: 3000, changePercent: 0, history: [] },
        { id: 'sol', symbol: 'SOL', name: 'Solana', price: 100, lastPrice: 100, changePercent: 0, history: [] },
        { id: 'ada', symbol: 'ADA', name: 'Cardano', price: 1.2, lastPrice: 1.2, changePercent: 0, history: [] },
        { id: 'dot', symbol: 'DOT', name: 'Polkadot', price: 15, lastPrice: 15, changePercent: 0, history: [] }
    ];

    /**
     * Stream principal que emite nuevos precios cada 200ms
     * Requisito: RxJS interval de alta frecuencia
     */
    getPricesStream(): Observable<CryptoAsset[]> {
        return interval(200).pipe(
            map(() => this.simulateMarketMovement()),
            shareReplay(1) // Para que múltiples suscriptores reciban el último valor
        );
    }

    // Lógica "Dummy" para simular que el precio sube o baja
    private simulateMarketMovement(): CryptoAsset[] {
        return this.INITIAL_DATA.map(asset => {
            const volatility = 0.02; // 2% de volatilidad máxima
            const change = 1 + (Math.random() * volatility - (volatility / 2));

            const newPrice = asset.price * change;

            // Actualizamos el historial (máximo 50 puntos para no saturar memoria)
            const newHistory = [...asset.history, newPrice].slice(-50);

            // Mutamos el objeto (en una app real clonaríamos, pero aquí optimizamos velocidad)
            asset.lastPrice = asset.price;
            asset.price = newPrice;
            asset.changePercent = ((newPrice - 45000) / 45000) * 100; // Simulación simple %
            asset.history = newHistory;

            return { ...asset }; // Retornamos copia superficial para activar detección de cambios
        });
    }
}