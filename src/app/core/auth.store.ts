import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  // Private writable signals; only this store's own methods (setAuth/clearAuth/login...)
  // may write to them, so external consumers can't call .set()/.update() and desync
  // state from localStorage.
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _user = signal<any | null>(null);

  // Exposed as read-only; writes must go through the store's own methods.
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly user = this._user.asReadonly();

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        this._isAuthenticated.set(true);
      }
    }
    if (typeof window !== 'undefined') {
      // Cross-tab sync: storage events notify this tab when another tab logs
      // in, logs out, or rotates tokens (e.key === null means localStorage.clear())
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'access_token' || e.key === null) {
          const token = this.getAccessToken();
          this._isAuthenticated.set(!!token);
          if (!token) {
            // Known limitation: when another tab logs in, this tab only learns
            // that a token now exists — it can't recover `user` (never persisted
            // to localStorage). Needs a fresh login, or an /auth/me call later,
            // to fully resync.
            this._user.set(null);
          }
        }
      });
    }
  }

  setAuth(data: { access: string; refresh?: string }) {
    if (typeof localStorage !== 'undefined') {
      // Safari private browsing (or a full storage quota) makes setItem throw;
      // keep the in-memory auth state valid even if persistence fails, so the
      // login flow doesn't break outright.
      try {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
      } catch (err) {
        console.error('Failed to persist auth tokens to localStorage', err);
      }
    }
    this._isAuthenticated.set(true);
    // In a real app, we might decode the JWT or fetch user profile here
  }

  private router = inject(Router);

  clearAuth() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } catch (err) {
        console.error('Failed to clear auth tokens from localStorage', err);
      }
    }
    this._isAuthenticated.set(false);
    this._user.set(null);
    this.router.navigate(['/account']);
  }

  getAccessToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  isLoggedIn() {
    return this.isAuthenticated();
  }

  getUser() {
    return this.user();
  }

  private http = inject(HttpClient);

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>('/auth/token/', { email, password }).pipe(
      tap(response => {
        if (response.access && response.refresh) {
          this.setAuth(response);
          this._user.set({ email }); // Store the email only; decoding the JWT is a possible follow-up
        }
      })
    );
  }
  getAuthConfig(): Observable<any> {
    return this.http.get<any>('/auth/config/');
  }

  loginWithGoogle(credential: string): Observable<any> {
    return this.http.post<any>('/auth/google/', { credential }).pipe(
      tap(response => {
        if (response.access && response.refresh) {
          this.setAuth(response);
          // Check for user ID from response
          if (response.user_id) {
            this._user.set({ id: response.user_id, is_verified: response.user?.is_verified });
          }
        }
      })
    );
  }

  register(email: string, password: string, firstName: string, lastName: string): Observable<any> {
    return this.http.post<any>('/auth/register/', {
      email,
      password,
      first_name: firstName,
      last_name: lastName
    });
  }

  requestEduVerification(eduEmail: string): Observable<any> {
    return this.http.post<any>('/auth/verify/request/', { edu_email: eduEmail });
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post<any>('/auth/verify/', { token });
  }

  // Unlike verifyEmail (edu-email binding, run from an already-logged-in
  // session), the caller here has no session yet — the backend issues JWTs
  // directly on success, so this logs them in as part of verifying.
  verifyRegistration(token: string): Observable<any> {
    return this.http.post<any>('/auth/verify-registration/', { token }).pipe(
      tap(response => {
        if (response.access && response.refresh) {
          this.setAuth(response);
        }
      })
    );
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>('/auth/password/reset/request/', { email });
  }

  // No auto-login on success — a password reset also revokes every existing
  // session (see accounts.views.ConfirmPasswordResetView), so signing back
  // in fresh with the new password is the expected next step, not a bug.
  confirmPasswordReset(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>('/auth/password/reset/confirm/', { token, new_password: newPassword });
  }

  logout(): Observable<any> {
    // Call the backend logout API to revoke the refresh token.
    // Local state is cleared whether the call succeeds or fails, and callers
    // can subscribe to react to completion (e.g. navigate after logout).
    const refresh = this.getRefreshToken();
    if (refresh) {
      return this.http.post('/auth/logout/', { refresh }).pipe(
        tap({
          next: () => this.clearAuth(),
          error: () => this.clearAuth()
        }),
        catchError(() => of(null))
      );
    }
    this.clearAuth();
    return of(null);
  }
}
