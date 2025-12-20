import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (state.url.startsWith('/auth') && token) {
    router.navigate(['/dashboard']);
    return false;
  }

  if (!token && !state.url.startsWith('/auth')) {
    router.navigate(['/auth/login']);
    return false;
  }
  
  return true;
}; 