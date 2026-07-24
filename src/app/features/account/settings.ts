import { Component, inject, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { TPipe, I18nService } from '../../core/i18n.service';
import { AccountService } from '../../core/services/account.service';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButton, UiInput, TPipe],
  template: `
    <div class="content-header">
      <h2>{{ 'acct.settingsTitle' | t }}</h2>
    </div>

    <!-- Campus email verification section -->
    <div class="verify-section" *ngIf="!verifiedAt">
      <div class="alert-box warning">
        <strong>{{ 'acct.unverifiedTitle' | t }}</strong>
        <p>{{ 'acct.unverifiedDesc' | t }}</p>
      </div>

      <!-- Auto verify section if login email is .edu.tw -->
      <div class="form-group" style="max-width: 400px; margin-top: 16px; padding: 16px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;" *ngIf="!showPendingVerification && email && email.endsWith('.edu.tw')">
        <label style="color: #0f5132; margin-bottom: 4px;">{{ 'acct.autoVerifyLabel' | t }}</label>
        <p style="font-size: 14px; margin-bottom: 12px; color: #666; margin-top: 0;">{{ 'acct.autoVerifyDesc' | t:{email: email} }}</p>
        <ui-button (onClick)="onAutoVerify()" [disabled]="isLoading">
          {{ (isLoading ? 'acct.sending' : 'acct.autoVerifyBtn') | t }}
        </ui-button>
        <div *ngIf="autoVerifyMessage" class="inline-msg" [class.error]="autoVerifyIsError" style="margin-top: 8px; font-size: 14px;">
          {{ autoVerifyMessage }}
        </div>
      </div>

      <ng-container *ngIf="!showPendingVerification; else pendingVerificationBlock">
        <div class="form-group" style="max-width: 400px; margin-top: 16px;">
          <label>{{ 'acct.eduEmailLabel' | t }}</label>
          <ui-input placeholder="student@ntu.edu.tw" [(ngModel)]="eduEmail" style="width: 100%;"></ui-input>
          <ui-button style="margin-top: 8px;" (onClick)="onRequestVerification()" [disabled]="isLoading || resendCooldownSeconds > 0">
            {{
              isLoading
                ? ('acct.sending' | t)
                : (resendCooldownSeconds > 0
                  ? ('acct.resendIn' | t:{minutes: resendCooldownMinutes, seconds: resendCooldownSecondsPart})
                  : ('acct.sendVerification' | t))
            }}
          </ui-button>
          <div *ngIf="verifyMessage" class="inline-msg" [class.error]="verifyIsError" style="margin-top: 8px; font-size: 14px;">
            {{ verifyMessage }}
          </div>
        </div>
      </ng-container>

      <ng-template #pendingVerificationBlock>
        <div class="form-group" style="max-width: 400px; margin-top: 16px; padding: 16px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">
          <label style="margin-bottom: 4px;">{{ 'acct.pendingEmailLabel' | t }}</label>
          <p style="font-size: 14px; margin-top: 0; margin-bottom: 8px; color: #666;">{{ pendingEduEmailDisplay }}</p>
          <p style="font-size: 14px; margin-top: 0; margin-bottom: 12px; color: #666;">{{ 'acct.pendingEmailDesc' | t:{email: pendingEduEmailDisplay} }}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <ui-button variant="white" (onClick)="onReenterEduEmail()" [disabled]="isLoading">{{ 'acct.reenterEmail' | t }}</ui-button>
            <ui-button (onClick)="onResendVerification()" [disabled]="isLoading || resendCooldownSeconds > 0">
              {{
                isLoading
                  ? ('acct.sending' | t)
                  : (resendCooldownSeconds > 0
                    ? ('acct.resendIn' | t:{minutes: resendCooldownMinutes, seconds: resendCooldownSecondsPart})
                    : ('acct.resendVerification' | t))
              }}
            </ui-button>
          </div>
          <div *ngIf="verifyMessage" class="inline-msg" [class.error]="verifyIsError" style="margin-top: 8px; font-size: 14px;">
            {{ verifyMessage }}
          </div>
        </div>
      </ng-template>
    </div>

    <div class="verify-section" *ngIf="verifiedAt">
      <div class="alert-box success">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <strong>{{ 'acct.verifiedTitle' | t }}</strong>
            <p>{{ 'acct.boundTo' | t:{email: eduEmail} }}</p>
            <p style="font-size: 12px; margin-top: 4px;">{{ 'acct.verifiedAtPrefix' | t }}{{ verifiedAt | date:'yyyy/MM/dd HH:mm' }}</p>
          </div>
          <ui-button variant="white" (onClick)="onUnbindEduEmail()" [disabled]="isLoading">{{ 'acct.unbindEmail' | t }}</ui-button>
        </div>
      </div>
    </div>

    <div class="form-group" style="max-width: 400px; margin-top: 32px; border-top: 1px solid var(--line); padding-top: 32px;">
      <div style="margin-bottom: 16px;">
        <label>{{ 'acct.loginEmailLabel' | t }}</label>
        <ui-input [(ngModel)]="email" style="width: 100%;" [disabled]="isGoogleLinked"></ui-input>
        <div *ngIf="isGoogleLinked" style="font-size: 12px; color: #666; margin-top: 4px;">
          {{ 'acct.googleLinkedEmailDesc' | t }}
        </div>
      </div>
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <label>{{ 'auth.lastNameLabel' | t }}</label>
          <ui-input [(ngModel)]="lastName" style="width: 100%;"></ui-input>
        </div>
        <div style="flex: 1;">
          <label>{{ 'auth.firstNameLabel' | t }}</label>
          <ui-input [(ngModel)]="firstName" style="width: 100%;"></ui-input>
        </div>
      </div>
      
      <ui-button style="margin-top: 16px;" (onClick)="onUpdateProfile()" [disabled]="isLoading">
        {{ (isLoading ? 'acct.saving' : 'acct.saveProfile') | t }}
      </ui-button>
      <div *ngIf="settingsMessage" class="inline-msg" [class.error]="settingsIsError" style="margin-top: 8px; font-size: 14px;">
        {{ settingsMessage }}
      </div>
    </div>

    <div class="form-group" style="max-width: 400px; margin-top: 32px; border-top: 1px solid var(--line); padding-top: 32px;">
      <div style="margin-bottom: 16px;" *ngIf="hasPassword">
        <label>{{ 'acct.currentPassword' | t }}</label>
        <ui-input type="password" [(ngModel)]="oldPassword" style="width: 100%;"></ui-input>
      </div>
      <div style="margin-bottom: 16px;">
        <label>{{ 'acct.newPassword' | t }}</label>
        <ui-input type="password" [(ngModel)]="newPassword" style="width: 100%;"></ui-input>
      </div>
      <div style="margin-bottom: 16px;">
        <label>{{ 'acct.confirmNewPassword' | t }}</label>
        <ui-input type="password" [(ngModel)]="confirmPassword" style="width: 100%;"></ui-input>
      </div>
      
      <ui-button style="margin-top: 8px;" (onClick)="onChangePassword()" [disabled]="isLoading">
        {{ (hasPassword ? 'acct.changePasswordBtn' : 'acct.setPasswordBtn') | t }}
      </ui-button>
      <div *ngIf="pwdMessage" class="inline-msg" [class.error]="pwdIsError" style="margin-top: 8px; font-size: 14px;">
        {{ pwdMessage }}
      </div>
    </div>

    <!-- Delete Account Section -->
    <div class="form-group" style="max-width: 400px; margin-top: 48px; border-top: 1px solid #f5c2c7; padding-top: 32px;">
      <h3 style="color: #dc3545; margin-top: 0; margin-bottom: 8px; font-size: 18px;">{{ 'acct.deleteAccountBtn' | t }}</h3>
      <p style="font-size: 14px; color: #666; margin-bottom: 16px;">{{ 'acct.deleteAccountConfirm' | t }}</p>
      <ui-button variant="white" (onClick)="onDeleteAccount()" [disabled]="isLoading">
        <span style="color: #dc3545">{{ 'acct.deleteAccountBtn' | t }}</span>
      </ui-button>
    </div>
  `,
  styles: [`
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .content-header h2 { margin: 0; }
    .verify-section { margin-bottom: 24px; }
    .alert-box {
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 24px;
    }
    .alert-box.warning {
      background-color: #fff3cd;
      border: 1px solid #ffe69c;
      color: #664d03;
    }
    .alert-box.success {
      background-color: #d1e7dd;
      border: 1px solid #a3cfbb;
      color: #0f5132;
    }
    .alert-box strong {
      display: block;
      margin-bottom: 4px;
    }
    .alert-box p {
      margin: 0;
      font-size: 14px;
    }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .inline-msg {
      padding: 8px;
      border-radius: 4px;
      background-color: #d1e7dd;
      color: #0f5132;
    }
    .inline-msg.error {
      background-color: #f8d7da;
      color: #842029;
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly verifyPendingEmailStorageKeyLegacy = 'cycleuni.account.eduVerification.pendingEmail';
  private readonly verifyCooldownUntilStorageKeyLegacy = 'cycleuni.account.eduVerification.cooldownUntil';

  email = '';
  firstName = '';
  lastName = '';
  eduEmail = '';
  verifiedAt: string | null = null;
  pendingEduEmail: string | null = null;
  resendCooldownSeconds = 0;
  isEditingPendingEmail = false;
  isLoading = false;
  verifyIsError = false;
  settingsIsError = false;
  isGoogleLinked = false;

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwdIsError = false;
  hasPassword = true;

  clientVerifyMsg = '';
  lastVerifyError: any = null;
  get verifyMessage(): string {
    if (this.clientVerifyMsg) return this.i18n.t(this.clientVerifyMsg);
    if (!this.lastVerifyError) return '';
    const err = this.lastVerifyError;
    const code = err.error?.error?.code;
    if (code) return this.i18n.t(code);
    const throttledSeconds = this.extractThrottleSeconds(err);
    if (throttledSeconds !== null) {
      return this.i18n.t('acct.verifyThrottled', {
        minutes: this.resendCooldownMinutes,
        seconds: this.resendCooldownSecondsPart
      });
    }
    return err.error?.detail || err.error?.edu_email?.[0] || this.i18n.t('acct.verifyFailed');
  }

  clientSettingsMsg = '';
  lastSettingsError: any = null;
  get settingsMessage(): string {
    if (this.clientSettingsMsg) return this.i18n.t(this.clientSettingsMsg);
    if (!this.lastSettingsError) return '';
    const err = this.lastSettingsError;
    return err.error?.email?.[0] || this.i18n.t('acct.saveFailed');
  }

  clientPwdMsg = '';
  lastPwdError: any = null;
  get pwdMessage(): string {
    if (this.clientPwdMsg) return this.i18n.t(this.clientPwdMsg);
    if (!this.lastPwdError) return '';
    const err = this.lastPwdError;
    return err.error?.old_password?.[0] || err.error?.detail || this.i18n.t('acct.updateFailed');
  }

  private authStore = inject(AuthStore);
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);
  readonly i18n = inject(I18nService);
  private resendCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private profileUserId: string | null = null;

  get showPendingVerification(): boolean {
    return !this.isEditingPendingEmail && !!this.pendingEduEmail;
  }

  get resendCooldownMinutes(): number {
    return Math.floor(this.resendCooldownSeconds / 60);
  }

  get resendCooldownSecondsPart(): string {
    return (this.resendCooldownSeconds % 60).toString().padStart(2, '0');
  }

  get pendingEduEmailDisplay(): string {
    return this.pendingEduEmail || '';
  }

  ngOnInit() {
    this.clearLegacyPendingVerificationState();
    this.loadProfile();
  }

  ngOnDestroy() {
    this.stopResendCountdown();
  }

  loadProfile() {
    this.accountService.getMyProfile().subscribe({
      next: (data) => {
        this.profileUserId = data.id ? String(data.id) : null;
        this.email = data.email || '';
        this.firstName = data.first_name || '';
        this.lastName = data.last_name || '';
        this.eduEmail = data.edu_email || '';
        this.verifiedAt = data.verified_at || null;
        this.hasPassword = data.has_password ?? true;
        this.isGoogleLinked = data.is_google_linked ?? false;
        this.restorePendingVerificationState();
        if (this.verifiedAt) {
          this.clearPendingVerificationState();
        } else if (this.pendingEduEmail && !this.isEditingPendingEmail) {
          this.eduEmail = this.pendingEduEmail;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.settingsIsError = true;
        this.clientSettingsMsg = 'acct.loadProfileFailed';
        console.error('Failed to load profile', err);
        this.cdr.markForCheck();
      }
    });
  }

  onRequestVerification() {
    this.submitEduVerification(this.eduEmail);
  }

  onResendVerification() {
    if (!this.pendingEduEmail || this.resendCooldownSeconds > 0) {
      return;
    }
    this.submitEduVerification(this.pendingEduEmail);
  }

  onReenterEduEmail() {
    this.isEditingPendingEmail = true;
    this.clientVerifyMsg = '';
    this.verifyIsError = false;
    this.lastVerifyError = null;
    this.eduEmail = this.pendingEduEmail || this.eduEmail;
    this.cdr.markForCheck();
  }

  private submitEduVerification(emailInput: string) {
    this.clientVerifyMsg = '';
    this.lastVerifyError = null;
    const normalizedEmail = emailInput.trim();
    if (!normalizedEmail) {
      this.verifyIsError = true;
      this.clientVerifyMsg = 'acct.emailRequired';
      return;
    }
    this.isLoading = true;
    this.cdr.markForCheck();

    this.authStore.requestEduVerification(normalizedEmail).subscribe({
      next: () => {
        this.isLoading = false;
        this.verifyIsError = false;
        this.clientVerifyMsg = 'acct.sentVerification';
        this.eduEmail = normalizedEmail;
        this.pendingEduEmail = normalizedEmail;
        this.isEditingPendingEmail = false;
        this.startResendCooldown(180);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.verifyIsError = true;
        this.lastVerifyError = err;
        const throttledSeconds = this.extractThrottleSeconds(err);
        if (throttledSeconds !== null) {
          this.applyCooldownUntil(Date.now() + throttledSeconds * 1000);
        }
        this.cdr.markForCheck();
      }
    });
  }

  autoVerifyMessage = '';
  autoVerifyIsError = false;

  onAutoVerify() {
    this.isLoading = true;
    this.autoVerifyMessage = '';
    this.autoVerifyIsError = false;
    this.cdr.markForCheck();

    this.accountService.autoVerifyEduEmail().subscribe({
      next: () => {
        this.isLoading = false;
        this.autoVerifyIsError = false;
        // The panel hides once verified, so no need to keep a success message
        // around (it would otherwise reappear if the user unbinds later).
        this.autoVerifyMessage = '';
        this.verifiedAt = new Date().toISOString();
        this.eduEmail = this.email;
        this.clearPendingVerificationState();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.autoVerifyIsError = true;
        const code = err.error?.error?.code;
        this.autoVerifyMessage = code ? this.i18n.t(code) : this.i18n.t('acct.verifyFailed');
        this.cdr.markForCheck();
      }
    });
  }

  onUpdateProfile() {
    this.isLoading = true;
    this.clientSettingsMsg = '';
    this.lastSettingsError = null;
    this.settingsIsError = false;
    this.cdr.markForCheck();

    this.accountService.updateProfile({
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.clientSettingsMsg = 'acct.profileSaved';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.settingsIsError = true;
        this.lastSettingsError = err;
        this.cdr.markForCheck();
      }
    });
  }

  onChangePassword() {
    this.clientPwdMsg = '';
    this.lastPwdError = null;
    
    if (this.hasPassword && !this.oldPassword) {
      this.pwdIsError = true;
      this.clientPwdMsg = 'auth.errFillAll';
      return;
    }
    if (!this.newPassword || !this.confirmPassword) {
      this.pwdIsError = true;
      this.clientPwdMsg = 'auth.errFillAll';
      return;
    }

    this.isLoading = true;
    this.pwdIsError = false;
    this.cdr.markForCheck();

    this.accountService.changePassword({
      old_password: this.oldPassword,
      new_password: this.newPassword
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.pwdIsError = false;
        this.clientPwdMsg = this.hasPassword ? 'acct.passwordUpdated' : 'acct.passwordSet';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.hasPassword = true; // They now have a password
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.pwdIsError = true;
        this.lastPwdError = err;
        this.cdr.markForCheck();
      }
    });
  }

  onUnbindEduEmail() {
    if (!confirm(this.i18n.t('acct.unbindConfirm'))) {
      return;
    }
    
    this.isLoading = true;
    this.accountService.unbindEduEmail().subscribe({
      next: () => {
        this.isLoading = false;
        this.eduEmail = '';
        this.verifiedAt = null;
        this.clearPendingVerificationState();
        this.autoVerifyMessage = '';
        this.clientVerifyMsg = '';
        this.lastVerifyError = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        alert(this.i18n.t('acct.updateFailed') + (err.error?.detail ? ': ' + err.error.detail : ''));
        this.cdr.markForCheck();
      }
    });
  }

  private startResendCooldown(seconds: number) {
    const cooldownUntil = Date.now() + seconds * 1000;
    this.applyCooldownUntil(cooldownUntil);
  }

  private applyCooldownUntil(cooldownUntil: number) {
    this.stopResendCountdown();
    this.updateResendCooldownSeconds(cooldownUntil);
    this.savePendingVerificationState(cooldownUntil);
    if (this.resendCooldownSeconds === 0) {
      return;
    }

    this.resendCountdownTimer = setInterval(() => {
      this.updateResendCooldownSeconds(cooldownUntil);
      if (this.resendCooldownSeconds === 0) {
        this.stopResendCountdown();
        this.savePendingVerificationState();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private updateResendCooldownSeconds(cooldownUntil: number) {
    const remainingMs = cooldownUntil - Date.now();
    this.resendCooldownSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  }

  private stopResendCountdown() {
    if (this.resendCountdownTimer !== null) {
      clearInterval(this.resendCountdownTimer);
      this.resendCountdownTimer = null;
    }
  }

  private clearPendingVerificationState() {
    this.pendingEduEmail = null;
    this.isEditingPendingEmail = false;
    this.resendCooldownSeconds = 0;
    this.stopResendCountdown();
    this.savePendingVerificationState();
  }

  private restorePendingVerificationState() {
    const pendingEmailStorageKey = this.getVerifyPendingEmailStorageKey();
    const cooldownUntilStorageKey = this.getVerifyCooldownUntilStorageKey();
    if (!pendingEmailStorageKey || !cooldownUntilStorageKey) {
      return;
    }
    const pendingEmail = localStorage.getItem(pendingEmailStorageKey);
    if (pendingEmail) {
      this.pendingEduEmail = pendingEmail;
      this.eduEmail = pendingEmail;
      this.isEditingPendingEmail = false;
    }

    const rawCooldownUntil = localStorage.getItem(cooldownUntilStorageKey);
    if (!rawCooldownUntil) {
      return;
    }
    const cooldownUntil = Number(rawCooldownUntil);
    if (!Number.isFinite(cooldownUntil) || cooldownUntil <= Date.now()) {
      localStorage.removeItem(cooldownUntilStorageKey);
      return;
    }
    this.applyCooldownUntil(cooldownUntil);
  }

  private savePendingVerificationState(cooldownUntil?: number) {
    const pendingEmailStorageKey = this.getVerifyPendingEmailStorageKey();
    const cooldownUntilStorageKey = this.getVerifyCooldownUntilStorageKey();
    if (!pendingEmailStorageKey || !cooldownUntilStorageKey) {
      return;
    }
    if (this.pendingEduEmail) {
      localStorage.setItem(pendingEmailStorageKey, this.pendingEduEmail);
    } else {
      localStorage.removeItem(pendingEmailStorageKey);
    }

    if (cooldownUntil && cooldownUntil > Date.now()) {
      localStorage.setItem(cooldownUntilStorageKey, String(cooldownUntil));
    } else {
      localStorage.removeItem(cooldownUntilStorageKey);
    }
  }

  private extractThrottleSeconds(err: any): number | null {
    const retryAfterHeader = err?.headers?.get?.('Retry-After') ?? err?.headers?.get?.('retry-after');
    if (retryAfterHeader) {
      const retryAfterSeconds = Number(retryAfterHeader);
      if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return Math.ceil(retryAfterSeconds);
      }
      const retryAt = Date.parse(retryAfterHeader);
      if (Number.isFinite(retryAt)) {
        const remainingSeconds = Math.ceil((retryAt - Date.now()) / 1000);
        if (remainingSeconds > 0) {
          return remainingSeconds;
        }
      }
    }

    const waitValue = Number(err?.error?.wait ?? err?.error?.error?.wait);
    if (Number.isFinite(waitValue) && waitValue > 0) {
      return Math.ceil(waitValue);
    }

    const detail = String(err?.error?.detail ?? '');
    const match = detail.match(/Expected available in (\d+) seconds?/i);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds;
      }
    }
    return null;
  }

  private clearLegacyPendingVerificationState() {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(this.verifyPendingEmailStorageKeyLegacy);
    localStorage.removeItem(this.verifyCooldownUntilStorageKeyLegacy);
  }

  private getVerifyPendingEmailStorageKey(): string | null {
    if (typeof window === 'undefined' || !this.profileUserId) {
      return null;
    }
    return `${this.verifyPendingEmailStorageKeyLegacy}.${this.profileUserId}`;
  }

  private getVerifyCooldownUntilStorageKey(): string | null {
    if (typeof window === 'undefined' || !this.profileUserId) {
      return null;
    }
    return `${this.verifyCooldownUntilStorageKeyLegacy}.${this.profileUserId}`;
  }

  onDeleteAccount() {
    if (!confirm(this.i18n.t('acct.deleteAccountConfirm'))) {
      return;
    }
    
    this.isLoading = true;
    this.cdr.markForCheck();
    
    this.accountService.deleteAccount().subscribe({
      next: () => {
        this.isLoading = false;
        // logout() returns an Observable; it must be subscribed to actually run and redirect.
        this.authStore.logout().subscribe();
      },
      error: (err) => {
        this.isLoading = false;
        alert(this.i18n.t('acct.updateFailed') + (err.error?.detail ? ': ' + err.error.detail : ''));
        this.cdr.markForCheck();
      }
    });
  }
}
