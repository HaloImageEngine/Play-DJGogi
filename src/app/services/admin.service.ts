import { computed, inject, Injectable } from '@angular/core';

import { AuthUserService } from './auth-user.service';

const ADMIN_USER_IDS = new Set([1019, 1038, 1039]);

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly authUserService = inject(AuthUserService);

  /** True when the signed-in user's ID is an admin (1019, 1038, or 1039). */
  readonly isAdmin = computed(() => {
    const userId = this.authUserService.user()?.UserId;
    return userId !== undefined && ADMIN_USER_IDS.has(userId);
  });
}
