import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { LoginService } from './login.service';

/** Allows access when logged in; otherwise signs in as Guest100 / test100. */
export const slidecardByPidAuthGuard: CanActivateFn = () => {
  if (typeof window !== 'undefined' && window.localStorage.getItem('authToken')) {
    return true;
  }

  const loginService = inject(LoginService);
  const router = inject(Router);

  return loginService.ensureGuestLogin().pipe(
    map(ok => {
      if (!ok) {
        void router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};
