import { Injectable, signal } from '@angular/core';

import { QrLandingContext } from '../models/qr-landing-context.model';

@Injectable({ providedIn: 'root' })
export class QrLandingContextService {
  private readonly storageKey = 'bingo_qr_landing_v1';
  private readonly contextSignal = signal<QrLandingContext | null>(this.readStored());

  readonly context = this.contextSignal.asReadonly();

  getContext(): QrLandingContext | null {
    return this.contextSignal();
  }

  setContext(context: QrLandingContext): void {
    const normalized = this.normalize(context);
    if (!normalized) {
      return;
    }

    this.contextSignal.set(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, JSON.stringify(normalized));
    }
  }

  clear(): void {
    this.contextSignal.set(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private readStored(): QrLandingContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return this.normalize(JSON.parse(raw) as Partial<QrLandingContext>);
    } catch {
      return null;
    }
  }

  private normalize(value: Partial<QrLandingContext> | null): QrLandingContext | null {
    if (!value) {
      return null;
    }

    const userId = this.asPositiveInt(value.User_ID);
    const gameId = this.asPositiveInt(value.Game_ID);
    const callListId = this.asPositiveInt(value.Call_List_ID);
    const inning = this.asPositiveInt(value.Inning);
    const cardId = this.asOptionalPositiveInt(value.Card_ID);

    if (userId === null || gameId === null || callListId === null || inning === null) {
      return null;
    }

    return {
      User_ID: userId,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning,
      Card_ID: cardId
    };
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

  private asOptionalPositiveInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.asPositiveInt(value);
  }
}
