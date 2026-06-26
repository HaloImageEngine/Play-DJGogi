import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { PlayerContextService } from './player-context.service';

@Injectable({ providedIn: 'root' })
export class PlayerContextGuard implements CanActivate {
  private readonly router = inject(Router);
  private readonly playerContextService = inject(PlayerContextService);

  canActivate(): boolean {
    if (this.playerContextService.hasCompleteContext()) {
      return true;
    }

    void this.router.navigate(['/setup']);
    return false;
  }
}
