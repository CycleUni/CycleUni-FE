import { Injectable, inject, signal, PLATFORM_ID, TransferState, makeStateKey, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay, tap, of } from 'rxjs';
import { I18nService } from '../i18n.service';
import { AuthStore } from '../auth.store';

export interface UserProfile {
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
export class AccountService {
  private http = inject(HttpClient);

  readonly profileCache = signal<UserProfile | null>(null);
  private profileLoading = signal(false);
  private profileRequest: Observable<UserProfile> | null = null;
  private i18n = inject(I18nService);

  private authStore = inject(AuthStore);

  constructor() {
    effect(() => {
      this.i18n.lang();
      this.clearProfileCache();
    });
    effect(() => {
      // Clear cache whenever auth state changes to logged out
      // (or when a new login occurs, but logged out is sufficient if they log out first)
      if (!this.authStore.isAuthenticated()) {
        this.clearProfileCache();
      }
    });
  }

  getMyProfile(page: number = 1, q: string = ''): Observable<any> {
    const cached = this.profileCache();
    if (cached && page === 1 && !q) {
      return new Observable(subscriber => {
        subscriber.next(cached);
        subscriber.complete();
      });
    }

    if (this.profileLoading() && this.profileRequest && page === 1 && !q) {
      return this.profileRequest;
    }

    if (!q) this.profileLoading.set(true);
    let params = new HttpParams().set('page', page.toString());
    if (q) {
      params = params.set('q', q);
    }
    const req = this.http.get<any>('/auth/me/', { params }).pipe(
      tap(profile => {
        if (page === 1 && !q) {
          this.profileCache.set(profile);
          this.profileLoading.set(false);
          this.profileRequest = null;
        }
      }),
      shareReplay(1)
    );

    if (!q) this.profileRequest = req;
    return req;
  }

  clearProfileCache() {
    this.profileCache.set(null);
    this.profileLoading.set(false);
    this.profileRequest = null;
  }

  updateProfile(data: { first_name?: string, last_name?: string, email?: string }): Observable<any> {
    return this.http.patch<any>('/auth/me/', data).pipe(
      tap(profile => this.profileCache.set(profile))
    );
  }

  changePassword(data: { old_password?: string, new_password?: string }): Observable<any> {
    return this.http.post<any>('/auth/password/', data);
  }

  requestEduVerification(eduEmail: string): Observable<any> {
    return this.http.post<any>('/auth/verify/request/', { edu_email: eduEmail });
  }

  autoVerifyEduEmail(): Observable<any> {
    return this.http.post<any>('/auth/verify/auto/', {}).pipe(
      tap(() => this.profileCache.set(null))
    );
  }

  private transferState = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  getPublicUserProfile(userId: string): Observable<any> {
    const key = makeStateKey<any>(`user_profile_${userId}`);
    if (this.transferState.hasKey(key)) {
      const data = this.transferState.get(key, null);
      // Remove it so subsequent client-side navigations fetch fresh data
      this.transferState.remove(key);
      return of(data);
    }
    return this.http.get<any>(`/auth/users/${userId}/`).pipe(
      tap(data => {
        if (!isPlatformBrowser(this.platformId)) {
          this.transferState.set(key, data);
        }
      })
    );
  }

  unbindEduEmail(): Observable<any> {
    return this.http.post<any>('/auth/verify/unbind/', {}).pipe(
      tap(() => this.profileCache.update(p => p ? { ...p, edu_email: '', verified_at: null } : null))
    );
  }

  unsubscribe(subscriptionId: string): Observable<any> {
    return this.http.delete(`/subscriptions/${subscriptionId}/`);
  }

  unsubscribeAll(): Observable<any> {
    return this.http.delete('/subscriptions/');
  }

  getMySubscriptions(): Observable<any[]> {
    return this.http.get<any[]>('/subscriptions/');
  }

  deleteAccount(): Observable<any> {
    return this.http.delete<any>('/auth/me/');
  }
}
