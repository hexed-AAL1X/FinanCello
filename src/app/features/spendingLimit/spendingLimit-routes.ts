import { Routes } from '@angular/router';
import { SpendingLimitAlertComponent } from './pages/spendingLimitAlert/spending-limit-alert.component';

export const spendingLimitRoutes: Routes = [
  {
    path: 'alarm',
    component: SpendingLimitAlertComponent
  },
  {
    path: 'form',
    loadComponent: () =>
      import('./pages/setLimit/spending-limit-form.component')
        .then(m => m.SpendingLimitFormComponent)
  }
];
