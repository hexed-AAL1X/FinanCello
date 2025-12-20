import { Routes } from '@angular/router';

export const movementRoutes: Routes = [
  {
    path: 'filter',
    loadComponent: () =>
      import('./pages/filterMovement/filter-movement.component').then(m => m.FilterFinancialMovementComponent)
  }
];
