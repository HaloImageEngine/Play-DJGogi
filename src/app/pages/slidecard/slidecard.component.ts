import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PlayerContextService } from '../../services/player-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface SlidecardState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-slidecard',
  standalone: true,
  imports: [CommonModule, BingoCardComponent, TopBannerComponent],
  templateUrl: './slidecard.component.html',
  styleUrl: './slidecard.component.scss'
})
export class SlidecardComponent {
  readonly environment = environment;

  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;
  readonly currentIndex = signal(0);

  readonly state = toSignal(
    toObservable(this.context).pipe(
      switchMap(ctx => {
        if (!ctx) {
          return of({
            cards: [],
            loading: false,
            error: 'Game context is missing. Go to setup first.'
          } satisfies SlidecardState);
        }

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService
              .getPrintedCardsByGameId(ctx.Game_ID, {
                callListId: ctx.Call_List_ID,
                inning: ctx.Inning
              })
              .pipe(
                map(cards => ({ cards, loading: false, error: null } satisfies SlidecardState)),
                catchError(err => {
                  console.error('Slide card load failed', err);
                  return of({
                    cards: [],
                    loading: false,
                    error: this.formatLoadError(err, 'Unable to load cards for this game.')
                  } satisfies SlidecardState);
                })
              )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies SlidecardState)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null } }
  );

  readonly cards = computed(() => this.state().cards ?? []);
  readonly currentCard = computed(() => {
    const list = this.cards();
    if (list.length === 0) {
      return null;
    }
    const index = Math.min(this.currentIndex(), list.length - 1);
    return list[index] ?? null;
  });
  readonly canGoPrevious = computed(() => this.currentIndex() > 0);
  readonly canGoNext = computed(() => this.currentIndex() < this.cards().length - 1);
  readonly cardsDisplayedCount = computed(() => (this.currentCard() ? 1 : 0));
  readonly displayGameId = computed(() => {
    const ctx = this.context();
    if (ctx?.Game_ID && ctx.Game_ID > 0) {
      return ctx.Game_ID;
    }
    return this.currentCard()?.GameID ?? null;
  });
  readonly displayCallListId = computed(() => {
    const ctx = this.context();
    if (ctx?.Call_List_ID && ctx.Call_List_ID > 0) {
      return ctx.Call_List_ID;
    }
    const card = this.currentCard();
    return card?.CallListID && card.CallListID > 0 ? card.CallListID : null;
  });
  readonly displayInning = computed(() => {
    const ctx = this.context();
    if (ctx?.Inning && ctx.Inning > 0) {
      return ctx.Inning;
    }
    const card = this.currentCard();
    return card?.Inning && card.Inning > 0 ? card.Inning : null;
  });

  goPrevious(): void {
    if (this.canGoPrevious()) {
      this.currentIndex.update(i => i - 1);
    }
  }

  goNext(): void {
    if (this.canGoNext()) {
      this.currentIndex.update(i => i + 1);
    }
  }

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    return fallback;
  }
}
