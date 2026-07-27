import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';

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
  no_show_count?: boolean;
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
  private readonly _user = signal<UserProfile | null>(null);
  private readonly _userLoading = signal<boolean>(false);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly user = this._user.asReadonly();
  readonly userLoading = this._userLoading.asReadonly();

  constructor() {
    // Phase 1: Set isAuthenticated from persisted token on bootstrap
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        this._isAuthenticated.set(true);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'access_token' || e.key === null) {
          const token = this.getAccessToken();
          this._isAuthenticated.set(!!token);
          if (!token) {
            this._user.set(null);
          }
        }
      });
    }

    // Phase 2: When isAuthenticated flips to true (including on page load),
    // automatically fetch the user profile — /auth/me/ gates its response
    // on the access token, so the flow works the same whether the token was
    // just received from login or already sitting in localStorage.
    effect(() => {
      if (this._isAuthenticated()) {
        this.fetchUserProfile();
      }
    });
  }

  /**
   * Best-effort user profile fetch. Silently ignores network/transient
   * failures (the RetryInterceptor will handle retries, so we only guard
   * against the case where the session is truly invalid).
   */
  private fetchUserProfile(): void {
    if (this._userLoading()) {
      return; // already in flight
    }

    if (!this.getAccessToken()) {
      // Shouldn't normally happen with the effect gate, but guard against
      // transient timing where the token was cleared after the effect fired
      return;
    }

    this._userLoading.set(true);

    this.http.get<UserProfile>('/auth/me/').pipe(
      tap(profile => {
        this._user.set(profile);
        this._userLoading.set(false);
      }),
      catchError(err => {
        // A 401 here means the token is stale — clear auth to get a
        // clean slate (AuthInterceptor already tried the refresh path,
        // so if we're still getting 401 the refresh token is also gone).
        if (err.status === 401) {
          this.clearAuth();
        }
        this._userLoading.set(false);
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
    // The effect above will trigger fetchUserProfile() — no need to duplicate
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
    this._userLoading.set(false);
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