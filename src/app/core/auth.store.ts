import { Injectable, Injector, signal, inject, untracked, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { GoogleAnalyticsService } from './services/google-analytics.service';

export interface AuthUser {
  id: string | number;
  email: string;
  edu_email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  school?: string | number | null;
  school_name?: string;
  is_active?: boolean;
  verified_at?: string | null;
  average_rating?: number;
  review_count?: number;
  no_show_count?: number;
  has_password?: boolean;
  avatar_url?: string;
  is_google_linked?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _user = signal<AuthUser | null>(null);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly user = this._user.asReadonly();

  private fetchedForToken: string | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        this._isAuthenticated.set(true);
        // Bootstrap: fetch profile once when the page initialises with a
        // persisted token. Deferred via setTimeout to break the construction
        // cycle — AuthStore → HttpClient → HTTP_INTERCEPTORS → AuthInterceptor
        // → AuthStore. Waiting one microtask lets all providers finish.
        // Wrapped in runInInjectionContext: this fires as an independent
        // macrotask that can land in the same browser task turn as the
        // router's initial (possibly lazy-loaded) route resolution, and
        // without an explicit context the nested first-time DI resolution
        // inside fetchUserProfile() (HttpClient + interceptors) can race
        // Angular's internal "current injector" tracking and throw NG0203.
        setTimeout(() => runInInjectionContext(this.injector, () => untracked(() => this.fetchUserProfile())), 0);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'access_token' || e.key === null) {
          const token = this.getAccessToken();
          this._isAuthenticated.set(!!token);
          if (!token) {
            this._user.set(null);
            this.fetchedForToken = null;
          } else if (token !== this.fetchedForToken) {
            untracked(() => this.fetchUserProfile());
          }
        }
      });
    }
  }

  /**
   * Best-effort profile fetch.  Idempotent: if the current access token
   * exactly matches the one we already fetched we skip the call.
   */
  private fetchUserProfile(): void {
    const token = this.getAccessToken();
    if (!token) return;
    if (token === this.fetchedForToken && this._user()) return;

    this.fetchedForToken = token;

    this.http.get<AuthUser>('/auth/me/').pipe(
      tap(profile => {
        this._user.set(profile);
        // Identify user in GA4 for User Explorer & cross-device reports
        this.ga.setUserId(profile.id);
        this.ga.setUserProperties({
          school:      profile.school_name ?? null,
          is_verified: !!profile.verified_at,
          role:        null   // enriched later if needed
        });
      }),
      catchError(err => {
        if (err.status === 401) {
          this.clearAuth();
        } else {
          // A 5xx here leaves the user logged in with an empty profile and no
          // visible symptom, which is very hard to diagnose from the UI alone.
          console.error('Failed to load user profile from /auth/me/', err?.status, err);
        }
        // Clear dedup flag so a later login/sign-in can retry
        this.fetchedForToken = null;
        return of(null);
      })
    ).subscribe();
  }

  setAuth(data: { access: string; refresh?: string }) {
    if (typeof localStorage !== 'undefined') {
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
    // Fetch the profile immediately (not via an effect) so the UI can show
    // the user name without waiting for a second change-detection cycle.
    untracked(() => this.fetchUserProfile());
  }

  private router = inject(Router);
  private injector = inject(Injector);
  private ga = inject(GoogleAnalyticsService);

  // Lazy HttpClient: avoids circular dependency with HTTP_INTERCEPTORS.
  // AuthInterceptor → AuthStore → HttpClient → HTTP_INTERCEPTORS → AuthInterceptor
  // would be a cycle if we injected HttpClient directly in the constructor;
  // resolving it lazily via Injector lets all interceptors finish initialising
  // before the first HTTP call actually needs HttpClient.
  private _http: HttpClient | null = null;
  private get http(): HttpClient {
    if (!this._http) {
      this._http = this.injector.get(HttpClient);
    }
    return this._http;
  }

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
    this.fetchedForToken = null;
    // Clear GA4 user identity on logout
    this.ga.setUserId(null);
    this.ga.clearUserProperties();
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

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>('/auth/token/', { email, password }).pipe(
      tap(response => {
        if (response.access && response.refresh) {
          this.setAuth(response);
          this.ga.trackLogin('Password');
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
          this.ga.trackLogin('Google');
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
    }).pipe(
      tap(() => {
        this.ga.trackSignUp('Email');
      })
    );
  }

  requestEduVerification(eduEmail: string): Observable<any> {
    return this.http.post<any>('/auth/verify/request/', { edu_email: eduEmail }).pipe(
      tap(() => {
        this.ga.trackEduVerificationRequest();
      })
    );
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post<any>('/auth/verify/', { token });
  }

  verifyRegistration(token: string): Observable<any> {
    return this.http.post<any>('/auth/verify-registration/', { token }).pipe(
      tap(response => {
        if (response.access && response.refresh) {
          this.setAuth(response);
          this.ga.trackEvent('sign_up_verified');
        }
      })
    );
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>('/auth/password/reset/request/', { email });
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>('/auth/password/reset/confirm/', { token, new_password: newPassword });
  }

  logout(): Observable<any> {
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