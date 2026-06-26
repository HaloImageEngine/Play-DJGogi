import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { BingoLatestGame } from '../../models/player-game.model';
import { parsePositiveIntInput } from '../../utils/numeric-input';
import { AuthUserService } from '../../services/auth-user.service';
import { LoginService } from '../../services/login.service';
import { PlayerCallListService } from '../../services/player-calllist.service';
import { PlayerContextService } from '../../services/player-context.service';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';

@Component({
  selector: 'app-game-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBannerComponent],
  templateUrl: './game-setup.component.html',
  styleUrl: './game-setup.component.scss'
})
export class GameSetupComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly authUserService = inject(AuthUserService);
  private readonly playerContextService = inject(PlayerContextService);
  private readonly playerCallListService = inject(PlayerCallListService);

  readonly currentUser = this.authUserService.user;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly latestGames = signal<BingoLatestGame[]>([]);
  readonly callListIds = signal<number[]>([]);

  gameId = 0;
  callListId = 0;
  inning = 1;
  cardId = 0;

  constructor() {
    const ctx = this.playerContextService.getContext();
    if (ctx) {
      this.gameId = ctx.Game_ID;
      this.callListId = ctx.Call_List_ID;
      this.inning = ctx.Inning;
    }

    const userId = this.currentUser()?.UserId;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      games: this.playerCallListService.getLatestGamesByUserId(userId, 15),
      dropdown: this.playerCallListService.getDropDownCallListByUserId(userId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ games, dropdown }) => {
          this.latestGames.set(games);
          const ids = dropdown.map(row => row.Call_List_ID);
          this.callListIds.set([...new Set(ids)].sort((a, b) => b - a));

          if (!this.gameId && games.length > 0) {
            this.applyLatestGame(games[0]);
          }

          this.loading.set(false);
        },
        error: err => {
          console.error('Game setup load failed', err);
          this.error.set('Unable to load games and call lists.');
          this.loading.set(false);
        }
      });
  }

  applyLatestGame(game: BingoLatestGame): void {
    this.gameId = game.Game_ID;
    this.callListId = game.Call_List_ID;
    this.inning = game.Game_Inning;
  }

  onGameIdInput(value: string | number): void {
    this.gameId = parsePositiveIntInput(value) ?? 0;
  }

  onCallListIdInput(value: string | number): void {
    this.callListId = parsePositiveIntInput(value) ?? 0;
  }

  onInningInput(value: string | number): void {
    const parsed = parsePositiveIntInput(value);
    this.inning = parsed !== null ? Math.min(parsed, 9) : 0;
  }

  onCardIdInput(value: string | number): void {
    this.cardId = parsePositiveIntInput(value) ?? 0;
  }

  saveAndContinue(): void {
    const gameId = Math.trunc(Number(this.gameId));
    const callListId = Math.trunc(Number(this.callListId));
    const inning = Math.trunc(Number(this.inning));

    if (!Number.isInteger(gameId) || gameId <= 0) {
      this.error.set('Enter a valid Game ID.');
      return;
    }

    if (!Number.isInteger(callListId) || callListId <= 0) {
      this.error.set('Enter a valid Call List ID.');
      return;
    }

    if (!Number.isInteger(inning) || inning <= 0) {
      this.error.set('Enter a valid Inning (1 or greater).');
      return;
    }

    this.error.set(null);
    this.playerContextService.setContext({
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning
    });

    if (this.cardId > 0) {
      void this.router.navigate(['/singlecard', this.cardId]);
      return;
    }

    void this.router.navigate(['/cards']);
  }

  logoff(): void {
    this.loginService.logoff();
    void this.router.navigate(['/login']);
  }
}
