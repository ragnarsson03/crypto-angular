import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { CryptoDataService } from '../../core/services/crypto-data.service';
import { CryptoAsset, WorkerData, WorkerResponse } from '../../core/models/crypto.model';
import { CryptoCardComponent } from '../../shared/components/crypto-card/crypto-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CryptoCardComponent],
  template: `
    <div class="dashboard-container">
      <header>
        <div class="title-section">
          <h1>Crypto Live Monitor <span class="live-indicator">LIVE</span></h1>
          <p>Real-time market analysis powered by Web Workers</p>
        </div>
        
        <div class="controls">
          <div class="tabs">
            <button 
              [class.active]="activeTab() === 'sim'" 
              (click)="switchTab('sim')">
              Simulación (200ms)
            </button>
            <button 
              [class.active]="activeTab() === 'real'" 
              (click)="switchTab('real')">
              Mercado Real (API)
            </button>
          </div>
          
          @if (activeTab() === 'real') {
            <div class="timer-badge">
              Próxima actualización en: {{ nextUpdateIn() }}s
            </div>
          }
        </div>
      </header>

      <div class="grid">
        @for (asset of rawPrices(); track trackByAssetId($index, asset)) {
          <app-crypto-card 
            [asset]="asset" 
            [stats]="getStats(asset.id)">
          </app-crypto-card>
        } @empty {
          <div class="loading">
            {{ activeTab() === 'real' ? 'Conectando con CoinGecko...' : 'Iniciando simulación...' }}
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private cryptoService = inject(CryptoDataService);
  private priceSub?: Subscription;
  private timerSub?: Subscription;
  private worker: Worker | undefined;

  // Signals for state management
  readonly rawPrices = signal<CryptoAsset[]>([]);
  readonly marketStats = signal<WorkerResponse[]>([]);

  // Tab State
  readonly activeTab = signal<'sim' | 'real'>('sim');
  readonly nextUpdateIn = signal<number>(10);

  constructor() {
    this.initWorker();
  }

  ngOnInit() {
    this.startSimulation();
  }

  ngOnDestroy() {
    this.cleanupSubscriptions();
    this.worker?.terminate();
  }

  // --- Tab Switching Logic ---
  switchTab(mode: 'sim' | 'real') {
    if (this.activeTab() === mode) return;

    this.activeTab.set(mode);
    this.cleanupSubscriptions();
    this.rawPrices.set([]); // Limpiar vista momentáneamente

    if (mode === 'sim') {
      this.startSimulation();
    } else {
      this.startRealMarket();
    }
  }

  private cleanupSubscriptions() {
    this.priceSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  // --- Data Providers ---

  private startSimulation() {
    this.priceSub = this.cryptoService.getSimulatedPrices().subscribe({
      next: (prices) => this.handleDataUpdate(prices),
      error: (err) => console.error('Simulation Error:', err)
    });
  }

  private startRealMarket() {
    // 1. Iniciar subscripción de datos
    this.priceSub = this.cryptoService.getRealPrices().subscribe({
      next: (prices) => {
        this.handleDataUpdate(prices);
        this.resetTimer();
      },
      error: (err) => console.error('API Error:', err)
    });

    // 2. Iniciar Timer visual (solo cosmético)
    this.resetTimer(); // Para iniciar en 10
    this.timerSub = interval(1000).subscribe(() => {
      this.nextUpdateIn.update(v => v > 0 ? v - 1 : 10);
    });
  }

  private resetTimer() {
    this.nextUpdateIn.set(10);
  }

  private handleDataUpdate(prices: CryptoAsset[]) {
    // 1. Update local signal for UI rendering
    this.rawPrices.set(prices);

    // 2. Offload heavy calculations to Web Worker
    this.postMessageToWorker(prices);
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/crypto-processor.worker', import.meta.url));

      this.worker.onmessage = ({ data }: { data: WorkerResponse[] }) => {
        this.marketStats.set(data);
      };
    } else {
      console.warn('Web Workers are not supported in this environment.');
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

  // Helper to get stats for a specific asset from the signal 
  getStats(assetId: string): WorkerResponse | undefined {
    return this.marketStats().find(s => s.id === assetId);
  }

  // Performance optimization for @for loop
  trackByAssetId(index: number, item: CryptoAsset): string {
    return item.id;
  }
}
