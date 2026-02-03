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
  styles: [`
    :host {
      display: block;
    }
    .card {
      background-color: #1e1e1e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.3s ease;
      color: #e0e0e0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .alert-border {
      border-color: #ff4444;
      box-shadow: 0 0 12px rgba(255, 68, 68, 0.4);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
    }
    h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .symbol {
      color: #888;
      font-size: 0.9rem;
      font-weight: normal;
    }
    .price-block {
      text-align: right;
    }
    .price {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .change {
      font-size: 0.8rem;
    }
    .change.up { color: #00e676; }
    .change.down { color: #ff1744; }

    .stats {
      margin-bottom: 16px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 0.9rem;
    }
    .label {
      color: #aaa;
    }
    .value {
      font-family: 'Courier New', monospace;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .actions label {
      font-size: 0.8rem;
      color: #888;
    }
    input {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 6px 10px;
      color: white;
      font-size: 0.9rem;
      outline: none;
    }
    input:focus {
      border-color: #4CAF50;
    }
  `],
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
