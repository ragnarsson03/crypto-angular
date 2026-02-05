import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CryptoDataService } from '../../core/services/crypto-data.service';
import { CryptoAsset, WorkerData, WorkerResponse } from '../../core/models/crypto.model';
import { CryptoCardComponent } from '../../shared/components/crypto-card/crypto-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CryptoCardComponent, RouterModule],
  template: `
    <div class="dashboard-container">
      <header>
        <div class="title-section">
          <button class="back-btn" (click)="goBack()">
             ← Volver
          </button>
          <div class="title-text">
            <h1>Monitor de Criptomonedas <span class="live-indicator">EN VIVO</span></h1>
            <p>Análisis del mercado impulsado por Web Workers</p>
          </div>
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
            <!-- El método va en la clase, no en el template -->
          


          @if (activeTab() === 'real') {
            <div class="timer-badge">
              Próxima actualización en: {{ nextUpdateIn() }}s
            </div>
          }
        </div>
      </header>

      <!-- Input de Búsqueda (Movido aquí) -->
      <div class="search-container">
        <div class="search-box">
           <input 
             type="text" 
             placeholder="Buscar Criptomoneda"
             [value]="searchTerm()"
             (input)="updateSearch($event)">
        </div>
      </div>

      <!-- Status Bar -->
      @if (statusMessage()) {
        <div class="status-bar" [class.error]="statusMessage().includes('Error') || statusMessage().includes('Sin datos')">
           {{ statusMessage() }}
        </div>
      }

      <div class="grid">
        @if (filteredPrices().length > 0) {
          <!-- Data Loaded -->
          @for (asset of filteredPrices(); track trackByAssetId($index, asset)) {
            <app-crypto-card 
              [asset]="asset" 
              [stats]="getStats(asset.id)">
            </app-crypto-card>
          }
        } @else {
          <!-- Skeleton Loading State -->
          @for (item of skeletonItems; track $index) {
             <div class="skeleton-card">
               <div class="skeleton-header">
                 <div class="skeleton-title"></div>
                 <div class="skeleton-price"></div>
               </div>
               <div class="skeleton-graph"></div>
               <div class="skeleton-stats"></div>
             </div>
          }
        }
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private cryptoService = inject(CryptoDataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private priceSub?: Subscription;
  private timerSub?: Subscription;
  private worker: Worker | undefined;

  // Signals for state management
  readonly rawPrices = signal<CryptoAsset[]>([]);
  readonly marketStats = signal<WorkerResponse[]>([]);
  readonly statusMessage = signal<string>(''); // Nuevo Signal para la Barra de Estado

  // Tab State
  // Tab State - Inicializado síncronamente desde la URL para persistencia
  readonly activeTab = signal<'sim' | 'real'>(
    (this.route.snapshot.queryParamMap.get('tab') as 'sim' | 'real') || 'sim'
  );
  readonly nextUpdateIn = signal<number>(10);

  // Search Filter State (Comentado como pediste)
  readonly searchTerm = signal<string>(''); // Almacena el texto del buscador
  readonly skeletonItems = Array(5).fill(0); // 5 Skeleton cards

  // Computed Signal: Filtra rawPrices basado en searchTerm
  // Se actualiza automáticamente cuando cambia rawPrices O searchTerm
  readonly filteredPrices = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const prices = this.rawPrices();

    if (!term) return prices;

    return prices.filter(p =>
      p.id.toLowerCase().includes(term) ||
      p.symbol.toLowerCase().includes(term)
    );
  });

  constructor() {
    this.initWorker();
  }

  ngOnInit() {
    // Iniciar lógica basada en el tab ya cargado
    if (this.activeTab() === 'real') {
      this.statusMessage.set('⏳ Conectando con Binance API...');
      this.startRealMarket();
    } else {
      this.statusMessage.set('🔄 Iniciando motor de simulación...');
      this.startSimulation();
    }
  }

  ngOnDestroy() {
    this.cleanupSubscriptions();
    this.worker?.terminate();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  // --- Tab Switching Logic ---
  switchTab(mode: 'sim' | 'real') {
    if (this.activeTab() === mode) return;

    this.activeTab.set(mode);
    this.cleanupSubscriptions();
    this.rawPrices.set([]); // Limpiar vista momentáneamente

    if (mode === 'sim') {
      this.statusMessage.set('🔄 Iniciando motor de simulación...');
      this.startSimulation();
    } else {
      this.statusMessage.set('⏳ Sincronizando con Binance API (Proxy/Direct)...');
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
      next: (prices) => {
        this.statusMessage.set(''); // Ocultar al recibir datos
        this.handleDataUpdate(prices);
      },
      error: (err) => this.statusMessage.set('⚠️ Error en simulación')
    });
  }

  private startRealMarket() {
    // 1. Iniciar subscripción de datos (Hydration + Polling)
    this.priceSub = this.cryptoService.getRealPrices().subscribe({
      next: (prices) => {
        // Si recibimos un array vacío (error controlado), avisamos
        if (prices.length === 0) {
          this.statusMessage.set('⚠️ Sin datos: Verificando conexión...');
        } else {
          this.statusMessage.set(''); // Todo OK
          this.handleDataUpdate(prices);
        }
        this.resetTimer();
      },
      error: (err) => this.statusMessage.set('⚠️ Error Crítico de API')
    });

    // 2. Iniciar Timer visual
    this.resetTimer();
    this.timerSub = interval(1000).subscribe(() => {
      this.nextUpdateIn.update(v => v > 0 ? v - 1 : 5);
    });
  }

  private resetTimer() {
    this.nextUpdateIn.set(5);
  }

  private handleDataUpdate(prices: CryptoAsset[]) {
    // 1. Update local signal for UI rendering (Raw data source for computation)
    this.rawPrices.set(prices);

    // 2. Offload heavy calculations to Web Worker (Always send FULL dataset)
    this.postMessageToWorker(prices);
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/crypto-processor.worker', import.meta.url));

      this.worker.onmessage = ({ data }: { data: WorkerResponse[] }) => {
        // Sincronización: Actualizar signal de estadísticas cuando el Worker responde
        this.marketStats.set(data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker System Error:', error);
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

  // Estadísticas de un asset específico usando signal
  getStats(assetId: string): WorkerResponse | undefined {
    return this.marketStats().find(s => s.id === assetId);
  }

  // Input de Búsqueda
  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  // Optimización de rendimiento para el bucle @for
  trackByAssetId(index: number, item: CryptoAsset): string {
    return item.id;
  }
}
