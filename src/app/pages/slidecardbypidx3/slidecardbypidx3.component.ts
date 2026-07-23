import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, distinctUntilChanged, forkJoin, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PacketDetailX3 } from '../../models/packet-x3.model';
import { PrintedCard } from '../../models/printed-card.model';
import { BingoCardComponent, BingoCardSquareTap } from '../../shared/bingo-card/bingo-card.component';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';
import { PacketService } from '../../services/packet.service';
import { PlayerCallListService } from '../../services/player-calllist.service';
import { PlayerContextService } from '../../services/player-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';
import { parsePositiveIntInput } from '../../utils/numeric-input';

const CARDS_PER_INNING = 3;
const MAX_INNINGS = 3;
const PIDTX3_INPUT_MAX_LENGTH = 6;

interface SlidecardByPidX3State {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
  gameId: number | null;
  callListId: number | null;
}

@Component({
  selector: 'app-slidecardbypidx3',
  standalone: true,
  imports: [CommonModule, FormsModule, BingoCardComponent, TopBannerComponent],
  templateUrl: './slidecardbypidx3.component.html',
  styleUrl: './slidecardbypidx3.component.scss'
})
export class SlidecardByPidX3Component {
  readonly environment = environment;
  readonly cardsPerInning = CARDS_PER_INNING;
  readonly maxInnings = MAX_INNINGS;
  readonly pidtx3InputMaxLength = PIDTX3_INPUT_MAX_LENGTH;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly packetService = inject(PacketService);
  private readonly playerCallListService = inject(PlayerCallListService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly refreshIntervalMs = Math.max(environment.cardRefreshIntervalSeconds, 5) * 1000;

  readonly context = this.playerContextService.context;
  readonly pidtx3Input = signal<number | null>(null);
  readonly selectedInning = signal(1);
  readonly currentIndex = signal(0);
  readonly squareCheckMessage = signal<string | null>(null);
  private readonly markedByCard = signal<Map<number, ReadonlySet<number>>>(new Map());
  private readonly unverifiedByCard = signal<Map<number, ReadonlySet<number>>>(new Map());

  readonly routePidtx3 = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('pidtx3')),
      map(value => (value ? Number(value) : NaN)),
      map(value => (Number.isInteger(value) && value > 0 ? value : null)),
      distinctUntilChanged()
    ),
    { initialValue: null }
  );

  readonly displayPidtx3 = computed(() => this.routePidtx3() ?? this.pidtx3Input() ?? null);

  readonly state = toSignal(
    toObservable(this.routePidtx3).pipe(
      switchMap(pidtx3 => {
        if (pidtx3 === null) {
          return of({
            cards: [],
            loading: false,
            error: null,
            gameId: null,
            callListId: null
          } satisfies SlidecardByPidX3State);
        }

        this.pidtx3Input.set(pidtx3);
        this.currentIndex.set(0);
        this.clearSquareCheckState();

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.packetService.getPacketIdDetailsByPidtx3(pidtx3).pipe(
              switchMap(packet => {
                const master = packet.Master;
                const details = this.sortDetails(packet.PacketDetails);
                const gameId = master?.Game_ID ?? null;
                const callListId = master?.Call_List_ID ?? null;

                if (!master || details.length === 0 || gameId === null || callListId === null) {
                  return of({
                    cards: [],
                    loading: false,
                    error: `No X3 cards found for PIDTX3 ${pidtx3}.`,
                    gameId,
                    callListId
                  } satisfies SlidecardByPidX3State);
                }

                this.applyDefaultInning(details);

                const cardIds = [...new Set(details.map(detail => detail.Card_ID))];
                return this.loadPrintedCards(cardIds, details, callListId).pipe(
                  map(cards => {
                    this.persistPlayerContext(gameId, callListId, this.selectedInning());
                    return {
                      cards,
                      loading: false,
                      error: null,
                      gameId,
                      callListId
                    } satisfies SlidecardByPidX3State;
                  })
                );
              }),
              catchError(err => {
                console.error('Slide card by PID X3 load failed', err);
                return of({
                  cards: [],
                  loading: false,
                  error: this.formatLoadError(err, 'Unable to load X3 cards for this packet.'),
                  gameId: null,
                  callListId: null
                } satisfies SlidecardByPidX3State);
              })
            )
          ),
          startWith({
            cards: [],
            loading: true,
            error: null,
            gameId: null,
            callListId: null
          } satisfies SlidecardByPidX3State)
        );
      })
    ),
    { initialValue: { cards: [], loading: false, error: null, gameId: null, callListId: null } }
  );

  readonly allCards = computed(() => this.state().cards ?? []);

  readonly inningCards = computed(() => {
    const inning = this.selectedInning();
    return this.allCards().filter(card => card.Inning === inning);
  });

  readonly currentCard = computed(() => {
    const list = this.inningCards();
    if (list.length === 0) {
      return null;
    }
    const index = Math.min(this.currentIndex(), list.length - 1);
    return list[index] ?? null;
  });

  readonly canGoPrevious = computed(() => this.currentIndex() > 0);
  readonly canGoNext = computed(() => this.currentIndex() < this.inningCards().length - 1);
  readonly trackTransform = computed(() => `translateX(-${this.currentIndex() * 100}%)`);

  readonly availableInnings = computed(() => {
    const innings = [...new Set(this.allCards().map(card => card.Inning ?? 0))]
      .filter(inning => inning > 0)
      .sort((a, b) => a - b);
    return innings.length > 0 ? innings : Array.from({ length: MAX_INNINGS }, (_, index) => index + 1);
  });

  readonly displayGameId = computed(() => this.state().gameId ?? this.context()?.Game_ID ?? null);
  readonly displayCallListId = computed(() => this.state().callListId ?? this.context()?.Call_List_ID ?? null);

  constructor() {
    const ctx = this.playerContextService.getContext();
    if (ctx?.Inning) {
      this.selectedInning.set(ctx.Inning);
    }
  }

  onPidtx3Input(value: string | number): void {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, PIDTX3_INPUT_MAX_LENGTH);
    this.pidtx3Input.set(parsePositiveIntInput(digits));
  }

  loadEnteredPidtx3(): void {
    const pidtx3 = this.pidtx3Input();
    if (pidtx3 === null) {
      return;
    }

    this.clearSquareCheckState();
    void this.router.navigate(['/slidecardbypidx3', pidtx3]);
  }

  setInning(inning: number): void {
    if (!Number.isInteger(inning) || inning <= 0) {
      return;
    }

    this.selectedInning.set(inning);
    this.currentIndex.set(0);
    this.clearSquareCheckState();

    const gameId = this.displayGameId();
    const callListId = this.displayCallListId();
    if (gameId !== null && callListId !== null) {
      this.persistPlayerContext(gameId, callListId, inning);
    }
  }

  goPrevious(): void {
    if (this.canGoPrevious()) {
      this.currentIndex.update(index => index - 1);
    }
  }

  goNext(): void {
    if (this.canGoNext()) {
      this.currentIndex.update(index => index + 1);
    }
  }

  markedPositionsFor(cardId: number): ReadonlySet<number> {
    return this.markedByCard().get(cardId) ?? new Set<number>();
  }

  unverifiedPositionsFor(cardId: number): ReadonlySet<number> {
    return this.unverifiedByCard().get(cardId) ?? new Set<number>();
  }

  onSquareTap(event: BingoCardSquareTap, card: PrintedCard): void {
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
    const inning = this.selectedInning();
    if (gameId === null || callListId === null) {
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

  private sortDetails(details: PacketDetailX3[]): PacketDetailX3[] {
    return [...details].sort((left, right) => {
      if (left.Inning !== right.Inning) {
        return left.Inning - right.Inning;
      }
      return left.PDX3_ID - right.PDX3_ID;
    });
  }

  private applyDefaultInning(details: PacketDetailX3[]): void {
    const current = this.selectedInning();
    const innings = [...new Set(details.map(detail => detail.Inning))].sort((a, b) => a - b);
    if (innings.length > 0 && !innings.includes(current)) {
      this.selectedInning.set(innings[0]);
      this.currentIndex.set(0);
    }
  }

  private loadPrintedCards(cardIds: number[], details: PacketDetailX3[], callListId: number) {
    if (cardIds.length === 0) {
      return of([] as PrintedCard[]);
    }

    const detailByCardId = new Map<number, PacketDetailX3>(details.map(detail => [detail.Card_ID, detail]));

    return forkJoin(
      cardIds.map(cardId =>
        this.printedCardsService.getPrintedCardsByCardId(cardId).pipe(
          catchError(err => {
            console.error('Printed card load failed for Card_ID', cardId, err);
            return of([] as PrintedCard[]);
          }),
          map(cards => this.mergeCardMetadata(cards[0], detailByCardId.get(cardId), callListId))
        )
      )
    ).pipe(
      map(results => results.filter((card): card is PrintedCard => card !== null)),
      map(cards => {
        const allDetails = details;
        const byInning = new Map<number, PrintedCard[]>();
        for (const card of cards) {
          const inning = card.Inning ?? 1;
          const list = byInning.get(inning) ?? [];
          list.push(card);
          byInning.set(inning, list);
        }

        const ordered: PrintedCard[] = [];
        for (const inning of [...byInning.keys()].sort((a, b) => a - b)) {
          const inningCards = byInning.get(inning) ?? [];
          const orderedIds = allDetails
            .filter(detail => detail.Inning === inning)
            .map(detail => detail.Card_ID);
          ordered.push(
            ...orderedIds
              .map(cardId => inningCards.find(card => card.CardID === cardId))
              .filter((card): card is PrintedCard => card !== undefined)
          );
        }
        return ordered;
      })
    );
  }

  private mergeCardMetadata(
    card: PrintedCard | undefined,
    detail: PacketDetailX3 | undefined,
    callListId: number
  ): PrintedCard | null {
    if (!card) {
      return null;
    }

    return {
      ...card,
      Inning: detail?.Inning ?? card.Inning,
      CallListID: card.CallListID ?? callListId
    };
  }

  private persistPlayerContext(gameId: number, callListId: number, inning: number): void {
    this.playerContextService.updateGameAndCallList(gameId, callListId, inning);
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

  private formatLoadError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (typeof err.error === 'string' && err.error.trim()) {
        return err.error;
      }

      const message = this.asErrorMessage(err.error);
      if (message) {
        return message;
      }
    }
    return fallback;
  }

  private asErrorMessage(error: unknown): string | null {
    if (error === null || typeof error !== 'object') {
      return null;
    }

    const record = error as Record<string, unknown>;
    const message = record['Message'] ?? record['message'];
    return typeof message === 'string' && message.trim() ? message : null;
  }
}
