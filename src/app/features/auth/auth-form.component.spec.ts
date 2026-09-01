import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthFormComponent } from './auth-form.component';
import { AuthStore } from '../../core/auth.store';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { I18nService } from '../../core/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { RegionService } from '../../core/region.service';

/** The only keys the i18n double "knows". Everything else resolves to null,
 *  standing in for a backend error code no locale declares. */
const KNOWN_KEYS: Record<string, string> = {
  'auth.errInvalidCredentials': '信箱或密碼錯誤',
};

describe('AuthFormComponent', () => {
  let fixture: ComponentFixture<AuthFormComponent>;
  let component: AuthFormComponent;
  let mockAuth: any;
  let mockGoogle: any;
  let mockRouter: any;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let queryParams: Record<string, string>;

  const build = (mode: 'login' | 'register') => {
    fixture = TestBed.createComponent(AuthFormComponent);
    component = fixture.componentInstance;
    component.mode = mode;
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    isAuthenticated = signal(false);
    queryParams = {};
    mockAuth = {
      isAuthenticated,
      isLoggedIn: () => isAuthenticated(),
      login: vi.fn().mockReturnValue(of({})),
      register: vi.fn().mockReturnValue(of({}))
    };
    mockGoogle = { renderButton: vi.fn() };
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
      getCurrentNavigation: vi.fn().mockReturnValue(null),
      // RouterLink inside RegionLinkDirective only needs these to build hrefs.
      createUrlTree: vi.fn().mockReturnValue({}),
      serializeUrl: vi.fn().mockReturnValue('/'),
      events: of()
    };

    TestBed.configureTestingModule({
      imports: [AuthFormComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuth },
        { provide: GoogleAuthService, useValue: mockGoogle },
        { provide: Router, useValue: mockRouter },
        { provide: RegionService, useValue: { region: () => 'tw' } },
        // tOrNull mirrors the service: null for anything this double does not
        // "translate", which is what tells a real error code from one no locale
        // declares. Returning the key here instead would hide the guard.
        {
          provide: I18nService,
          useValue: {
            t: (k: string) => k,
            tOrNull: (k: unknown) => (typeof k === 'string' && k in KNOWN_KEYS ? KNOWN_KEYS[k] : null),
            lang: signal('zh-TW'),
          },
        },
        { provide: ThemeService, useValue: { resolved: signal('light'), mode: signal('system') } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } }
        }
      ]
    });
  });

  it('renders the login form with the Google button container', () => {
    build('login');
    expect(fixture.nativeElement.querySelector('#google-btn')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('auth.studentLogin');
  });

  it('renders the register form and no Google container', () => {
    build('register');
    expect(fixture.nativeElement.querySelector('#google-btn')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('auth.registerTitle');
  });

  it('asks the Google SDK to render its button on the login page only', async () => {
    build('login');
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoogle.renderButton).toHaveBeenCalledWith('google-btn');

    mockGoogle.renderButton.mockClear();
    build('register');
    await new Promise(r => setTimeout(r, 0));
    expect(mockGoogle.renderButton).not.toHaveBeenCalled();
  });

  it('leaves for /account once signed in, replacing the auth page in history', () => {
    build('login');
    component.email = 'me@example.com';
    component.password = 'secret';
    component.onLogin();
    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/', 'tw', 'account'], { replaceUrl: true });
  });

  it('returns to returnUrl after signing in', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/tw/listing/42' }) } }
    });
    build('login');
    expect(component.returnUrl).toBe('/tw/listing/42');

    component.email = 'me@example.com';
    component.password = 'secret';
    component.onLogin();
    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/tw/listing/42', { replaceUrl: true });
  });

  it('keeps a failed login on the page and shows the error', () => {
    mockAuth.login.mockReturnValue(throwError(() => ({ error: { error: { code: 'auth.errInvalidCredentials' } } })));
    build('login');
    component.email = 'me@example.com';
    component.password = 'wrong';
    component.onLogin();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(component.authIsError).toBe(true);
    expect(component.authMessage).toBe('信箱或密碼錯誤');
  });

  it('falls back rather than showing a backend code no locale declares', () => {
    // This used to assert the opposite — that the raw code reached the screen —
    // and the code it used, auth.errBadCredentials, is declared in no locale.
    // The test was holding the defect in place.
    mockAuth.login.mockReturnValue(throwError(() => ({ error: { error: { code: 'auth.errSomethingNewFromTheBackend' } } })));
    build('login');
    component.email = 'me@example.com';
    component.password = 'wrong';
    component.onLogin();

    expect(component.authIsError).toBe(true);
    expect(component.authMessage).toBe('auth.errLoginFailed');
    expect(component.authMessage).not.toContain('SomethingNew');
  });

  it('does not submit a login with empty fields', () => {
    build('login');
    component.onLogin();
    expect(mockAuth.login).not.toHaveBeenCalled();
    expect(component.authMessage).toBe('auth.errFillEmailPassword');
  });

  it('sends a successful sign-up to /login with the address prefilled, not straight in', () => {
    build('register');
    component.registerEmail = 'new@example.com';
    component.registerPassword = 'secret123';
    component.registerConfirmPassword = 'secret123';
    component.registerFirstName = 'A';
    component.registerLastName = 'B';
    component.onRegister();

    expect(mockAuth.register).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/', 'tw', 'login'],
      expect.objectContaining({
        state: { registeredEmail: 'new@example.com', registeredNotice: 'auth.registerSuccess' }
      })
    );
  });

  it('refuses a sign-up whose two passwords differ', () => {
    build('register');
    component.registerEmail = 'new@example.com';
    component.registerPassword = 'secret123';
    component.registerConfirmPassword = 'secret124';
    component.registerFirstName = 'A';
    component.registerLastName = 'B';
    component.onRegister();

    expect(mockAuth.register).not.toHaveBeenCalled();
    expect(component.authMessage).toBe('auth.errPasswordMismatch');
  });

  it('picks up the prefill and notice handed over by /register', () => {
    mockRouter.getCurrentNavigation.mockReturnValue({
      extras: { state: { registeredEmail: 'new@example.com', registeredNotice: 'auth.registerSuccess' } }
    });
    build('login');

    expect(component.email).toBe('new@example.com');
    expect(component.authMessage).toBe('auth.registerSuccess');
    expect(component.authIsError).toBe(false);
  });

  it('ignores that handoff on the register page itself', () => {
    mockRouter.getCurrentNavigation.mockReturnValue({
      extras: { state: { registeredEmail: 'new@example.com', registeredNotice: 'auth.registerSuccess' } }
    });
    build('register');

    expect(component.email).toBe('');
    expect(component.authMessage).toBe('');
  });
});
