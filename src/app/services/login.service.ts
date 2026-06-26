import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  LoginCreateUserPayload,
  LoginCreateUserRequest,
  LoginCreateUserResult
} from '../models/login-create-user.model';
import { LoginVerifyAliasRequest, LoginVerifyAliasResult } from '../models/login-verify-alias.model';
import { AuthGuard } from './auth.guard';
import { AuthUserService } from './auth-user.service';
import { PlayerContextService } from './player-context.service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly authUserService = inject(AuthUserService);
  private readonly playerContextService = inject(PlayerContextService);

  logoff(): void {
    AuthGuard.logout();
    this.authUserService.clearUser();
    this.playerContextService.clear();
  }

  /** Signs in with the default guest account when no session exists. */
  ensureGuestLogin(): Observable<boolean> {
    if (typeof window !== 'undefined' && window.localStorage.getItem('authToken')) {
      return of(true);
    }

    return this.verifyAlias('Guest100', 'test100').pipe(
      map(result => {
        if (!result.ok || result.userId === null) {
          return false;
        }

        this.completeSession('Guest100', result.userId, result.userEmail);
        return true;
      }),
      catchError(error => {
        console.error('Guest login failed', error);
        return of(false);
      })
    );
  }

  completeSession(alias: string, userId: number, userEmail: string | null = null): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('authToken', 'rapidcms-session');
    }

    AuthGuard.login();
    this.authUserService.setUser({
      UserId: userId,
      UserAlias: alias.trim(),
      UserEmail: userEmail
    });
  }

  /**
   * `POST …/RapidCMS/login/create`
   * Body: `{ FirstName, MiddleInitial, LastName, Email, UserAlias, Password, UserType, Zip, PhoneNum }`.
   */
  createUser(payload: LoginCreateUserPayload): Observable<LoginCreateUserResult> {
    const requestBody: LoginCreateUserRequest = {
      FirstName: payload.FirstName.trim(),
      MiddleInitial: payload.MiddleInitial.trim(),
      LastName: payload.LastName.trim(),
      Email: payload.Email.trim(),
      UserAlias: payload.UserAlias.trim(),
      Password: payload.Password,
      UserType: 'DJGOGI',
      Zip: payload.Zip.trim(),
      PhoneNum: payload.PhoneNum.trim()
    };

    if (environment.debugLogging) {
      console.debug('[LoginService] POST', environment.rapidCmsCreateUserApiUrl, {
        UserAlias: requestBody.UserAlias
      });
    }

    return this.http.post<unknown>(environment.rapidCmsCreateUserApiUrl, requestBody).pipe(
      map(response => this.normalizeCreateUserResponse(response)),
      catchError(error => of(this.normalizeCreateUserError(error)))
    );
  }

  verifyAlias(alias: string, password: string): Observable<LoginVerifyAliasResult> {
    const requestBody: LoginVerifyAliasRequest = {
      Alias: alias.trim(),
      Password: password
    };

    return this.http.post<unknown>(environment.rapidCmsVerifyAliasApiUrl, requestBody).pipe(
      map(response => this.normalizeVerifyAliasResponse(response)),
      catchError(error => of(this.normalizeVerifyAliasError(error)))
    );
  }

  private normalizeCreateUserError(error: unknown): LoginCreateUserResult {
    if (error instanceof HttpErrorResponse) {
      const fromBody = this.normalizeCreateUserResponse(error.error);
      if (fromBody.error || !fromBody.ok) {
        return fromBody;
      }

      if (error.status === 409) {
        return this.failedCreateResult('That login alias or email is already in use. Try another.');
      }

      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return this.failedCreateResult(error.error);
      }
    }

    return this.failedCreateResult('Unable to create your account. Please try again.');
  }

  private failedCreateResult(message: string): LoginCreateUserResult {
    return {
      ok: false,
      userId: null,
      userInfoId: null,
      error: message
    };
  }

  private normalizeCreateUserResponse(response: unknown): LoginCreateUserResult {
    const record = this.asRecord(response) ?? {};

    const ok = this.asBoolean(record['ok'] ?? record['Ok']);
    const modelState = this.asRecord(record['ModelState']);
    const modelStateMessage = modelState ? this.formatModelStateErrors(modelState) : null;
    const userId = this.asNumber(record['userId'] ?? record['UserId'] ?? record['User_ID']);
    const userInfoId = this.asNumber(record['userInfoId'] ?? record['UserInfoId'] ?? record['User_Info_ID']);

    // API returns HTTP 200 with ok:true and both ids 0 when UserAlias is already taken.
    if (this.isDuplicateUserAliasResponse(ok, userId, userInfoId)) {
      return {
        ok: false,
        userId: 0,
        userInfoId: 0,
        error: 'That login alias is already in use. Change your login alias and submit again.',
        duplicateUserAlias: true
      };
    }

    return {
      ok: ok && userId > 0,
      userId: userId > 0 ? userId : null,
      userInfoId: userInfoId > 0 ? userInfoId : null,
      error:
        this.asNullableString(record['error'] ?? record['Error'] ?? record['Message']) ?? modelStateMessage
    };
  }

  /** `{ ok: true, userId: 0, userInfoId: 0 }` means duplicate UserAlias. */
  isDuplicateUserAliasResponse(ok: boolean, userId: number, userInfoId: number): boolean {
    return ok && userId === 0 && userInfoId === 0;
  }

  private normalizeVerifyAliasError(error: unknown): LoginVerifyAliasResult {
    if (error instanceof HttpErrorResponse) {
      const fromBody = this.normalizeVerifyAliasResponse(error.error);
      if (fromBody.error || !fromBody.ok) {
        return fromBody;
      }

      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return this.failedResult(error.error);
      }
    }

    return this.failedResult('Unable to reach the login service. Please try again.');
  }

  private failedResult(message: string): LoginVerifyAliasResult {
    return {
      ok: false,
      userId: null,
      userEmail: null,
      userPhone: null,
      error: message
    };
  }

  private normalizeVerifyAliasResponse(response: unknown): LoginVerifyAliasResult {
    const record = this.asRecord(response) ?? {};

    const ok = this.asBoolean(record['ok'] ?? record['Ok']);
    const modelState = this.asRecord(record['ModelState']);
    const modelStateMessage = modelState ? this.formatModelStateErrors(modelState) : null;

    return {
      ok,
      userId: this.asNullableNumber(record['userId'] ?? record['UserId']),
      userEmail: this.asNullableString(record['userEmail'] ?? record['UserEmail']),
      userPhone: this.asNullableString(record['userPhone'] ?? record['UserPhone']),
      error:
        this.asNullableString(record['error'] ?? record['Error'] ?? record['Message']) ?? modelStateMessage
    };
  }

  private formatModelStateErrors(modelState: Record<string, unknown>): string | null {
    const messages = Object.values(modelState)
      .flatMap(value => (Array.isArray(value) ? value : []))
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private asNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
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

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }

    return false;
  }
}
