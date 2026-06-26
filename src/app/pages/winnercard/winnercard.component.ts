import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PlayerContextService } from '../../services/player-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface WinnercardState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-winnercard',
  standalone: true,
  imports: [CommonModule, BingoCardComponent, TopBannerComponent],
  templateUrl: './winnercard.component.html',
  styleUrl: './winnercard.component.scss'
})
export class WinnercardComponent {
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;

  readonly state = toSignal(
    toObservable(this.context).pipe(
      switchMap(ctx => {
        if (!ctx) {
          return of({
            cards: [],
            loading: false,
            error: 'Game context is missing. Go to setup first.'
          } satisfies WinnercardState);
        }

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService
              .getPrintedCardsByGameId(ctx.Game_ID, {
                callListId: ctx.Call_List_ID,
                inning: ctx.Inning
              })
              .pipe(
                map(cards => cards.filter(card => card.CardIsWinner)),
                map(cards => ({ cards, loading: false, error: null } satisfies WinnercardState)),
                catchError(err => {
                  console.error('Winner card load failed', err);
                  return of({
                    cards: [],
                    loading: false,
                    error: this.formatLoadError(err, 'Unable to load winner card.')
                  } satisfies WinnercardState);
                })
              )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies WinnercardState)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null } }
  );

  readonly winnerCards = computed(() => this.state().cards ?? []);
  readonly winnerCard = computed(() => this.winnerCards()[0] ?? null);
  readonly displayGameId = computed(() => {
    const ctx = this.context();
    if (ctx?.Game_ID && ctx.Game_ID > 0) {
      return ctx.Game_ID;
    }
    return this.winnerCard()?.GameID ?? null;
  });
  readonly displayCallListId = computed(() => {
    const ctx = this.context();
    if (ctx?.Call_List_ID && ctx.Call_List_ID > 0) {
      return ctx.Call_List_ID;
    }
    const card = this.winnerCard();
    return card?.CallListID && card.CallListID > 0 ? card.CallListID : null;
  });
  readonly displayInning = computed(() => {
    const ctx = this.context();
    if (ctx?.Inning && ctx.Inning > 0) {
      return ctx.Inning;
    }
    const card = this.winnerCard();
    return card?.Inning && card.Inning > 0 ? card.Inning : null;
  });

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    return fallback;
  }
}

