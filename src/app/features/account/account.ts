import { Component, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { FormsModule } from '@angular/forms';

import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { I18nService, TPipe } from '../../core/i18n.service';

import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiButton, UiInput, TPipe],
  template: `
      <div class="container" *ngIf="!auth.isLoggedIn()">
        <div class="auth-box">

          <ng-container *ngIf="authMode === 'login'">
            <h2>{{ 'auth.studentLogin' | t }}</h2>
            <p class="auth-hint">{{ 'auth.welcomeBack' | t }}</p>

            <div class="form-group">
              <label>{{ 'auth.emailLabel' | t }}</label>
              <ui-input placeholder="your.email@example.com" [(ngModel)]="email" style="width: 100%;"></ui-input>
            </div>

            <div class="form-group">
              <label>{{ 'auth.passwordLabel' | t }}</label>
              <ui-input type="password" [placeholder]="'auth.passwordPlaceholder' | t" [(ngModel)]="password" style="width: 100%;"></ui-input>
              <a routerLink="/forgot-password" class="forgot-password-link">{{ 'auth.forgotPassword' | t }}</a>
            </div>

            <ui-button style="width: 100%; margin-top: 16px;" (onClick)="onLogin()" [disabled]="isLoading">
              {{ (isLoading ? 'auth.loggingIn' : 'auth.login') | t }}
            </ui-button>
            
            <div id="google-btn" style="margin-top: 16px; display: flex; justify-content: center;"></div>
            
            <div class="auth-toggle">
              {{ 'auth.noAccount' | t }}<a href="javascript:void(0)" (click)="authMode = 'register'">{{ 'auth.clickToRegister' | t }}</a>
            </div>

            <div *ngIf="authMode === 'login' && authMessage" class="inline-msg" [class.error]="authIsError" style="margin-top: 16px; font-size: 14px;">
              {{ authMessage }}
            </div>

            <div class="auth-note">
              {{ 'auth.agreeLogin' | t }}<a href="javascript:void(0)">{{ 'footer.tos' | t }}</a>{{ 'auth.and' | t }}<a href="javascript:void(0)">{{ 'footer.privacy' | t }}</a>{{ 'auth.period' | t }}
            </div>
          </ng-container>

          <ng-container *ngIf="authMode === 'register'">
            <h2>{{ 'auth.registerTitle' | t }}</h2>
            <p class="auth-hint">{{ 'auth.registerHint' | t }}</p>

            <div class="form-group" style="display: flex; gap: 16px;">
              <div style="flex: 1;">
                <label>{{ 'auth.lastNameLabel' | t }}</label>
                <ui-input [placeholder]="'auth.lastNamePlaceholder' | t" [(ngModel)]="registerLastName" style="width: 100%;"></ui-input>
              </div>
              <div style="flex: 1;">
                <label>{{ 'auth.firstNameLabel' | t }}</label>
                <ui-input [placeholder]="'auth.firstNamePlaceholder' | t" [(ngModel)]="registerFirstName" style="width: 100%;"></ui-input>
              </div>
            </div>
            <p class="field-hint" style="margin-bottom: 16px;">{{ 'auth.nameHint' | t }}</p>

            <div class="form-group">
              <label>{{ 'auth.registerEmailLabel' | t }}</label>
              <ui-input placeholder="your.email@example.com" [(ngModel)]="registerEmail" style="width: 100%;"></ui-input>
            </div>

            <div class="form-group">
              <label>{{ 'auth.setPasswordLabel' | t }}</label>
              <ui-input type="password" [placeholder]="'auth.passwordMin' | t" [(ngModel)]="registerPassword" style="width: 100%;"></ui-input>
            </div>

            <div class="form-group">
              <label>{{ 'auth.confirmPasswordLabel' | t }}</label>
              <ui-input type="password" [placeholder]="'auth.confirmPlaceholder' | t" [(ngModel)]="registerConfirmPassword" style="width: 100%;"></ui-input>
            </div>

            <ui-button style="width: 100%; margin-top: 16px;" (onClick)="onRegister()" [disabled]="isLoading">
              {{ (isLoading ? 'auth.registering' : 'auth.register') | t }}
            </ui-button>

            <div class="auth-toggle">
              {{ 'auth.hasAccount' | t }}<a href="javascript:void(0)" (click)="authMode = 'login'">{{ 'auth.backToLogin' | t }}</a>
            </div>

            <div *ngIf="authMode === 'register' && authMessage" class="inline-msg" [class.error]="authIsError" style="margin-top: 16px; font-size: 14px;">
              {{ authMessage }}
            </div>

            <div class="auth-note">
              {{ 'auth.agreeRegister' | t }}<a href="javascript:void(0)">{{ 'footer.tos' | t }}</a>{{ 'auth.and' | t }}<a href="javascript:void(0)">{{ 'footer.privacy' | t }}</a>{{ 'auth.period' | t }}
            </div>
          </ng-container>
        </div>
      </div>

      <div class="dashboard" *ngIf="auth.isLoggedIn()">
        <aside class="dashboard-sidebar">
          <div class="profile-card">
            <div class="avatar" *ngIf="!avatarUrl">{{ getAvatarInitial() }}</div>
            <div class="avatar-image-container" *ngIf="avatarUrl">
              <img [src]="avatarUrl" alt="Avatar" class="avatar-image" referrerpolicy="no-referrer">
            </div>
            <h3>{{ displayName || ('acct.defaultUser' | t) }}</h3>
            <p class="school-name">{{ schoolName || ('acct.noSchool' | t) }}</p>
            <p class="email">{{ auth.getUser()?.email }}</p>
            <ui-button variant="white" style="width: 100%; margin-top: 16px;" (onClick)="doLogout()">{{ 'acct.logout' | t }}</ui-button>
          </div>

          <nav class="dashboard-nav">
            <a routerLink="/account/listings" routerLinkActive="active">{{ 'acct.tabListings' | t }}</a>
            <a routerLink="/account/subscriptions" routerLinkActive="active">{{ 'acct.tabSubs' | t }}</a>
            <a routerLink="/account/orders" routerLinkActive="active">{{ 'acct.myOrders' | t }}</a>
            <a routerLink="/account/settings" routerLinkActive="active">{{ 'acct.tabSettings' | t }}</a>
          </nav>
        </aside>

        <main class="dashboard-content">
          <router-outlet></router-outlet>
        </main>
      </div>
  `,
  styles: [`
    .container {
      display: flex;
      justify-content: center;
      padding: 64px 16px;
    }
    .auth-box {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background-color: var(--paper);
    }
    .auth-box h2 {
      margin-top: 0;
      margin-bottom: 8px;
      text-align: center;
    }

    .field-hint {
      font-size: 12px;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .auth-toggle {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      color: var(--ink);
    }
    .auth-toggle a {
      color: var(--accent);
      font-weight: 500;
      text-decoration: none;
    }
    .auth-toggle a:hover {
      text-decoration: underline;
    }
    .auth-hint {
      color: var(--muted);
      font-size: 14px;
      text-align: center;
      margin-bottom: 24px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .forgot-password-link {
      display: inline-block;
      margin-top: 8px;
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
    }
    .forgot-password-link:hover {
      text-decoration: underline;
    }
    .auth-note {
      font-size: 12px;
      color: var(--muted);
      text-align: center;
      margin-top: 24px;
    }
    .auth-note a {
      color: var(--accent);
      text-decoration: none;
    }

    .dashboard {
      max-width: 1120px;
      margin: 32px auto;
      padding: 0 16px;
      display: flex;
      gap: 48px;
    }
    .dashboard-sidebar {
      width: 280px;
      flex-shrink: 0;
    }
    .profile-card {
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 4px;
      text-align: center;
      margin-bottom: 24px;
      background-color: var(--paper-warm);
    }
    .manual-book-edit {
      background-color: var(--paper-warm);
    }
    .delete-photo-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--flag);
      color: white;
      border: none;
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .delete-photo-btn:hover {
      opacity: 0.9;
    }
    .avatar {
      width: 64px;
      height: 64px;
      background-color: var(--accent);
      color: white;
      font-size: 24px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .avatar-image-container {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      border-radius: 50%;
      overflow: hidden;
    }
    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-card h3 {
      margin: 0 0 4px;
    }
    .school-name {
      font-size: 14px;
      margin: 0 0 4px;
    }
    .email {
      font-size: 14px;
      color: var(--muted);
      margin: 0;
    }

    .dashboard-nav {
      display: flex;
      flex-direction: column;
    }
    .dashboard-nav a {
      padding: 12px 16px;
      color: var(--ink);
      text-decoration: none;
      border-left: 3px solid transparent;
      font-weight: 500;
    }
    .dashboard-nav a:hover {
      background-color: var(--paper-warm);
    }
    .dashboard-nav a.active {
      border-left-color: var(--accent);
      background-color: var(--paper-warm);
    }

    .dashboard-content {
      flex: 1;
    }
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .content-header h2 {
      margin: 0;
    }

    .subscription-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid var(--line);
      margin-bottom: 16px;
      border-radius: 4px;
    }
    .sub-info h4 {
      margin: 0 0 8px;
    }
    .sub-info p {
      margin: 0;
      font-size: 14px;
      color: var(--muted);
      font-family: monospace;
    }
    .sub-status {
      font-size: 14px;
      color: var(--muted);
    }
    .sub-status.available {
      color: var(--flag);
    }

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
    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      background-color: var(--paper-warm);
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
    .edit-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    .modal-content {
      position: relative;
      background: var(--paper);
      padding: 24px;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1001;
    }

    @media (max-width: 768px) {
      .container {
        padding: 32px 16px;
      }
      .auth-box {
        padding: 24px 16px;
      }
      .dashboard {
        flex-direction: column;
        gap: 24px;
        margin: 16px auto;
      }
      .dashboard-sidebar {
        width: 100%;
      }
      .dashboard-nav {
        flex-direction: row;
        overflow-x: auto;
        border-bottom: 1px solid var(--line);
      }
      .dashboard-nav a {
        border-left: none;
        border-bottom: 3px solid transparent;
        white-space: nowrap;
        padding: 12px;
      }
      .dashboard-nav a.active {
        border-left-color: transparent;
        border-bottom-color: var(--accent);
        background-color: transparent;
      }
      .content-header {
        flex-wrap: wrap;
        gap: 12px;
      }
      .subscription-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .sub-action {
        align-self: flex-end;
      }
      .edit-modal {
        padding: 16px;
      }
    }
  `]
})
export class Account {
  private _authMode: 'login' | 'register' = 'login';
  get authMode() { return this._authMode; }
  set authMode(mode: 'login' | 'register') {
    this._authMode = mode;
    this.clientAuthError = '';
    this.lastAuthError = null;
    this.authIsError = false;
    if (mode === 'login') {
      setTimeout(() => this.googleAuth.renderButton('google-btn'), 0);
    }
  }
  email = '';
  password = '';
  registerEmail = '';
  registerPassword = '';
  registerConfirmPassword = '';
  registerFirstName = '';
  registerLastName = '';
  isLoading = false;
  activeTab = 'listings';
  clientAuthError = '';
  lastAuthError: any = null;
  lastAuthAction: 'login' | 'register' = 'login';
  
  get authMessage(): string {
    if (this.clientAuthError) return this.i18n.t(this.clientAuthError);
    if (!this.lastAuthError) return '';
    const err = this.lastAuthError;
    if (this.lastAuthAction === 'login') {
      const code = err.error?.error?.code;
      return code ? this.i18n.t(code) : (err.error?.error?.message || this.i18n.t('auth.errLoginFailed'));
    } else {
      const msg = this.i18n.t('auth.errRegisterFailed');
      let errorDetails = '';
      const fields = err.error?.error?.fields;
      if (fields) {
        if (fields.email) errorDetails += this.i18n.t('auth.errEmailField', {msg: fields.email.map((e: string) => this.i18n.t(e) === e ? e : this.i18n.t(e)).join(', ')});
        if (fields.password) errorDetails += this.i18n.t('auth.errPasswordField', {msg: fields.password.map((e: string) => this.i18n.t(e) === e ? e : this.i18n.t(e)).join(', ')});
        if (fields.first_name) errorDetails += this.i18n.t('auth.errNameField', {msg: fields.first_name.map((e: string) => this.i18n.t(e) === e ? e : this.i18n.t(e)).join(', ')});
        if (fields.last_name) errorDetails += this.i18n.t('auth.errNameField', {msg: fields.last_name.map((e: string) => this.i18n.t(e) === e ? e : this.i18n.t(e)).join(', ')});
        if (fields.non_field_errors) errorDetails += ` ${fields.non_field_errors.map((e: string) => this.i18n.t(e) === e ? e : this.i18n.t(e)).join(', ')}`;
      }
      return `${msg}${errorDetails}`;
    }
  }

  authIsError = false;

  firstName = '';
  lastName = '';
  displayName = '';
  eduEmail = '';
  schoolName = '';
  verifiedAt: string | null = null;
  avatarUrl = '';
  showConfirmUnbindModal = false;

  private accountService = inject(AccountService);
  private googleAuth = inject(GoogleAuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private langEffectRef: any = null;
  private profileLoaded = false;

  constructor(public auth: AuthStore) {
    // Reload the profile when the language changes so localized fields
    // (e.g. the school name) come back in the new language
    this.langEffectRef = effect(() => {
      this.i18n.lang();
      if (this.auth.isLoggedIn()) {
        this.loadProfile();
        this.profileLoaded = true;
      } else {
        this.profileLoaded = false;
        setTimeout(() => this.googleAuth.renderButton('google-btn'), 0);
      }
    });
  }

  ngAfterViewInit() {
    this.googleAuth.renderButton('google-btn');
  }

  getAvatarInitial(): string {
    const last = this.lastName || '';
    const first = this.firstName || '';
    if (/[A-Za-z]/.test(last) || /[A-Za-z]/.test(first)) {
      return (first.charAt(0) || last.charAt(0) || this.i18n.t('acct.avatarFallback')).toUpperCase();
    }
    return (last.charAt(0) || first.charAt(0) || this.i18n.t('acct.avatarFallback')).toUpperCase();
  }

  doLogout() {
    this.auth.logout().subscribe();
  }

  confirmUnbindEduEmail() {
    this.showConfirmUnbindModal = true;
  }

  loadProfile() {
    this.accountService.getMyProfile().subscribe({
      next: (data) => {
        this.firstName = data.first_name || '';
        this.lastName = data.last_name || '';
        this.displayName = data.display_name || '';
        this.eduEmail = data.edu_email || '';
        this.schoolName = data.school_name || '';
        this.verifiedAt = data.verified_at || null;
        this.avatarUrl = data.avatar_url || '';
        this.cdr.markForCheck(); 
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        this.cdr.markForCheck();
      }
    });
  }

  onLogin() {
    this.clientAuthError = '';
    this.lastAuthError = null;
    this.lastAuthAction = 'login';
    if (!this.email || !this.password) {
      this.clientAuthError = 'auth.errFillEmailPassword';
      this.authIsError = true;
      return;
    }
    
    this.isLoading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.authIsError = false;
        this.loadProfile();
        this.router.navigate(['/account/listings']);
      },
      error: (err) => {
        this.isLoading = false;
        this.lastAuthError = err;
        this.authIsError = true;
        this.cdr.markForCheck();
      }
    });
  }

  onRegister() {
    this.clientAuthError = '';
    this.lastAuthError = null;
    this.lastAuthAction = 'register';
    if (!this.registerEmail || !this.registerPassword || !this.registerFirstName || !this.registerLastName) {
      this.clientAuthError = 'auth.errFillAll';
      this.authIsError = true;
      return;
    }

    if (this.registerPassword !== this.registerConfirmPassword) {
      this.clientAuthError = 'auth.errPasswordMismatch';
      this.authIsError = true;
      return;
    }
    
    this.isLoading = true;
    this.auth.register(this.registerEmail, this.registerPassword, this.registerFirstName, this.registerLastName).subscribe({
      next: () => {
        // New accounts start inactive — login is blocked until the emailed
        // activation link is clicked, so there's no account to auto-login
        // into yet. Switch to the login tab with the email prefilled so
        // it's ready the moment they come back after verifying.
        this.isLoading = false;
        this.authMode = 'login';
        this.email = this.registerEmail;
        this.password = '';
        this.clientAuthError = 'auth.registerSuccess';
        this.authIsError = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.lastAuthError = err;
        this.authIsError = true;
        this.cdr.markForCheck();
      }
    });
  }
}

