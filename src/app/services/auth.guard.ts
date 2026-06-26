import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private static isLoggedOut = false;
  private readonly router = inject(Router);

  canActivate(_route: unknown, state: RouterStateSnapshot): boolean {
    if (AuthGuard.isLoggedOut) {
      localStorage.removeItem('authToken');
      localStorage.setItem('postLoginRedirect', state.url);
      void this.router.navigate(['/login']);
      return false;
    }

    if (localStorage.getItem('authToken')) {
      return true;
    }

    localStorage.setItem('postLoginRedirect', state.url);
    void this.router.navigate(['/login']);
    return false;
  }

  static login(): void {
    AuthGuard.isLoggedOut = false;
  }

  static logout(): void {
    AuthGuard.isLoggedOut = true;
    if (typeof window === 'undefined') {
      return;
    }

    for (const key of [
      'authToken',
      'bingo_player_auth_user_v1',
      'bingo_player_context_v1',
      'postLoginRedirect'
    ]) {
      window.localStorage.removeItem(key);
    }
  }
}
