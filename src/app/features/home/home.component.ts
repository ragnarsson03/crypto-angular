import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <div class="content">
        <h1 class="main-title">SISTEMA DE MONITOREO REACTIVO DE CRIPTOACTIVOS</h1>
        
        <div class="welcome-card">
          <h2>Bienvenido Profesor Carlos Márquez 👋</h2>
          <div class="divider"></div>
          <p class="subtitle">Implementación Avanzada con Angular 19 Signals & Web Workers</p>
        </div>

        <div class="students-list">
          <h3>Equipo de Desarrollo:</h3>
          <ul>
            <li><strong>Frederick Durán:</strong> <br> V-30.346.056</li>
             <li><strong>Juan Echenique:</strong> <br> V-30.829.758</li>
             <li><strong>Juan Henríquez:</strong> <br> V-27.913.162</li>
            <li><strong>Jonathan Alvarado:</strong> <br> V-22.749.638</li>
           <li><strong>Yesmir Guzmán:</strong> <br> V-20.130.682</li>
            <li><strong>Miguel Eduardo:</strong> <br> V-6.914.378</li>
            
          </ul>
        </div>

        <div class="actions">
          <button class="btn-primary sim-btn" (click)="navigateTo('sim')">
            <span class="icon">⚡</span>
            <div class="text">
              <span class="label">Entrar a Modo Simulación</span>
              <span class="sub">Alta Frecuencia (200ms)</span>
            </div>
          </button>

          <button class="btn-primary real-btn" (click)="navigateTo('real')">
            <span class="icon">🌍</span>
            <div class="text">
              <span class="label">Entrar a Mercado Real</span>
              <span class="sub">Binance API Live Feed</span>
            </div>
          </button>
        </div>
      </div>
      
      <footer>
        <p>UNETI - PNF Informática | Febrero 2026</p>
      </footer>
    </div>
  `,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(private router: Router) { }

  navigateTo(mode: 'sim' | 'real') {
    this.router.navigate(['/dashboard'], { queryParams: { tab: mode } });
  }
}
