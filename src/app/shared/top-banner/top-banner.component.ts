import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthUserService } from '../../services/auth-user.service';
import { AdminService } from '../../services/admin.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-top-banner',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './top-banner.component.html',
  styleUrl: './top-banner.component.scss'
})
export class TopBannerComponent {
  private readonly authUserService = inject(AuthUserService);
  private readonly adminService = inject(AdminService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  readonly user = computed(() => this.authUserService.user());
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isGuest100User = computed(() => {
    const alias = this.user()?.UserAlias?.trim().toLowerCase() ?? '';
    return alias === 'guest100';
  });
  readonly showTopNav = computed(() => !this.isGuest100User());
  readonly isAdmin = this.adminService.isAdmin;

  onAuthAction(): void {
    if (this.isLoggedIn()) {
      this.loginService.logoff();
    }
    void this.router.navigate(['/login']);
  }
}

