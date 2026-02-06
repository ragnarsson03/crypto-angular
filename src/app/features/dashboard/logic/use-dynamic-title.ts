import { effect, Signal, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CryptoAsset, WorkerResponse } from '../../../core/models/crypto.model';

export function useDynamicTitle(
    pricesSignal: Signal<CryptoAsset[]>,
    statsSignal: Signal<WorkerResponse[]>
) {
    const titleService = inject(Title);

    effect(() => {
        const prices = pricesSignal();
        const stats = statsSignal();

        // Count active alerts
        const activeAlerts = stats.filter(s => s.isAlertActive).length;

        if (activeAlerts > 0) {
            titleService.setTitle(`🚨 ${activeAlerts} ALERTAS | Monitor`);
        } else {
            const btc = prices.find(p => p.id === 'bitcoin');
            if (btc && btc.price > 0) {
                // Formato: $95,430.20 | BTC/USDT - Monitor
                const priceFormatted = btc.price.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                titleService.setTitle(`$${priceFormatted} | BTC/USDT - Monitor`);
            } else {
                titleService.setTitle('Monitor de Criptomonedas');
            }
        }
    });
}
