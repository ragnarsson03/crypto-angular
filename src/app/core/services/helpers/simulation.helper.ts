import { CryptoAsset } from '../../models/crypto.model';

export class SimulationHelper {
    // Generar un historial sintético de 50 puntos basado en el precio actual
    // para evitar "gráficas planas" al inicio.
    static generateSyntheticHistory(currentPrice: number, points: number = 50): number[] {
        const history: number[] = [];
        let price = currentPrice;

        // Generamos hacia atrás
        for (let i = 0; i < points; i++) {
            history.unshift(price);
            // Simular volatilidad inversa
            const change = 1 + (Math.random() * 0.02 - 0.01);
            price = price * change;
        }
        return history;
    }

    static updateSimulationStep(currentAsset: CryptoAsset): Partial<CryptoAsset> {
        const volatility = 0.015;
        const changeFactor = 1 + (Math.random() * volatility - (volatility / 2));
        const newPrice = currentAsset.price * changeFactor;

        return {
            price: newPrice,
            volume: currentAsset.volume + (Math.random() * 1000),
            changePercent: currentAsset.changePercent + (Math.random() * 0.1 - 0.05)
        };
    }
}
