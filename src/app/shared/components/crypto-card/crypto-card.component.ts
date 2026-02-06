import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CryptoAsset, WorkerResponse } from '../../../core/models/crypto.model';
import { HighlightChangeDirective } from '../../directives/highlight-change.directive';

@Component({
  selector: 'app-crypto-card',
  standalone: true,
  imports: [CommonModule, HighlightChangeDirective],
  template: `
    <div class="card" [ngClass]="{'alert-pulse': stats?.isAlertActive}">
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

      <!-- Sección de Alerta (Con signo $ y comas) -->
      <div class="alert-section">
        <div class="alert-header">
            <label>Alerta (Umbral en USD)</label>
            <span class="orders-count">
              Órdenes activas: {{ activeOrdersCount() }}
            </span>
        </div>
        
        <div class="input-group">
          <!-- Input wrapper -->
          <div class="input-wrapper">
            <span *ngIf="displayValue()" class="currency-symbol">$</span>

            <input 
              #thresholdInput
              type="text"
              [value]="displayValue()"
              placeholder="Min Precio (ej: 50,000)"
              (input)="onInput(thresholdInput)"
              (keyup.enter)="onConfirm(thresholdInput.value)"
              (blur)="onConfirm(thresholdInput.value)"
              [class.has-value]="displayValue()"
              [class.is-armed]="isArmed()"
            />
          </div>

          <!-- Button -->
          <button 
            (click)="commitThresholdFromButton()"
            [disabled]="!displayValue() || isArmed()"
            [class.active]="displayValue() && !isArmed()"
            [title]="isArmed() ? 'Alerta Activa' : 'Activar Alerta'">
            
            <!-- Icon: Bell check (Active) -->
            <svg *ngIf="isArmed()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>

            <!-- Icon: Bell (Inactive) -->
            <svg *ngIf="!isArmed()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./crypto-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CryptoCardComponent implements OnInit {
  @Input({ required: true }) asset!: CryptoAsset;
  @Input() stats: WorkerResponse | undefined;
  @Output() thresholdUpdate = new EventEmitter<number>();

  // Internal state for input editing (keeps raw string)
  private internalValue = signal<string>('');

  // Confirmed threshold (numeric)
  readonly confirmedThreshold = signal<number>(0);

  // Visual state
  readonly isArmed = signal<boolean>(false);

  // Active orders counter
  readonly activeOrdersCount = signal<number>(0);

  // Computed signal for display formatting
  readonly displayValue = computed(() => {
    const raw = this.internalValue();
    if (!raw) return '';

    // Quitamos $ y comas para formatear limpiamente
    const numericPart = raw.replace(/[$,]/g, '');
    if (isNaN(Number(numericPart))) return raw;

    const parts = numericPart.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
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

  ngOnInit() {
    if (this.asset.threshold && this.asset.threshold > 0) {
      this.confirmedThreshold.set(this.asset.threshold);
      this.internalValue.set(this.asset.threshold.toString());
      this.isArmed.set(true); // Restaurar estado visual
    }
  }

  onInput(input: HTMLInputElement) {
    // Limpiamos la entrada de cualquier cosa que no sea número o decimal
    const cursorContent = input.value.replace(/[^0-9.]/g, '');
    this.internalValue.set(cursorContent);
    this.isArmed.set(false); // Desarmar si se edita
  }

  onConfirm(value: string) {
    const cleanValue = value.replace(/[$,]/g, '');
    const numericValue = parseFloat(cleanValue);

    if (isNaN(numericValue)) {
      if (value === '' || value === '$') {
        this.confirmedThreshold.set(0);
        this.internalValue.set('');
        this.thresholdUpdate.emit(0);
        this.isArmed.set(false);
      }
      return;
    }

    // Permitir reconfirmar el mismo valor para volver a armar visualmente
    this.confirmedThreshold.set(numericValue);
    this.thresholdUpdate.emit(numericValue);

    if (numericValue > 0) {
      this.triggerSuccessFeedback();
    }
  }

  commitThresholdFromButton() {
    this.onConfirm(this.internalValue());
  }

  private triggerSuccessFeedback() {
    this.isArmed.set(true);
    // Increment active orders count
    this.activeOrdersCount.update(c => c + 1);
  }
}
