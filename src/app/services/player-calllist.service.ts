import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CheckCalledNumberRequest,
  CheckCalledNumberResult
} from '../models/check-called-number.model';
import {
  BingoCallListDropdownByUser,
  BingoExistingCardDetail,
  BingoExistingCardsByPid,
  BingoExistingCardsByPidSummary,
  BingoExistingCardsByUser,
  BingoInningBreakdown,
  BingoLatestGame,
  PlayerGameContext
} from '../models/player-game.model';

@Injectable({ providedIn: 'root' })
export class PlayerCallListService {
  private readonly http = inject(HttpClient);

  getDropDownCallListByUserId(userId: number): Observable<BingoCallListDropdownByUser[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of([]);
    }

    return this.http.get<unknown>(`${environment.bingoDropDownCallListByUserApiUrl}/${userId}`).pipe(
      map(response =>
        this.unwrapArray(response)
          .map(item => this.mapCallListDropdownByUser(item))
          .filter((item): item is BingoCallListDropdownByUser => item !== null)
      )
    );
  }

  getLatestGamesByUserId(userId: number, topN = 10): Observable<BingoLatestGame[]> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of([]);
    }

    const top = Number.isInteger(topN) && topN > 0 ? topN : 10;
    const params = new HttpParams().set('topN', String(top));

    return this.http
      .get<unknown>(`${environment.bingoLatestGamesByUserApiUrl}/${userId}`, { params })
      .pipe(map(response => this.normalizeLatestGames(response)));
  }

  getExistingCardsByUserId(userId: number): Observable<BingoExistingCardsByUser> {
    if (!Number.isInteger(userId) || userId <= 0) {
      return of({ Summary: { User_ID: userId, Total_Cards: 0 }, CardDetails: [] });
    }

    return this.http.get<unknown>(`${environment.bingoExistingCardsByUserApiUrl}/${userId}`).pipe(
      map(response => this.normalizeExistingCardsByUser(response, userId))
    );
  }

  /** `GET …/Get_Existing_Cards_ByPID/{PIDT}` */
  getExistingCardsByPid(pid: number): Observable<BingoExistingCardsByPid> {
    if (!Number.isInteger(pid) || pid <= 0) {
      return of(this.emptyExistingCardsByPid(pid));
    }

    return this.http.get<unknown>(`${environment.bingoExistingCardsByPidApiUrl}/${pid}`).pipe(
      map(response => this.normalizeExistingCardsByPid(response, pid))
    );
  }

  /** `POST …/Check_Called_Number` */
  checkCalledNumber(request: CheckCalledNumberRequest): Observable<CheckCalledNumberResult> {
    if (!this.isValidCheckCalledNumberRequest(request)) {
      return of(this.emptyCheckCalledNumberResult(request));
    }

    return this.http
      .post<unknown>(environment.bingoCheckCalledNumberApiUrl, {
        Game_ID: request.Game_ID,
        Call_List_ID: request.Call_List_ID,
        Inning: request.Inning,
        Song_ID: request.Song_ID
      })
      .pipe(map(response => this.normalizeCheckCalledNumber(response, request)));
  }

  /** Cards for the logged-in user matching Game_ID, Call_List_ID, and Inning. */
  getCardsForContext(userId: number, context: PlayerGameContext): Observable<BingoExistingCardDetail[]> {
    return this.getExistingCardsByUserId(userId).pipe(
      map(result =>
        result.CardDetails.filter(
          card =>
            card.Game_ID === context.Game_ID &&
            card.Call_List_ID === context.Call_List_ID &&
            card.Inning === context.Inning &&
            (card.User_ID === null || card.User_ID === userId)
        )
      )
    );
  }

  private normalizeExistingCardsByUser(response: unknown, userId: number): BingoExistingCardsByUser {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const summarySource = this.asRecord(record['Summary'] ?? record['summary']) ?? record;
    const cardDetails = this.unwrapArray(record['CardDetails'] ?? record['cardDetails']);

    return {
      Summary: {
        User_ID: this.asNullableNumber(summarySource['User_ID'] ?? summarySource['UserID']) ?? userId,
        Total_Cards: this.asNullableNumber(summarySource['Total_Cards'] ?? summarySource['TotalCards']) ?? 0
      },
      CardDetails: cardDetails
        .map(item => this.mapExistingCardDetail(item))
        .filter((item): item is BingoExistingCardDetail => item !== null)
    };
  }

  private normalizeExistingCardsByPid(response: unknown, pid: number): BingoExistingCardsByPid {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const summarySource = this.asRecord(record['Summary'] ?? record['summary']) ?? record;
    const inningBreakdown = this.unwrapArray(record['InningBreakdown'] ?? record['inningBreakdown']);
    const inningList = this.unwrapArray(record['InningList'] ?? record['inningList']);
    const cardDetails = this.unwrapArray(record['CardDetails'] ?? record['cardDetails']);

    return {
      Summary: this.mapExistingCardsByPidSummary(summarySource, pid),
      InningBreakdown: inningBreakdown
        .map(item => this.mapInningBreakdown(item))
        .filter((item): item is BingoInningBreakdown => item !== null),
      InningList: inningList
        .map(item => this.asNullableNumber(item))
        .filter((item): item is number => item !== null),
      CardDetails: cardDetails
        .map(item => this.mapExistingCardDetail(item))
        .filter((item): item is BingoExistingCardDetail => item !== null)
    };
  }

  private emptyExistingCardsByPid(pid: number): BingoExistingCardsByPid {
    return {
      Summary: this.mapExistingCardsByPidSummary({}, pid),
      InningBreakdown: [],
      InningList: [],
      CardDetails: []
    };
  }

  private isValidCheckCalledNumberRequest(request: CheckCalledNumberRequest): boolean {
    return (
      Number.isInteger(request.Game_ID) &&
      request.Game_ID > 0 &&
      Number.isInteger(request.Call_List_ID) &&
      request.Call_List_ID > 0 &&
      Number.isInteger(request.Inning) &&
      request.Inning > 0 &&
      Number.isInteger(request.Song_ID) &&
      request.Song_ID > 0
    );
  }

  private emptyCheckCalledNumberResult(request: CheckCalledNumberRequest): CheckCalledNumberResult {
    return {
      Game_ID: request.Game_ID,
      Call_List_ID: request.Call_List_ID,
      Inning: request.Inning,
      Song_ID: request.Song_ID,
      WasCalled: false
    };
  }

  private normalizeCheckCalledNumber(
    response: unknown,
    request: CheckCalledNumberRequest
  ): CheckCalledNumberResult {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};

    return {
      Game_ID:
        this.asNullableNumber(record['Game_ID'] ?? record['GameID']) ?? request.Game_ID,
      Call_List_ID:
        this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']) ?? request.Call_List_ID,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? request.Inning,
      Song_ID: this.asNullableNumber(record['Song_ID'] ?? record['SongID'] ?? record['SongId']) ?? request.Song_ID,
      WasCalled: this.asBoolean(record['WasCalled'] ?? record['wasCalled'] ?? record['IsCalled'])
    };
  }

  private mapExistingCardsByPidSummary(
    record: Record<string, unknown>,
    fallbackPid: number
  ): BingoExistingCardsByPidSummary {
    return {
      PIDT: this.asNullableNumber(record['PIDT'] ?? record['PID'] ?? record['pid']) ?? fallbackPid,
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['game_id']),
      Call_List_ID: this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']),
      Total_Cards: this.asNullableNumber(record['Total_Cards'] ?? record['TotalCards']) ?? 0,
      Total_Innings: this.asNullableNumber(record['Total_Innings'] ?? record['TotalInnings']) ?? 0,
      Total_Winners: this.asNullableNumber(record['Total_Winners'] ?? record['TotalWinners']) ?? 0,
      Total_NonWinners: this.asNullableNumber(record['Total_NonWinners'] ?? record['TotalNonWinners']) ?? 0,
      Win_Rate_Pct: this.asNullableNumber(record['Win_Rate_Pct'] ?? record['WinRatePct']) ?? 0,
      Total_Printed: this.asNullableNumber(record['Total_Printed'] ?? record['TotalPrinted']) ?? 0,
      Print_Rate_Pct: this.asNullableNumber(record['Print_Rate_Pct'] ?? record['PrintRatePct']) ?? 0,
      Total_Named_Players: this.asNullableNumber(record['Total_Named_Players'] ?? record['TotalNamedPlayers']) ?? 0,
      Total_PlayCount: this.asNullableNumber(record['Total_PlayCount'] ?? record['TotalPlayCount']) ?? 0,
      Avg_PlayCount: this.asNullableNumber(record['Avg_PlayCount'] ?? record['AvgPlayCount']) ?? 0,
      Max_PlayCount: this.asNullableNumber(record['Max_PlayCount'] ?? record['MaxPlayCount']) ?? 0,
      First_Card_Created: this.asNullableString(
        record['First_Card_Created'] ?? record['FirstCardCreated']
      ),
      Last_Card_Created: this.asNullableString(record['Last_Card_Created'] ?? record['LastCardCreated']),
      Last_Printed: this.asNullableString(record['Last_Printed'] ?? record['LastPrinted'])
    };
  }

  private mapInningBreakdown(item: unknown): BingoInningBreakdown | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    if (inning === null) {
      return null;
    }

    return {
      Inning: inning,
      Card_Count: this.asNullableNumber(record['Card_Count'] ?? record['CardCount']) ?? 0,
      Winner_Count: this.asNullableNumber(record['Winner_Count'] ?? record['WinnerCount']) ?? 0,
      NonWinner_Count: this.asNullableNumber(record['NonWinner_Count'] ?? record['NonWinnerCount']) ?? 0,
      Win_Rate_Pct: this.asNullableNumber(record['Win_Rate_Pct'] ?? record['WinRatePct']) ?? 0,
      Printed_Count: this.asNullableNumber(record['Printed_Count'] ?? record['PrintedCount']) ?? 0,
      Print_Rate_Pct: this.asNullableNumber(record['Print_Rate_Pct'] ?? record['PrintRatePct']) ?? 0,
      Named_Player_Count: this.asNullableNumber(record['Named_Player_Count'] ?? record['NamedPlayerCount']) ?? 0,
      Total_PlayCount: this.asNullableNumber(record['Total_PlayCount'] ?? record['TotalPlayCount']) ?? 0,
      Avg_PlayCount: this.asNullableNumber(record['Avg_PlayCount'] ?? record['AvgPlayCount']) ?? 0,
      Max_PlayCount: this.asNullableNumber(record['Max_PlayCount'] ?? record['MaxPlayCount']) ?? 0,
      First_Card_Created: this.asNullableString(
        record['First_Card_Created'] ?? record['FirstCardCreated']
      ),
      Last_Card_Created: this.asNullableString(record['Last_Card_Created'] ?? record['LastCardCreated'])
    };
  }

  private normalizeLatestGames(response: unknown): BingoLatestGame[] {
    return this.unwrapArray(response)
      .map(item => this.mapLatestGame(item))
      .filter((item): item is BingoLatestGame => item !== null);
  }

  private mapLatestGame(item: unknown): BingoLatestGame | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['GameID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    const gameNumber = this.asNullableNumber(record['Game_Number'] ?? record['GameNumber']);
    const gameInning = this.asNullableNumber(record['Game_Inning'] ?? record['GameInning']);

    if (gameId === null || callListId === null || gameNumber === null || gameInning === null) {
      return null;
    }

    return {
      Game_ID: gameId,
      Game_Number: gameNumber,
      Game_Inning: gameInning,
      Game_Name: this.asString(record['Game_Name'] ?? record['GameName']),
      Game_Status: this.asString(record['Game_Status'] ?? record['GameStatus']),
      Call_List_ID: callListId,
      Call_List_Name: this.asNullableString(record['Call_List_Name'] ?? record['CallListName'])
    };
  }

  private mapExistingCardDetail(item: unknown): BingoExistingCardDetail | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['Card_ID'] ?? record['CardID'] ?? record['card_id']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID'] ?? record['call_list_id']);
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);

    if (cardId === null || callListId === null || inning === null) {
      return null;
    }

    return {
      Card_ID: cardId,
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['user_id']),
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['game_id']),
      Call_List_ID: callListId,
      Inning: inning,
      Card_Date_Create: this.asNullableString(
        record['Card_Date_Create'] ?? record['CardDateCreate'] ?? record['Card_DateCreate']
      ),
      Card_PlayerName: this.asNullableString(record['Card_PlayerName'] ?? record['CardPlayerName']),
      Card_PlayerEmail: this.asNullableString(record['Card_PlayerEmail'] ?? record['CardPlayerEmail']),
      PlayCount: this.asNullableNumber(record['PlayCount'] ?? record['play_count']) ?? 0,
      Card_IsWinner: this.asBoolean(record['Card_IsWinner'] ?? record['CardIsWinner']),
      Card_SeedKey: this.asNullableString(record['Card_SeedKey'] ?? record['CardSeedKey']),
      Card_PrintedAt: this.asNullableString(record['Card_PrintedAt'] ?? record['CardPrintedAt']),
      Call_List_Name: this.asNullableString(record['Call_List_Name'] ?? record['CallListName']),
      PIDT: this.asNullableNumber(record['PIDT'] ?? record['PID'] ?? record['pid'])
    };
  }

  private mapCallListDropdownByUser(item: unknown): BingoCallListDropdownByUser | null {
    if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
      return { Call_List_ID: item };
    }

    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const callListId = this.asNullableNumber(
      record['Call_List_ID'] ??
        record['CallListID'] ??
        record['callListId'] ??
        record['call_list_id'] ??
        record['Id'] ??
        record['id']
    );
    if (callListId === null || callListId <= 0) {
      return null;
    }

    return {
      Call_List_ID: callListId,
      Game_ID: this.asNullableNumber(record['Game_ID'] ?? record['GameID'] ?? record['gameId']),
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID'] ?? record['userId'])
    };
  }

  private unwrapArray(response: unknown): unknown[] {
    const record = this.asRecord(response);
    const candidates = ['value', 'Value', 'data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;

    if (Array.isArray(listCandidate)) {
      return listCandidate;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return response ? [response] : [];
  }

  private unwrapRecord(response: unknown): Record<string, unknown> | null {
    const record = this.asRecord(response);
    if (!record) {
      return null;
    }

    const candidates = ['value', 'Value', 'data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];
    for (const candidate of candidates) {
      const nested = this.asRecord(record[candidate]);
      if (nested) {
        return nested;
      }
    }

    return record;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value : null;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'y', 'yes'].includes(value.trim().toLowerCase());
    }

    return false;
  }
}
