import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
        <h1>Crypto Live Monitor <span class="live-indicator">LIVE</span></h1>
        <p>Real-time market analysis powered by Web Workers</p>
      </header>

      <div class="grid">
        @for (asset of rawPrices(); track trackByAssetId($index, asset)) {
          <app-crypto-card 
            [asset]="asset" 
            [stats]="getStats(asset.id)">
          </app-crypto-card>
        } @empty {
          <div class="loading">Iniciando feed de precios...</div>
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
  private worker: Worker | undefined;

  // Signals for state management
  readonly rawPrices = signal<CryptoAsset[]>([]);
  readonly marketStats = signal<WorkerResponse[]>([]);

  constructor() {
    this.initWorker();
  }

  ngOnInit() {
    // Subscribe to service data
    this.priceSub = this.cryptoService.getRealTimePrices().subscribe({
      next: (prices) => {
        // 1. Update local signal for UI rendering
        this.rawPrices.set(prices);

        // 2. Offload heavy calculations to Web Worker
        this.postMessageToWorker(prices);
      },
      error: (err) => console.error('Error fetching prices:', err)
    });
  }

  ngOnDestroy() {
    this.priceSub?.unsubscribe();
    this.worker?.terminate();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      // Initialize the worker. Path relative to this file's compilation context.
      // Adjust "../../workers/..." to match the actual file structure.
      this.worker = new Worker(new URL('../../workers/crypto-processor.worker', import.meta.url));

      this.worker.onmessage = ({ data }: { data: WorkerResponse[] }) => {
        // Update stats signal when worker responds with array of stats
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
