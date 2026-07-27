import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse,
  HttpBackend, HttpClient, HttpContextToken
} from '@angular/common/http';

/** Set on public endpoints (AllowAny views) so the interceptor does NOT attach
 * the Bearer token. An expired/invalid token causes SimpleJWT to raise
 * AuthenticationFailed before DRF checks permission_classes, so AllowAny views
 * would return 401 instead of serving data anonymously. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, map, finalize, shareReplay } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { AuthStore } from './auth.store';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // In-flight refresh request; concurrent 401s within this tab share the same
  // observable so the one-time-use refresh token is not sent to /auth/refresh/ twice
  private refreshInProgress$: Observable<string> | null = null;

  // Use HttpBackend directly for the token-refresh flow so we don't create a
  // circular dependency: AuthInterceptor → HttpClient → HTTP_INTERCEPTORS → AuthInterceptor.
  // HttpBackend is the raw XHR/fetch layer; it skips the entire interceptor chain.
  private http: HttpClient;

  /** Deduplicate the /auth/refresh/ call (one-time-use refresh token). */
  private readonly refreshBackendUrl = `${environment.backendUrl}/auth/refresh/`;

  constructor(
    private authStore: AuthStore,
    backend: HttpBackend,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.http = new HttpClient(backend);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Requests to other origins (e.g. CFEdgeChat) carry their own,
    // separately-scoped bearer token set by the caller — attaching or
    // refreshing the Django JWT for them would just clobber it.
    if (!request.url.startsWith(environment.backendUrl)) {
      return next.handle(request);
    }

    const isAuthEndpoint = this.isAuthEndpoint(request.url);

    const skipAuth = request.context.get(SKIP_AUTH);
    if (isPlatformBrowser(this.platformId) && !isAuthEndpoint && !skipAuth) {
      const token = this.authStore.getAccessToken();
      if (token) {
        request = this.addToken(request, token);
      }
    }

    const shouldHandle401 = !isAuthEndpoint && !skipAuth;

    return next.handle(request).pipe(
      catchError(error => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          shouldHandle401 &&
          isPlatformBrowser(this.platformId)
        ) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/token/') ||
           url.includes('/auth/register/') ||
           url.includes('/auth/refresh/');
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Another tab may have already rotated the tokens: if the access token in
    // localStorage differs from the one this request used, retry with the new
    // token instead of refreshing again
    const usedToken = request.headers.get('Authorization')?.replace('Bearer ', '') ?? null;
    const currentToken = this.authStore.getAccessToken();
    if (currentToken && currentToken !== usedToken) {
      return next.handle(this.addToken(request, currentToken)).pipe(
        catchError(err => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            return this.refreshAndRetry(request, next);
          }
          return throwError(() => err);
        })
      );
    }

    return this.refreshAndRetry(request, next);
  }

  private refreshAndRetry(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.refreshAccessToken().pipe(
      switchMap(access => next.handle(this.addToken(request, access))),
      catchError(err => {
        // Refresh definitively failed and local auth was cleared (e.g. stale
        // tokens for a deleted account): retry once anonymously so public
        // endpoints keep working instead of dying with the bad token
        if (
          err instanceof HttpErrorResponse &&
          (err.status === 401 || err.status === 403) &&
          !this.authStore.getAccessToken()
        ) {
          return next.handle(request.clone({ headers: request.headers.delete('Authorization') }));
        }
        return throwError(() => err);
      })
    );
  }

  private refreshAccessToken(): Observable<string> {
    if (!this.refreshInProgress$) {
      const refreshToken = this.authStore.getRefreshToken();
      if (!refreshToken) {
        this.authStore.clearAuth();
        return throwError(() => new Error('No refresh token available'));
      }

      this.refreshInProgress$ = this.http.post<any>(this.refreshBackendUrl, { refresh: refreshToken }).pipe(
        map(tokens => {
          this.authStore.setAuth(tokens);
          return tokens.access as string;
        }),
        catchError(err => {
          const isAuthFailure = err instanceof HttpErrorResponse &&
                                (err.status === 401 || err.status === 403);
          if (isAuthFailure) {
            // The refresh token may have been revoked because another tab
            // rotated it first: if that tab already stored new tokens in
            // localStorage, adopt them instead of logging out
            const latestRefresh = this.authStore.getRefreshToken();
            const latestAccess = this.authStore.getAccessToken();
            if (latestRefresh && latestRefresh !== refreshToken && latestAccess) {
              return of(latestAccess);
            }
            this.authStore.clearAuth();
          }
          // Transient failures (e.g. network errors, status 0) keep the tokens
          // so a later request can trigger another refresh
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshInProgress$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.refreshInProgress$;
  }
}
