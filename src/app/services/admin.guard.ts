import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminService } from './admin.service';

/** Allows access only for signed-in admin users. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (typeof window !== 'undefined' && !window.localStorage.getItem('authToken')) {
    window.localStorage.setItem('postLoginRedirect', state.url);
    void router.navigate(['/login']);
    return false;
  }

  if (adminService.isAdmin()) {
    return true;
  }

  void router.navigate(['/cards']);
  return false;
};
