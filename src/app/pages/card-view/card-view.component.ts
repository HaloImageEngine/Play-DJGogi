import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, timer } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PlayerContextService } from '../../services/player-context.service';
import { parsePositiveIntInput } from '../../utils/numeric-input';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface CardViewState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-card-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BingoCardComponent, TopBannerComponent],
  templateUrl: './card-view.component.html',
  styleUrl: './card-view.component.scss'
})
export class CardViewComponent {
  readonly environment = environment;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly playerContextService = inject(PlayerContextService);

  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;
  readonly cardIdInput = signal<number | null>(null);
  readonly currentIndex = signal(0);

  private readonly loadKey = toSignal(
    this.route.paramMap.pipe(
      map(params => {
        const cardIdParam = params.get('cardId');
        const query = this.route.snapshot.queryParamMap;
        const mode = query.get('mode');

        if (mode === 'game') {
          const gameId = Number(query.get('gameId'));
          const callListId = Number(query.get('callListId'));
          const inning = Number(query.get('inning'));
          return {
            kind: 'game' as const,
            gameId,
            callListId,
            inning
          };
        }

        const cardId = cardIdParam ? Number(cardIdParam) : NaN;
        return {
          kind: 'card' as const,
          cardId: Number.isInteger(cardId) && cardId > 0 ? cardId : null
        };
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ),
    { initialValue: { kind: 'card' as const, cardId: null } }
  );

  readonly state = toSignal(
    toObservable(this.loadKey).pipe(
      switchMap(key => {
        if (key.kind === 'game') {
          if (!Number.isFinite(key.gameId) || key.gameId <= 0) {
            return of({
              cards: [],
              loading: false,
              error: 'Invalid game parameters.'
            } satisfies CardViewState);
          }

          return timer(0, this.refreshIntervalMs).pipe(
            switchMap(() =>
              this.printedCardsService
                .getPrintedCardsByGameId(key.gameId, {
                  callListId: key.callListId,
                  inning: key.inning
                })
                .pipe(
                  map(cards => ({ cards, loading: false, error: null } satisfies CardViewState)),
                  catchError(err => {
                    console.error('Game cards load failed', err);
                    return of({
                      cards: [],
                      loading: false,
                      error: this.formatLoadError(err, 'Unable to load cards for this game.')
                    } satisfies CardViewState);
                  })
                )
            ),
            startWith({ cards: [], loading: true, error: null } satisfies CardViewState)
          );
        }

        if (key.cardId === null) {
          return of({ cards: [], loading: false, error: null } satisfies CardViewState);
        }

        this.cardIdInput.set(key.cardId);

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService.getPrintedCardsByCardId(key.cardId!).pipe(
              map(cards => ({ cards, loading: false, error: null } satisfies CardViewState)),
              catchError(err => {
                console.error('Card load failed', err);
                return of({
                  cards: [],
                  loading: false,
                  error: this.formatLoadError(err, 'Unable to load this card.')
                } satisfies CardViewState);
              })
            )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies CardViewState)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null } }
  );

  readonly isMultiCard = computed(() => this.loadKey()?.kind === 'game');
  readonly cards = computed(() => this.state()?.cards ?? []);
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

  readonly displayCardId = computed(() => {
    const key = this.loadKey();
    if (key?.kind === 'card' && key.cardId !== null) {
      return key.cardId;
    }
    const input = this.cardIdInput();
    if (input !== null && input > 0) {
      return input;
    }
    return this.currentCard()?.CardID ?? null;
  });

  readonly cardsDisplayedCount = computed(() => (this.currentCard() ? 1 : 0));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.currentIndex.set(0);
    });
  }

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

  onCardIdInput(value: string | number): void {
    this.cardIdInput.set(parsePositiveIntInput(value));
  }

  loadEnteredCard(): void {
    const cardId = this.cardIdInput();
    if (cardId === null || !Number.isInteger(cardId) || cardId <= 0) {
      return;
    }
    void this.router.navigate(['/card', cardId]);
  }

  backToList(): void {
    void this.router.navigate(['/cards']);
  }

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    return fallback;
  }
}
