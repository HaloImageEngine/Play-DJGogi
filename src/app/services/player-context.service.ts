import { Injectable, signal } from '@angular/core';

import { PlayerGameContext } from '../models/player-game.model';

@Injectable({ providedIn: 'root' })
export class PlayerContextService {
  private readonly storageKey = 'bingo_player_context_v1';
  private readonly contextSignal = signal<PlayerGameContext | null>(this.readStored());

  readonly context = this.contextSignal.asReadonly();

  getContext(): PlayerGameContext | null {
    return this.contextSignal();
  }

  setContext(context: PlayerGameContext): void {
    const normalized = this.normalize(context);
    if (!normalized) {
      return;
    }

    this.contextSignal.set(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, JSON.stringify(normalized));
    }
  }

  /** Updates stored game + call list from a PID lookup; keeps existing inning when set. */
  updateGameAndCallList(gameId: number, callListId: number, inning?: number): void {
    const normalizedGameId = this.asPositiveInt(gameId);
    const normalizedCallListId = this.asPositiveInt(callListId);
    if (normalizedGameId === null || normalizedCallListId === null) {
      return;
    }

    const normalizedInning = this.asPositiveInt(inning) ?? this.getContext()?.Inning ?? 1;

    this.setContext({
      Game_ID: normalizedGameId,
      Call_List_ID: normalizedCallListId,
      Inning: normalizedInning
    });
  }

  clear(): void {
    this.contextSignal.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  hasCompleteContext(): boolean {
    return this.contextSignal() !== null;
  }

  private readStored(): PlayerGameContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return this.normalize(JSON.parse(raw) as Partial<PlayerGameContext>);
    } catch {
      return null;
    }
  }

  private normalize(value: Partial<PlayerGameContext> | null): PlayerGameContext | null {
    if (!value) {
      return null;
    }

    const gameId = this.asPositiveInt(value.Game_ID);
    const callListId = this.asPositiveInt(value.Call_List_ID);
    const inning = this.asPositiveInt(value.Inning);

    if (gameId === null || callListId === null || inning === null) {
      return null;
    }

    return { Game_ID: gameId, Call_List_ID: callListId, Inning: inning };
  }

  private asPositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }
}
