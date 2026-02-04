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
      
      <div class="stats">
        <div class="stat-row">
          <span class="label">SMA:</span>
          <span class="value">{{ stats?.sma | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
        <div class="stat-row">
          <span class="label">Volatilidad:</span>
          <span class="value">{{ stats?.volatility | number:'1.2-5' }}</span>
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
  // NOTE: Styles moved to crypto-card.component.scss
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

  updateThreshold(event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.threshold.set(isNaN(val) ? 0 : val);
  }
}
