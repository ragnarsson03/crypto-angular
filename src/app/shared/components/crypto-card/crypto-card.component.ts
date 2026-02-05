import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CryptoAsset, WorkerResponse } from '../../../core/models/crypto.model';
import { HighlightChangeDirective } from '../../directives/highlight-change.directive';

@Component({
  selector: 'app-crypto-card',
  standalone: true,
  imports: [CommonModule, HighlightChangeDirective],
  template: `
    <div class="card" [ngClass]="{'alert-border': isAlertActive()}">
      <div class="header">
        <h3>{{ asset.id | titlecase }} <span class="symbol">({{ asset.symbol }})</span></h3>
        <div class="price-block">
          <span class="price" [appHighlightChange]="asset.price">
            {{ asset.price | currency:'USD':'symbol':'1.2-2' }}
          </span>
          <span class="change" [ngClass]="{'up': asset.changePercent > 0, 'down': asset.changePercent < 0}">
            {{ asset.changePercent | number:'1.2-2' }}%
          </span>
        </div>
      </div>
      
      <!-- Sparkline Graph -->
      <div class="sparkline-container">
         <svg *ngIf="asset.history.length > 1" viewBox="0 0 100 50" preserveAspectRatio="none">
           <defs>
             <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
               <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
           </defs>
           
           <polyline 
             [attr.points]="sparklinePoints()" 
             fill="none" 
             [attr.stroke]="asset.changePercent >= 0 ? '#00e676' : '#ff1744'" 
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round"
             vector-effect="non-scaling-stroke"
             filter="url(#glow)"
           />
         </svg>
         <!-- Empty/Loading State Line -->
         <svg *ngIf="asset.history.length <= 1" viewBox="0 0 100 50" preserveAspectRatio="none">
            <line x1="0" y1="25" x2="100" y2="25" stroke="#444" stroke-width="1" stroke-dasharray="4"/>
         </svg>
      </div>

      <div class="stats">
        <div class="stat-row">
          <span class="label">Vol (24h):</span>
          <span class="value">{{ asset.volume | currency:'USD':'symbol':'1.0-0' }}</span>
        </div>
        <div class="stat-row">
          <span class="label">SMA:</span>
          <span class="value">{{ stats?.sma | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
        <div class="stat-row">
          <span class="label">Volatilidad:</span>
          <span class="value">{{ stats?.volatility | number:'1.2-4' }}</span>
        </div>
      </div>

      <div class="actions">
        <label>Alerta (Umbral):</label>
        <input 
          type="number" 
          [value]="threshold()" 
          (input)="updateThreshold($event)" 
          placeholder="Min Precio">
      </div>
    </div>
  `,
  styleUrls: ['./crypto-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CryptoCardComponent {
  @Input({ required: true }) asset!: CryptoAsset;
  @Input() stats: WorkerResponse | undefined;

  readonly threshold = signal<number>(0);

  // Computed signal: Active if threshold is set (>0) AND price drops below it
  readonly isAlertActive = computed(() => {
    const t = this.threshold();
    return t > 0 && this.asset.price < t;
  });

  // Computed signal: Transform history numbers -> SVG coordinate string "x,y x,y..."
  readonly sparklinePoints = computed(() => {
    const history = this.asset.history;
    if (!history || history.length < 2) return '';

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1; // Avoid division by zero

    // Map time (index) to X (0-100) and price to Y (50-0) (SVG Y is inverted)
    return history.map((price, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 50 - ((price - min) / range) * 50;
      return `${x},${y}`;
    }).join(' ');
  });

  updateThreshold(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.threshold.set(isNaN(val) ? 0 : val);
  }
}
