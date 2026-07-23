import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminService } from '../../services/admin.service';
import { AuthUserService } from '../../services/auth-user.service';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';

interface AdminNavLink {
  label: string;
  route: string;
  note?: string;
}

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, TopBannerComponent],
  templateUrl: './admin-nav.component.html',
  styleUrl: './admin-nav.component.scss'
})
export class AdminNavComponent {
  private readonly adminService = inject(AdminService);
  private readonly authUserService = inject(AuthUserService);

  readonly isAdmin = this.adminService.isAdmin;
  readonly user = this.authUserService.user;

  readonly links: AdminNavLink[] = [
    { label: 'Login', route: '/login' },
    { label: 'Game Setup', route: '/setup' },
    { label: 'My Cards', route: '/cards' },
    { label: 'Single Card', route: '/singlecard', note: 'Optional :cardId' },
    { label: 'Slide Card', route: '/slidecard' },
    { label: 'PID Cards', route: '/slidecardbypid', note: 'Optional :pid' },
    { label: 'PIDTX5 Cards', route: '/slidecardbypidx5', note: 'Optional :pidtx5' },
    { label: 'PIDTX3 Cards', route: '/slidecardbypidx3', note: 'Optional :pidtx3' },
    { label: 'Winner Card', route: '/winnercard' },
    {
      label: 'QR Landing',
      route: '/QR-Landing/0/0/0/1',
      note: 'Pattern: /QR-Landing/:userId/:gameId/:callListId/:inning'
    }
  ];
}
