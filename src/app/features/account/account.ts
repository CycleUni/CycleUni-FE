import { Component, inject, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { FormsModule } from '@angular/forms';

import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';
import { OrderService } from '../../core/services/order.service';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { I18nService, TPipe } from '../../core/i18n.service';
import { ThemeService } from '../../core/services/theme.service';

import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiButton, UiInput, TPipe],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
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
  hasUnreadOrders = false;

  firstName = '';
  lastName = '';
  displayName = '';
  eduEmail = '';
  schoolName = '';
  verifiedAt: string | null = null;
  avatarUrl = '';
  showConfirmUnbindModal = false;

  // Profile-card stats line — sourced from the same /auth/me/ payload
  // loadProfile() already fetches, so these reflect real counts rather
  // than invented placeholders. Listing counts are derived from the
  // (paginated, first-page) `myListings.results` status field, so they
  // may undercount for accounts with 20+ listings; subscription count
  // comes from the unpaginated `mySubscriptions` list and is exact.
  activeListingsCount = 0;
  soldListingsCount = 0;
  subscriptionsCount = 0;

  private accountService = inject(AccountService);
  private googleAuth = inject(GoogleAuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private theme = inject(ThemeService);
  private langEffectRef: any = null;
  private profileLoaded = false;
  returnUrl: string | null = null;

  constructor(public auth: AuthStore) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    // Reload the profile when the language changes so localized fields
    // (e.g. the school name) come back in the new language
    this.langEffectRef = effect(() => {
      this.i18n.lang();
      // resolved(), not mode(): in 'system' mode the OS flipping light/dark
      // never changes mode(), so the button would keep its stale variant.
      this.theme.resolved(); // Track theme changes to re-render Google button
      if (this.auth.isLoggedIn()) {
        this.loadProfile();
        this.profileLoaded = true;
      } else {
        this.profileLoaded = false;
        setTimeout(() => this.googleAuth.renderButton('google-btn'), 0);
      }
    });

    this.orderService.unreadOrders$.subscribe(unread => {
      this.hasUnreadOrders = unread;
      this.cdr.markForCheck();
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
        const listingResults = data.myListings?.results || [];
        this.activeListingsCount = listingResults.filter((l: any) => l.status === 'active').length;
        this.soldListingsCount = listingResults.filter((l: any) => l.status === 'sold').length;
        this.subscriptionsCount = (data.mySubscriptions || []).length;
        this.orderService.checkUnreadOrders(String(data.id), data.last_seen_bought_orders_at, data.last_seen_sold_orders_at);
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
        this.router.navigateByUrl(this.returnUrl || '/account/listings');
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

