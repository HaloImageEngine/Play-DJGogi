import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BingoExistingCardDetail, BingoExistingCardsByPid } from '../../models/player-game.model';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent, BingoCardSquareTap } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PlayerCallListService } from '../../services/player-calllist.service';
import { PlayerContextService } from '../../services/player-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';
import { parsePositiveIntInput } from '../../utils/numeric-input';

interface SlidecardByPidState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
  callListId: number | null;
}

@Component({
  selector: 'app-slidecardbypid',
  standalone: true,
  imports: [CommonModule, FormsModule, BingoCardComponent, TopBannerComponent],
  templateUrl: './slidecardbypid.component.html',
  styleUrl: './slidecardbypid.component.scss'
})
export class SlidecardByPidComponent {
  readonly environment = environment;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playerCallListService = inject(PlayerCallListService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;
  readonly pidInput = signal<number | null>(null);
  readonly currentIndex = signal(0);
  readonly squareCheckMessage = signal<string | null>(null);
  private readonly markedByCard = signal<Map<number, ReadonlySet<number>>>(new Map());
  private readonly unverifiedByCard = signal<Map<number, ReadonlySet<number>>>(new Map());

  readonly routePid = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('pid')),
      map(value => (value ? Number(value) : NaN)),
      map(value => (Number.isInteger(value) && value > 0 ? value : null)),
      distinctUntilChanged()
    ),
    { initialValue: null }
  );

  readonly displayPid = computed(() => this.routePid() ?? this.pidInput() ?? null);

  readonly state = toSignal(
    toObservable(this.routePid).pipe(
      switchMap(pid => {
        if (pid === null) {
          return of({
            cards: [],
            loading: false,
            error: null,
            callListId: null
          } satisfies SlidecardByPidState);
        }

        this.pidInput.set(pid);
        this.currentIndex.set(0);
        this.clearSquareCheckState();

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.playerCallListService.getExistingCardsByPid(pid).pipe(
              switchMap(existing =>
                this.loadPrintedCards(this.sortCardDetailsByInning(existing.CardDetails)).pipe(
                  map(cards => {
                    const sortedCards = this.sortCardsByInning(cards);
                    this.persistPlayerContext(existing, sortedCards);
                    return {
                      cards: sortedCards,
                      loading: false,
                      error: null,
                      callListId: existing.Summary.Call_List_ID
                    } satisfies SlidecardByPidState;
                  })
                )
              ),
              catchError(err => {
                console.error('Slide card by PID load failed', err);
                return of({
                  cards: [],
                  loading: false,
                  error: this.formatLoadError(err, 'Unable to load cards for this player.'),
                  callListId: null
                } satisfies SlidecardByPidState);
              })
            )
          ),
          startWith({
            cards: [],
            loading: true,
            error: null,
            callListId: null
          } satisfies SlidecardByPidState)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null, callListId: null } }
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
  readonly markedPositions = computed(() => {
    const card = this.currentCard();
    if (!card) {
      return new Set<number>();
    }
    return this.markedByCard().get(card.CardID) ?? new Set<number>();
  });
  readonly unverifiedPositions = computed(() => {
    const card = this.currentCard();
    if (!card) {
      return new Set<number>();
    }
    return this.unverifiedByCard().get(card.CardID) ?? new Set<number>();
  });
  readonly displayGameId = computed(() => {
    const ctx = this.context();
    if (ctx?.Game_ID && ctx.Game_ID > 0) {
      return ctx.Game_ID;
    }
    return this.currentCard()?.GameID ?? null;
  });
  readonly displayCallListId = computed(() => {
    const summaryClid = this.state().callListId;
    if (summaryClid && summaryClid > 0) {
      return summaryClid;
    }
    const card = this.currentCard();
    return card?.CallListID && card.CallListID > 0 ? card.CallListID : null;
  });
  readonly displayInning = computed(() => {
    const card = this.currentCard();
    return card?.Inning && card.Inning > 0 ? card.Inning : null;
  });

  onPidInput(value: string | number): void {
    this.pidInput.set(parsePositiveIntInput(value));
  }

  loadEnteredPid(): void {
    const pid = this.pidInput();
    if (pid === null || !Number.isInteger(pid) || pid <= 0) {
      return;
    }
    void this.router.navigate(['/slidecardbypid', pid]);
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

  onSquareTap(event: BingoCardSquareTap): void {
    const card = this.currentCard();
    if (!card) {
      return;
    }

    const cardSets = this.getCardSets(card.CardID);

    if (cardSets.marked.has(event.position)) {
      cardSets.marked.delete(event.position);
      cardSets.unverified.delete(event.position);
      this.updateCardSets(card.CardID, cardSets.marked, cardSets.unverified);
      return;
    }

    if (event.isFreeSpace || event.songId === null) {
      cardSets.marked.add(event.position);
      cardSets.unverified.delete(event.position);
      this.updateCardSets(card.CardID, cardSets.marked, cardSets.unverified);
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
        const nextSets = this.getCardSets(card.CardID);

        if (result.WasCalled) {
          nextSets.marked.add(event.position);
          nextSets.unverified.delete(event.position);
          this.squareCheckMessage.set(null);
        } else {
          nextSets.unverified.add(event.position);
          nextSets.marked.delete(event.position);
          this.squareCheckMessage.set('Song may not have been called, wait for update');
        }

        this.updateCardSets(card.CardID, nextSets.marked, nextSets.unverified);
      });
  }

  dismissSquareCheckMessage(): void {
    this.squareCheckMessage.set(null);
  }

  private clearSquareCheckState(): void {
    this.markedByCard.set(new Map());
    this.unverifiedByCard.set(new Map());
    this.squareCheckMessage.set(null);
  }

  private getCardSets(cardId: number): { marked: Set<number>; unverified: Set<number> } {
    return {
      marked: new Set(this.markedByCard().get(cardId) ?? []),
      unverified: new Set(this.unverifiedByCard().get(cardId) ?? [])
    };
  }

  private updateCardSets(cardId: number, marked: Set<number>, unverified: Set<number>): void {
    const nextMarked = new Map(this.markedByCard());
    const nextUnverified = new Map(this.unverifiedByCard());
    nextMarked.set(cardId, marked);
    nextUnverified.set(cardId, unverified);
    this.markedByCard.set(nextMarked);
    this.unverifiedByCard.set(nextUnverified);
  }

  private persistPlayerContext(existing: BingoExistingCardsByPid, cards: PrintedCard[]): void {
    const gameId = this.resolveGameId(existing, cards);
    const callListId = this.resolveCallListId(existing, cards);
    if (gameId === null || callListId === null) {
      return;
    }

    const inning =
      this.pickPositiveInt(
        cards[0]?.Inning,
        existing.InningList[0],
        existing.CardDetails[0]?.Inning,
        this.playerContextService.getContext()?.Inning
      ) ?? 1;

    this.playerContextService.updateGameAndCallList(gameId, callListId, inning);
  }

  private resolveGameId(existing: BingoExistingCardsByPid, cards: PrintedCard[]): number | null {
    const fromCardDetail = existing.CardDetails.find(detail => detail.Game_ID && detail.Game_ID > 0)?.Game_ID;
    const fromPrinted = cards.find(card => card.GameID > 0)?.GameID;
    return this.pickPositiveInt(existing.Summary.Game_ID, fromCardDetail, fromPrinted);
  }

  private resolveCallListId(existing: BingoExistingCardsByPid, cards: PrintedCard[]): number | null {
    const fromCardDetail = existing.CardDetails.find(detail => detail.Call_List_ID > 0)?.Call_List_ID;
    const fromPrinted = cards.find(card => card.CallListID && card.CallListID > 0)?.CallListID;
    return this.pickPositiveInt(existing.Summary.Call_List_ID, fromCardDetail, fromPrinted);
  }

  private loadPrintedCards(cardDetails: BingoExistingCardDetail[]): ReturnType<PrintedCardsService['getPrintedCardsByCardId']> {
    if (cardDetails.length === 0) {
      return of([]);
    }

    return forkJoin(
      cardDetails.map(detail =>
        this.printedCardsService.getPrintedCardsByCardId(detail.Card_ID).pipe(
          catchError(err => {
            console.error('Printed card load failed for Card_ID', detail.Card_ID, err);
            return of([] as PrintedCard[]);
          }),
          map(printed => this.mergeCardMetadata(printed[0], detail))
        )
      )
    ).pipe(
      map(results => results.filter((card): card is PrintedCard => card !== null))
    );
  }

  /** Prefer inning / call list from printed-card API when present; fall back to ByPID card detail. */
  private mergeCardMetadata(
    card: PrintedCard | undefined,
    detail: BingoExistingCardDetail
  ): PrintedCard | null {
    if (!card) {
      return null;
    }

    const inning = this.pickPositiveInt(card.Inning, detail.Inning);
    const callListId = this.pickPositiveInt(card.CallListID, detail.Call_List_ID);

    if (inning === card.Inning && callListId === card.CallListID) {
      return card;
    }

    return {
      ...card,
      Inning: inning,
      CallListID: callListId
    };
  }

  private pickPositiveInt(...values: (number | null | undefined)[]): number | null {
    for (const value of values) {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return value;
      }
    }
    return null;
  }

  private sortCardDetailsByInning(cardDetails: BingoExistingCardDetail[]): BingoExistingCardDetail[] {
    return [...cardDetails].sort((left, right) => {
      const inningDiff = left.Inning - right.Inning;
      return inningDiff !== 0 ? inningDiff : left.Card_ID - right.Card_ID;
    });
  }

  private sortCardsByInning(cards: PrintedCard[]): PrintedCard[] {
    return [...cards].sort((left, right) => {
      const leftInning = left.Inning ?? Number.MAX_SAFE_INTEGER;
      const rightInning = right.Inning ?? Number.MAX_SAFE_INTEGER;
      const inningDiff = leftInning - rightInning;
      return inningDiff !== 0 ? inningDiff : left.CardID - right.CardID;
    });
  }

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && typeof err.error === 'string' && err.error.trim()) {
      return err.error;
    }
    return fallback;
  }
}
