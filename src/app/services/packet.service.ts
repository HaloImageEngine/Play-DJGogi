import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  PacketDetailX3,
  PacketIdDetailsByPidtx3Result,
  PacketMasterX3
} from '../models/packet-x3.model';
import {
  PacketDetailX5,
  PacketIdDetailsByPidtx5Result,
  PacketMasterX5
} from '../models/packet-x5.model';

@Injectable({ providedIn: 'root' })
export class PacketService {
  private readonly http = inject(HttpClient);

  /** `POST …/Get_PacketID_Details_By_PIDTX3` */
  getPacketIdDetailsByPidtx3(pidtx3: number): Observable<PacketIdDetailsByPidtx3Result> {
    if (!Number.isInteger(pidtx3) || pidtx3 <= 0) {
      return of({ Master: null, PacketDetails: [] });
    }

    return this.http
      .post<unknown>(environment.packetIdDetailsByPidtx3ApiUrl, { PIDTX3: pidtx3 })
      .pipe(map(response => this.normalizePacketIdDetailsByPidtx3(response)));
  }

  /** `POST …/Get_PacketID_Details_By_PIDTX5` */
  getPacketIdDetailsByPidtx5(pidtx5: number): Observable<PacketIdDetailsByPidtx5Result> {
    if (!Number.isInteger(pidtx5) || pidtx5 <= 0) {
      return of({ Master: null, PacketDetails: [] });
    }

    return this.http
      .post<unknown>(environment.packetIdDetailsByPidtx5ApiUrl, { PIDTX5: pidtx5 })
      .pipe(map(response => this.normalizePacketIdDetailsByPidtx5(response)));
  }

  private normalizePacketIdDetailsByPidtx3(response: unknown): PacketIdDetailsByPidtx3Result {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const masterRecord = record['Master'] ?? record['master'];

    return {
      Master: this.mapPacketMasterX3(masterRecord),
      PacketDetails: this.unwrapArray(record['PacketDetails'] ?? record['packetDetails'])
        .map(item => this.mapPacketDetailX3(item))
        .filter((item): item is PacketDetailX3 => item !== null)
    };
  }

  private normalizePacketIdDetailsByPidtx5(response: unknown): PacketIdDetailsByPidtx5Result {
    const record = this.unwrapRecord(response) ?? this.asRecord(response) ?? {};
    const masterRecord = record['Master'] ?? record['master'];

    return {
      Master: this.mapPacketMaster(masterRecord),
      PacketDetails: this.unwrapArray(record['PacketDetails'] ?? record['packetDetails'])
        .map(item => this.mapPacketDetail(item))
        .filter((item): item is PacketDetailX5 => item !== null)
    };
  }

  private mapPacketMasterX3(item: unknown): PacketMasterX3 | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const pidtx3 = this.asNullableNumber(record['PIDTX3'] ?? record['Pidtx3']);
    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['GameID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    if (pidtx3 === null || gameId === null || callListId === null) {
      return null;
    }

    return {
      PMX3_ID: this.asNullableNumber(record['PMX3_ID'] ?? record['PMX3Id']) ?? pidtx3,
      PIDTX3: pidtx3,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? 0,
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID']) ?? 0,
      GPCode: this.asString(record['GPCode']),
      GPDescription: this.asString(record['GPDescription']),
      Comment: this.asString(record['Comment']),
      Created: this.asString(record['Created']),
      Updated: this.asNullableString(record['Updated']),
      CardCount: this.asNullableNumber(record['CardCount']) ?? undefined
    };
  }

  private mapPacketDetailX3(item: unknown): PacketDetailX3 | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const pidtx3 = this.asNullableNumber(record['PIDTX3'] ?? record['Pidtx3']);
    const cardId = this.asNullableNumber(record['Card_ID'] ?? record['CardID']);
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const pdx3Id = this.asNullableNumber(record['PDX3_ID'] ?? record['PDX3Id']);

    if (pidtx3 === null || cardId === null || inning === null || pdx3Id === null) {
      return null;
    }

    return {
      PIDTX3: pidtx3,
      PDX3_ID: pdx3Id,
      Card_ID: cardId,
      Inning: inning,
      Card_PlayerName: this.asNullableString(record['Card_PlayerName']),
      Card_PlayerEmail: this.asNullableString(record['Card_PlayerEmail']),
      Card_IsWinner: this.asBoolean(record['Card_IsWinner']),
      PlayCount: this.asNullableNumber(record['PlayCount']) ?? 0,
      Card_PrintedAt: this.asNullableString(record['Card_PrintedAt']),
      Status: this.asString(record['Status']),
      Detail_Winner: this.asBoolean(record['Detail_Winner']),
      Detail_Created: this.asString(record['Detail_Created']),
      Detail_Updated: this.asNullableString(record['Detail_Updated'])
    };
  }

  private mapPacketMaster(item: unknown): PacketMasterX5 | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const pidtx5 = this.asNullableNumber(record['PIDTX5'] ?? record['Pidtx5']);
    const gameId = this.asNullableNumber(record['Game_ID'] ?? record['GameID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    if (pidtx5 === null || gameId === null || callListId === null) {
      return null;
    }

    return {
      PMX5_ID: this.asNullableNumber(record['PMX5_ID'] ?? record['PMX5Id']) ?? pidtx5,
      PIDTX5: pidtx5,
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? 0,
      User_ID: this.asNullableNumber(record['User_ID'] ?? record['UserID']) ?? 0,
      GPCode: this.asString(record['GPCode']),
      GPDescription: this.asString(record['GPDescription']),
      Comment: this.asString(record['Comment']),
      Created: this.asString(record['Created']),
      Updated: this.asNullableString(record['Updated']),
      CardCount: this.asNullableNumber(record['CardCount']) ?? undefined
    };
  }

  private mapPacketDetail(item: unknown): PacketDetailX5 | null {
    const record = this.asRecord(item);
    if (!record) {
      return null;
    }

    const pidtx5 = this.asNullableNumber(record['PIDTX5'] ?? record['Pidtx5']);
    const cardId = this.asNullableNumber(record['Card_ID'] ?? record['CardID']);
    const inning = this.asNullableNumber(record['Inning'] ?? record['inning']);
    const pdx5Id = this.asNullableNumber(record['PDX5_ID'] ?? record['PDX5Id']);

    if (pidtx5 === null || cardId === null || inning === null || pdx5Id === null) {
      return null;
    }

    return {
      PIDTX5: pidtx5,
      PDX5_ID: pdx5Id,
      Card_ID: cardId,
      Inning: inning,
      Card_PlayerName: this.asNullableString(record['Card_PlayerName']),
      Card_PlayerEmail: this.asNullableString(record['Card_PlayerEmail']),
      Card_IsWinner: this.asBoolean(record['Card_IsWinner']),
      PlayCount: this.asNullableNumber(record['PlayCount']) ?? 0,
      Card_PrintedAt: this.asNullableString(record['Card_PrintedAt']),
      Status: this.asString(record['Status']),
      Detail_Winner: this.asBoolean(record['Detail_Winner']),
      Detail_Created: this.asString(record['Detail_Created']),
      Detail_Updated: this.asNullableString(record['Detail_Updated'])
    };
  }

  private unwrapArray(response: unknown): unknown[] {
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

    for (const key of ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload']) {
      const nested = this.asRecord(record[key]);
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
