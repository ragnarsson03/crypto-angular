import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', component: DashboardComponent }, // Esto obliga a cargar el dashboard al inicio
    { path: '**', redirectTo: '' }
];