import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { QrLandingContext } from '../../models/qr-landing-context.model';
import { AuthGuard } from '../../services/auth.guard';
import { PlayerContextService } from '../../services/player-context.service';
import { QrLandingContextService } from '../../services/qr-landing-context.service';

@Component({
  selector: 'app-qr-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './qr-landing.component.html',
  styleUrl: './qr-landing.component.scss'
})
export class QrLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly qrLandingContextService = inject(QrLandingContextService);
  private readonly playerContextService = inject(PlayerContextService);

  readonly error = signal<string | null>(null);
  readonly status = signal('Loading your game…');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.applyQrRoute(params.get('userId'), params.get('gameId'), params.get('callListId'), params.get('inning'), params.get('cardId'));
    });
  }

  private applyQrRoute(
    userIdRaw: string | null,
    gameIdRaw: string | null,
    callListIdRaw: string | null,
    inningRaw: string | null,
    cardIdRaw: string | null
  ): void {
    const userId = this.parsePositiveInt(userIdRaw);
    const gameId = this.parsePositiveInt(gameIdRaw);
    const callListId = this.parsePositiveInt(callListIdRaw);
    const inning = this.parsePositiveInt(inningRaw);
    const cardId = cardIdRaw ? this.parsePositiveInt(cardIdRaw) : null;

    if (userId === null || gameId === null || callListId === null || inning === null) {
      this.error.set('This QR link is missing or has invalid game information.');
      this.status.set('');
      return;
    }

    if (cardIdRaw && cardId === null) {
      this.error.set('This QR link has an invalid card number.');
      this.status.set('');
      return;
    }

    const qrContext: QrLandingContext = {
      User_ID: userId,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      Card_ID: cardId
    };

    this.qrLandingContextService.setContext(qrContext);
    this.playerContextService.setContext({
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning
    });

    const targetUrl = cardId !== null ? `/singlecard/${cardId}` : '/setup';
    this.status.set('Redirecting…');

    if (typeof window !== 'undefined' && window.localStorage.getItem('authToken')) {
      AuthGuard.login();
      void this.router.navigateByUrl(targetUrl);
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('postLoginRedirect', targetUrl);
    }

    void this.router.navigate(['/login']);
  }

  private parsePositiveInt(value: string | null): number | null {
    if (!value || value.trim().length === 0) {
      return null;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
