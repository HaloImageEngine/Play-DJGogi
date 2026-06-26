import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent, BingoCardSquareTap } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PlayerCallListService } from '../../services/player-calllist.service';
import { PlayerContextService } from '../../services/player-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';
import { parsePositiveIntInput } from '../../utils/numeric-input';

interface SinglecardState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-singlecard',
  standalone: true,
  imports: [CommonModule, FormsModule, BingoCardComponent, TopBannerComponent],
  templateUrl: './singlecard.component.html',
  styleUrl: './singlecard.component.scss'
})
export class SinglecardComponent {
  readonly environment = environment;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly playerCallListService = inject(PlayerCallListService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;
  readonly cardIdInput = signal<number | null>(null);
  readonly markedPositions = signal<ReadonlySet<number>>(new Set());
  readonly unverifiedPositions = signal<ReadonlySet<number>>(new Set());
  readonly squareCheckMessage = signal<string | null>(null);

  private readonly routeCardId = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('cardId')),
      map(value => (value ? Number(value) : NaN)),
      map(value => (Number.isInteger(value) && value > 0 ? value : null)),
      distinctUntilChanged()
    ),
    { initialValue: null }
  );

  readonly state = toSignal(
    toObservable(this.routeCardId).pipe(
      switchMap(cardId => {
        if (cardId === null) {
          return of({ cards: [], loading: false, error: null } satisfies SinglecardState);
        }

        this.cardIdInput.set(cardId);

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService.getPrintedCardsByCardId(cardId).pipe(
              map(cards => ({ cards, loading: false, error: null } satisfies SinglecardState)),
              catchError(err => {
                console.error('Single card load failed', err);
                return of({
                  cards: [],
                  loading: false,
                  error: this.formatLoadError(err, 'Unable to load this card.')
                } satisfies SinglecardState);
              })
            )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies SinglecardState)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null } }
  );

  readonly currentCard = computed(() => this.state()?.cards?.[0] ?? null);
  readonly displayCardId = computed(() => this.routeCardId() ?? this.cardIdInput() ?? null);
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

  constructor() {
    effect(() => {
      const cardId = this.routeCardId();
      if (cardId === null) {
        return;
      }

      this.markedPositions.set(new Set());
      this.unverifiedPositions.set(new Set());
      this.squareCheckMessage.set(null);
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const id = this.routeCardId();
      if (id !== null) {
        this.cardIdInput.set(id);
      }
    });
  }

  onCardIdInput(value: string | number): void {
    this.cardIdInput.set(parsePositiveIntInput(value));
  }

  loadEnteredCard(): void {
    const cardId = this.cardIdInput();
    if (cardId === null || !Number.isInteger(cardId) || cardId <= 0) {
      return;
    }
    void this.router.navigate(['/singlecard', cardId]);
  }

  onSquareTap(event: BingoCardSquareTap): void {
    const marked = new Set(this.markedPositions());
    const unverified = new Set(this.unverifiedPositions());

    if (marked.has(event.position)) {
      marked.delete(event.position);
      unverified.delete(event.position);
      this.markedPositions.set(marked);
      this.unverifiedPositions.set(unverified);
      return;
    }

    if (event.isFreeSpace || event.songId === null) {
      marked.add(event.position);
      unverified.delete(event.position);
      this.markedPositions.set(marked);
      this.unverifiedPositions.set(unverified);
      return;
    }

    const gameId = this.displayGameId();
    const callListId = this.displayCallListId();
    const inning = this.displayInning();
    if (gameId === null || callListId === null || inning === null) {
      this.squareCheckMessage.set('Game info is missing. Go to setup first.');
      return;
    }

    this.playerCallListService
      .checkCalledNumber({
        Game_ID: gameId,
        Call_List_ID: callListId,
        Inning: inning,
        Song_ID: event.songId
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Check called number failed', err);
          return of({
            Game_ID: gameId,
            Call_List_ID: callListId,
            Inning: inning,
            Song_ID: event.songId,
            WasCalled: false
          });
        })
      )
      .subscribe(result => {
        const nextMarked = new Set(this.markedPositions());
        const nextUnverified = new Set(this.unverifiedPositions());

        if (result.WasCalled) {
          nextMarked.add(event.position);
          nextUnverified.delete(event.position);
          this.squareCheckMessage.set(null);
        } else {
          nextUnverified.add(event.position);
          nextMarked.delete(event.position);
          this.squareCheckMessage.set('Song may not have been called, wait for update');
        }

        this.markedPositions.set(nextMarked);
        this.unverifiedPositions.set(nextUnverified);
      });
  }

  dismissSquareCheckMessage(): void {
    this.squareCheckMessage.set(null);
  }

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    return fallback;
  }
}
