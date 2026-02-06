import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CryptoCardComponent } from '../../shared/components/crypto-card/crypto-card.component';
import { DashboardFacade } from './dashboard.facade';
import { CryptoAsset } from '../../core/models/crypto.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CryptoCardComponent, RouterModule],
  template: `
    <div class="dashboard-container">
      <header>
        <div class="title-section">
          <button class="back-btn" (click)="facade.goBack()">
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
              [class.active]="facade.activeTab() === 'sim'" 
              (click)="facade.switchTab('sim')">
              Simulación (200ms)
            </button>
            <button 
              [class.active]="facade.activeTab() === 'real'" 
              (click)="facade.switchTab('real')">
              Mercado Real (API)
            </button>
          </div>
          
          @if (facade.activeTab() === 'real') {
            <div class="timer-badge">
              Próxima actualización en: {{ facade.nextUpdateIn() }}s
            </div>
          }
        </div>
      </header>

      <div class="search-container">
        <div class="search-box">
           <input 
             type="text" 
             placeholder="Buscar Criptomoneda"
             [value]="facade.searchTerm()"
             (input)="updateSearch($event)">
        </div>
      </div>

      <!-- Status Bar -->
      @if (facade.statusMessage()) {
        <div class="status-bar" [class.error]="facade.statusMessage().includes('Error') || facade.statusMessage().includes('Sin datos')">
           {{ facade.statusMessage() }}
        </div>
      }

      <div class="grid">
        @if (facade.filteredPrices().length > 0) {
          @for (asset of facade.filteredPrices(); track trackByAssetId($index, asset)) {
            <app-crypto-card 
              [asset]="asset" 
              [stats]="facade.getStats(asset.id)"
              (thresholdUpdate)="facade.updateThreshold(asset.id, $event)">
            </app-crypto-card>
          }
        } @else {
          <!-- Skeleton Loading State -->
          @for (item of facade.skeletonItems; track $index) {
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardFacade]
})
export class DashboardComponent implements OnInit {
  facade = inject(DashboardFacade);

  ngOnInit() {
    this.facade.init();
  }

  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.facade.updateSearch(input.value);
  }

  trackByAssetId(index: number, item: CryptoAsset): string {
    return item.id;
  }
}
