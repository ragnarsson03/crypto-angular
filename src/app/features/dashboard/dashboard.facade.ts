import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CryptoDataService } from '../../core/services/crypto-data.service';
import { CryptoAsset, WorkerData, WorkerResponse } from '../../core/models/crypto.model';
import { useSoundAlert } from './logic/use-sound-alert';
import { useDynamicTitle } from './logic/use-dynamic-title';

@Injectable() // Local provider, NO providedIn: 'root'
export class DashboardFacade implements OnDestroy {
    private cryptoService = inject(CryptoDataService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    private priceSub?: Subscription;
    private timerSub?: Subscription;
    private worker: Worker | undefined;

    // --- State Signals ---
    readonly rawPrices = signal<CryptoAsset[]>([]);
    readonly marketStats = signal<WorkerResponse[]>([]);
    readonly statusMessage = signal<string>('');
    readonly activeTab = signal<'sim' | 'real'>('sim');
    readonly nextUpdateIn = signal<number>(10);
    readonly searchTerm = signal<string>('');
    readonly skeletonItems = Array(5).fill(0);

    // --- Computed ---
    readonly filteredPrices = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const prices = this.rawPrices();
        if (!term) return prices;
        return prices.filter(p =>
            p.id.toLowerCase().includes(term) || p.symbol.toLowerCase().includes(term)
        );
    });

    constructor() {
        // Initialize Tab from URL
        const tab = (this.route.snapshot.queryParamMap.get('tab') as 'sim' | 'real') || 'sim';
        this.activeTab.set(tab);

        // Initialize Web Worker
        this.initWorker();

        // Initialize Composables (Side Effects)
        useSoundAlert(this.marketStats);
        useDynamicTitle(this.rawPrices, this.marketStats);
    }

    init() {
        if (this.activeTab() === 'real') {
            this.statusMessage.set('⏳ Conectando con Binance API...');
            this.startRealMarket();
        } else {
            this.statusMessage.set('🔄 Iniciando motor de simulación...');
            this.startSimulation();
        }
    }

    // --- Actions ---
    switchTab(mode: 'sim' | 'real') {
        if (this.activeTab() === mode) return;

        this.activeTab.set(mode);
        this.cleanupSubscriptions();
        this.rawPrices.set([]);

        // Update URL without reload
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: mode },
            queryParamsHandling: 'merge'
        });

        if (mode === 'sim') {
            this.statusMessage.set('🔄 Iniciando motor de simulación...');
            this.startSimulation();
        } else {
            this.statusMessage.set('⏳ Sincronizando con Binance API...');
            this.startRealMarket();
        }
    }

    updateSearch(term: string) {
        this.searchTerm.set(term);
    }

    updateThreshold(id: string, value: number) {
        this.cryptoService.updateThreshold(id, value);
    }

    getStats(assetId: string): WorkerResponse | undefined {
        return this.marketStats().find(s => s.id === assetId);
    }

    goBack() {
        this.router.navigate(['/']);
    }

    ngOnDestroy() {
        this.cleanupSubscriptions();
        this.worker?.terminate();
    }

    // --- Private Methods ---
    private cleanupSubscriptions() {
        this.priceSub?.unsubscribe();
        this.timerSub?.unsubscribe();
    }

    private startSimulation() {
        this.priceSub = this.cryptoService.getSimulatedPrices().subscribe({
            next: (prices) => {
                this.statusMessage.set('');
                this.handleDataUpdate(prices);
            },
            error: () => this.statusMessage.set('⚠️ Error en simulación')
        });
    }

    private startRealMarket() {
        this.priceSub = this.cryptoService.getRealPrices().subscribe({
            next: (prices) => {
                if (prices.length === 0) {
                    this.statusMessage.set('⚠️ Sin datos: Verificando conexión...');
                } else {
                    this.statusMessage.set('');
                    this.handleDataUpdate(prices);
                }
                this.resetTimer();
            },
            error: () => this.statusMessage.set('⚠️ Error Crítico de API')
        });

        this.resetTimer();
        this.timerSub = interval(1000).subscribe(() => {
            this.nextUpdateIn.update(v => v > 0 ? v - 1 : 5);
        });
    }

    private resetTimer() {
        this.nextUpdateIn.set(5);
    }

    private handleDataUpdate(prices: CryptoAsset[]) {
        this.rawPrices.set(prices);
        this.postMessageToWorker(prices);
    }

    // --- Worker Logic ---
    private initWorker() {
        if (typeof Worker !== 'undefined') {
            this.worker = new Worker(new URL('../../workers/crypto-processor.worker', import.meta.url));
            this.worker.onmessage = ({ data }: { data: WorkerResponse[] }) => {
                this.marketStats.set(data);
            };
            this.worker.onerror = (err) => console.error('Worker Error:', err);
        } else {
            console.warn('Web Workers not supported');
        }
    }

    private postMessageToWorker(assets: CryptoAsset[]) {
        if (this.worker) {
            const message: WorkerData = {
                action: 'CALCULATE_STATS',
                payload: assets
            };
            this.worker.postMessage(message);
        }
    }
}
