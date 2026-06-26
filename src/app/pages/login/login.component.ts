import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginService } from '../../services/login.service';
import { PlayerContextService } from '../../services/player-context.service';
import { formatPhoneInput, phoneDigitsOnly } from '../../utils/phone-input';
import { TopBannerComponent } from '../../shared/top-banner/top-banner.component';

type LoginMode = 'sign-in' | 'create';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TopBannerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  readonly appVersion = environment.version;
  readonly mode = signal<LoginMode>('sign-in');

  @ViewChild('loginAliasInput') loginAliasInput?: ElementRef<HTMLInputElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly loginService = inject(LoginService);
  private readonly playerContextService = inject(PlayerContextService);

  login = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  middleInitial = '';
  lastName = '';
  email = '';
  zip = '';
  phoneNum = '';
  error = '';
  success = '';
  submitting = false;

  setMode(next: LoginMode): void {
    this.mode.set(next);
    this.error = '';
    this.success = '';
  }

  onPhoneNumInput(value: string): void {
    this.phoneNum = formatPhoneInput(value);
  }

  onSubmit(): void {
    if (this.mode() === 'create') {
      this.onCreateAccount();
      return;
    }

    this.onSignIn();
  }

  private onSignIn(): void {
    const alias = this.login.trim();
    const password = this.password;

    if (alias.length < 6 || alias.length > 20) {
      this.error = 'Login alias must be between 6 and 20 characters.';
      return;
    }

    if (!password) {
      this.error = 'Password is required.';
      return;
    }

    this.error = '';
    this.success = '';
    this.submitting = true;

    this.loginService
      .verifyAlias(alias, password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe(result => {
        if (!result.ok || result.userId === null) {
          this.error = result.error ?? 'Invalid login or password.';
          return;
        }

        this.completeSignIn(alias, result.userId, result.userEmail);
      });
  }

  private onCreateAccount(duplicateRetry = 0, userAlias?: string): void {
    const alias = (userAlias ?? this.login).trim();
    if (userAlias !== undefined) {
      this.login = alias;
    }
    const password = this.password;
    const confirmPassword = this.confirmPassword;
    const firstName = this.firstName.trim();
    const middleInitial = this.middleInitial.trim();
    const lastName = this.lastName.trim();
    const email = this.email.trim();
    const zip = this.zip.trim();
    const phoneNum = this.phoneNum.trim();

    if (duplicateRetry === 0) {
      if (alias.length < 6 || alias.length > 20) {
        this.error = 'Login alias must be between 6 and 20 characters.';
        return;
      }

      if (password.length < 6) {
        this.error = 'Password must be at least 6 characters.';
        return;
      }

      if (password !== confirmPassword) {
        this.error = 'Passwords do not match.';
        return;
      }

      if (!firstName || !lastName) {
        this.error = 'First and last name are required.';
        return;
      }

      if (!email || !email.includes('@')) {
        this.error = 'A valid email address is required.';
        return;
      }

      if (!zip) {
        this.error = 'ZIP code is required.';
        return;
      }

      if (!phoneNum || phoneDigitsOnly(phoneNum).length !== 10) {
        this.error = 'Enter a valid 10-digit phone number.';
        return;
      }
    } else if (alias.length < 6 || alias.length > 20) {
      this.submitting = false;
      this.error = 'Suggested login alias is invalid. Choose a different alias and submit again.';
      this.focusLoginAlias();
      return;
    }

    this.error = '';
    this.success = '';
    this.submitting = true;

    this.loginService
      .createUser({
        FirstName: firstName,
        MiddleInitial: middleInitial,
        LastName: lastName,
        Email: email,
        UserAlias: alias,
        Password: password,
        Zip: zip,
        PhoneNum: phoneNum
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        const duplicateAlias =
          result.duplicateUserAlias ||
          (result.userId === 0 && result.userInfoId === 0);

        if (duplicateAlias) {
          const takenAlias = alias;
          const suggestedAlias = this.suggestAlternateUserAlias(takenAlias);
          const canAutoRetry =
            duplicateRetry < 5 &&
            suggestedAlias !== takenAlias &&
            suggestedAlias.length >= 6 &&
            suggestedAlias.length <= 20;

          if (canAutoRetry) {
            this.error = `Login alias "${takenAlias}" is already in use. Trying "${suggestedAlias}"…`;
            this.onCreateAccount(duplicateRetry + 1, suggestedAlias);
            return;
          }

          this.login = suggestedAlias;
          this.submitting = false;
          this.error = `Login alias "${takenAlias}" is already in use. Change your login alias and submit again.`;
          this.focusLoginAlias();
          return;
        }

        this.submitting = false;

        if (!result.ok || result.userId === null || result.userId <= 0) {
          this.error = result.error ?? 'Could not create your account.';
          return;
        }

        this.success = `Account created. Your User ID is ${result.userId}. Signing you in…`;
        this.completeSignIn(alias, result.userId, email);
      });
  }

  /** Increment trailing digits or append a digit, staying within 6–20 characters. */
  private suggestAlternateUserAlias(alias: string): string {
    const trailingDigits = alias.match(/^(.*?)(\d+)$/);
    if (trailingDigits) {
      const base = trailingDigits[1];
      const nextNum = String(Number(trailingDigits[2]) + 1);
      const candidate = `${base}${nextNum}`;
      if (candidate.length <= 20) {
        return candidate;
      }
    }

    const withSuffix = `${alias}1`;
    if (withSuffix.length <= 20) {
      return withSuffix;
    }

    return alias.slice(0, 20);
  }

  private focusLoginAlias(): void {
    queueMicrotask(() => {
      const input = this.loginAliasInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  private completeSignIn(alias: string, userId: number, userEmail: string | null): void {
    this.loginService.completeSession(alias, userId, userEmail);

    const redirectUrl = localStorage.getItem('postLoginRedirect');
    localStorage.removeItem('postLoginRedirect');

    if (redirectUrl && redirectUrl !== '/login') {
      void this.router.navigateByUrl(redirectUrl);
      return;
    }

    if (this.playerContextService.hasCompleteContext()) {
      void this.router.navigate(['/cards']);
    } else {
      void this.router.navigate(['/setup']);
    }
  }
}
