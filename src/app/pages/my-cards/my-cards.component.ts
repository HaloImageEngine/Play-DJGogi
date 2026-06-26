import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { BingoExistingCardDetail } from '../../models/player-game.model';
import { AuthUserService } from '../../services/auth-user.service';
import { PlayerCallListService } from '../../services/player-calllist.service';
import { PlayerContextService } from '../../services/player-context.service';
import { parsePositiveIntInput } from '../../utils/numeric-input';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';

@Component({
  selector: 'app-my-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBannerComponent],
  templateUrl: './my-cards.component.html',
  styleUrl: './my-cards.component.scss'
})
export class MyCardsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly authUserService = inject(AuthUserService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly playerCallListService = inject(PlayerCallListService);

  readonly currentUser = this.authUserService.user;
  readonly context = this.playerContextService.context;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cards = signal<BingoExistingCardDetail[]>([]);
  readonly manualCardId = signal<number | null>(null);

  readonly contextLabel = computed(() => {
    const ctx = this.context();
    if (!ctx) {
      return '';
    }
    return `Game ${ctx.Game_ID} · Call list ${ctx.Call_List_ID} · Inning ${ctx.Inning}`;
  });

  constructor() {
    this.loadCards();
  }

  loadCards(): void {
    const userId = this.currentUser()?.UserId;
    const ctx = this.context();

    if (!userId || !ctx) {
      this.loading.set(false);
      this.error.set('Game context is missing. Go to setup first.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.playerCallListService
      .getCardsForContext(userId, ctx)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Load cards failed', err);
          this.error.set('Unable to load your cards.');
          return of([] as BingoExistingCardDetail[]);
        })
      )
      .subscribe(cardList => {
        this.cards.set(cardList);
        this.loading.set(false);
      });
  }

  openCard(cardId: number): void {
    void this.router.navigate(['/singlecard', cardId]);
  }

  onManualCardIdInput(value: string | number): void {
    this.manualCardId.set(parsePositiveIntInput(value));
  }

  openManualCard(): void {
    const cardId = this.manualCardId();
    if (cardId === null || !Number.isInteger(cardId) || cardId <= 0) {
      this.error.set('Enter a valid card number.');
      return;
    }
    this.error.set(null);
    void this.router.navigate(['/singlecard', cardId]);
  }

  viewAllPrintedCards(): void {
    const ctx = this.context();
    if (!ctx) {
      return;
    }

    void this.router.navigate(['/slidecard']);
  }

  changeGame(): void {
    void this.router.navigate(['/setup']);
  }
}
