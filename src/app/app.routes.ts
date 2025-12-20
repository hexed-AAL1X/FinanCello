import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { spendingLimitRoutes } from './features/spendingLimit/spendingLimit-routes';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/landing/landing-page/landing-page.component').then(
            (m) => m.LandingPageComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/landing/landing-page/landing-page.component').then(
            (m) => m.LandingPageComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
        pathMatch: 'full',
      },
      {
        path: 'finances',
        loadComponent: () =>
          import('./features/finances/finances.component').then((m) => m.FinancesComponent),
        children: [
          {
            path: 'addmovement',
            loadComponent: () =>
              import('./features/finances/addMovement/addmovement.component').then(
                (m) => m.AddMovementComponent,
              ),
          },
        ],
      },
      {
        path: 'load-files',
        loadComponent: () =>
          import('./features/movements/pages/movement-upload/movement-upload.component').then(
            (m) => m.MovementUploadComponent,
          ),
      },
      {
        path: 'savinggoals',
        loadComponent: () =>
          import('./features/savinggoals/pages/savinggoal-list/savinggoal-list.component').then(
            (m) => m.SavingGoalListComponent,
          ),
        children: [
          {
            path: 'new',
            loadComponent: () =>
              import('./features/savinggoals/pages/savinggoal-form/savinggoal-form.component').then(
                (m) => m.SavingGoalFormComponent,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./features/savinggoals/pages/savinggoal-form/savinggoal-form.component').then(
                (m) => m.SavingGoalFormComponent,
              ),
          },
        ],
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/pages/category.component').then((m) => m.CategoryComponent),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactionshistory/transaction.history.component').then(
            (m) => m.TransactionHistoryComponent,
          ),
      },
      {
        path: 'logros',
        loadComponent: () =>
          import('./features/achievements/achievements.component').then((m) => m.AchievementsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'profile/edit',
        loadComponent: () =>
          import('./features/profile/edit/editprofile.component').then((m) => m.EditProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
        children: [
          {
            path: 'categories',
            loadComponent: () =>
              import('./features/categories/pages/category-form/category-form.component').then(
                (m) => m.CategoryFormComponent,
              ),
          },
          {
            path: 'spending-limit',
            children: [{ path: '', pathMatch: 'full', redirectTo: 'form' }, ...spendingLimitRoutes],
          },
        ],
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/dashboard/admin/dashboardAdmin.Component').then(
            (m) => m.DashboardAdminComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];