import { Routes } from '@angular/router';

import { AuthGuard } from './services/auth.guard';
import { slidecardByPidAuthGuard } from './services/slidecard-bypid-auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'cards' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'setup',
    loadComponent: () => import('./pages/game-setup/game-setup.component').then(m => m.GameSetupComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cards',
    loadComponent: () => import('./pages/my-cards/my-cards.component').then(m => m.MyCardsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'singlecard',
    loadComponent: () => import('./pages/singlecard/singlecard.component').then(m => m.SinglecardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'singlecard/:cardId',
    loadComponent: () => import('./pages/singlecard/singlecard.component').then(m => m.SinglecardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'slidecard',
    loadComponent: () => import('./pages/slidecard/slidecard.component').then(m => m.SlidecardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'slidecardbypid',
    loadComponent: () =>
      import('./pages/slidecardbypid/slidecardbypid.component').then(m => m.SlidecardByPidComponent),
    canActivate: [slidecardByPidAuthGuard]
  },
  {
    path: 'slidecardbypid/:pid',
    loadComponent: () =>
      import('./pages/slidecardbypid/slidecardbypid.component').then(m => m.SlidecardByPidComponent),
    canActivate: [slidecardByPidAuthGuard]
  },
  {
    path: 'slidecardbypidx5',
    loadComponent: () =>
      import('./pages/slidecardbypidx5/slidecardbypidx5.component').then(m => m.SlidecardByPidX5Component),
    canActivate: [slidecardByPidAuthGuard]
  },
  {
    path: 'slidecardbypidx5/:pidtx5',
    loadComponent: () =>
      import('./pages/slidecardbypidx5/slidecardbypidx5.component').then(m => m.SlidecardByPidX5Component),
    canActivate: [slidecardByPidAuthGuard]
  },
  {
    path: 'winnercard',
    loadComponent: () => import('./pages/winnercard/winnercard.component').then(m => m.WinnercardComponent),
    canActivate: [AuthGuard]
  },
  { path: 'card', pathMatch: 'full', redirectTo: 'slidecard' },
  { path: 'card/:cardId', pathMatch: 'full', redirectTo: 'singlecard/:cardId' },
  {
    path: 'QR-Landing/:userId/:gameId/:callListId/:inning/:cardId',
    loadComponent: () => import('./pages/qr-landing/qr-landing.component').then(m => m.QrLandingComponent)
  },
  {
    path: 'QR-Landing/:userId/:gameId/:callListId/:inning',
    loadComponent: () => import('./pages/qr-landing/qr-landing.component').then(m => m.QrLandingComponent)
  },
  { path: '**', redirectTo: 'cards' }
];
