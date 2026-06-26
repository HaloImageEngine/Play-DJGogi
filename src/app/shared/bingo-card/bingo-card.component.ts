import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';

import { PrintedCard } from '../../models/printed-card.model';

export interface BingoCardSquareTap {
  position: number;
  songId: number | null;
  isFreeSpace: boolean;
}

@Component({
  selector: 'app-bingo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo-card.component.html',
  styleUrl: './bingo-card.component.scss'
})
export class BingoCardComponent {
  readonly card = input.required<PrintedCard>();
  /** Player game context (used when API returns 0 for call list / inning). */
  readonly callListId = input<number | null>(null);
  readonly inning = input<number | null>(null);
  /** When true, tapping a square toggles a pink player mark (single card view). */
  readonly interactive = input(false);
  /** When true, square taps emit to parent for called-number verification. */
  readonly verifyCalledOnTap = input(false);
  readonly markedPositions = input<ReadonlySet<number>>(new Set());
  readonly unverifiedPositions = input<ReadonlySet<number>>(new Set());
  readonly squareTap = output<BingoCardSquareTap>();

  private readonly playerMarkedPositions = signal<ReadonlySet<number>>(new Set());
  private readonly markedCardId = signal<number | null>(null);

  readonly displayCallListId = computed(() => {
    const fromInput = this.callListId();
    if (fromInput !== null && fromInput > 0) {
      return fromInput;
    }
    const fromCard = this.card().CallListID;
    return fromCard !== null && fromCard > 0 ? fromCard : null;
  });

  readonly displayInning = computed(() => {
    const fromInput = this.inning();
    if (fromInput !== null && fromInput > 0) {
      return fromInput;
    }
    const fromCard = this.card().Inning;
    return fromCard !== null && fromCard > 0 ? fromCard : null;
  });

  constructor() {
    effect(() => {
      const cardId = this.card().CardID;
      if (this.markedCardId() !== cardId) {
        this.markedCardId.set(cardId);
        this.playerMarkedPositions.set(new Set());
      }
    });
  }

  isSquareLit(square: { IsCalled: boolean; SquarePosition: number }): boolean {
    if (square.IsCalled) {
      return true;
    }

    if (this.verifyCalledOnTap()) {
      return this.markedPositions().has(square.SquarePosition);
    }

    return this.playerMarkedPositions().has(square.SquarePosition);
  }

  isSquareUnverified(position: number): boolean {
    return this.verifyCalledOnTap() && this.unverifiedPositions().has(position);
  }

  onSquareTap(position: number): void {
    if (!this.interactive()) {
      return;
    }

    const square = this.card().Squares.find(item => item.SquarePosition === position);
    if (!square) {
      return;
    }

    if (this.verifyCalledOnTap() && square.IsCalled) {
      return;
    }

    if (this.verifyCalledOnTap()) {
      this.squareTap.emit({
        position,
        songId: square.Song?.SongID ?? null,
        isFreeSpace: square.IsFreeSpace
      });
      return;
    }

    const next = new Set(this.playerMarkedPositions());
    if (next.has(position)) {
      next.delete(position);
    } else {
      next.add(position);
    }
    this.playerMarkedPositions.set(next);
  }
}
