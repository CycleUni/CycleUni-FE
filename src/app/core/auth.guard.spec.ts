import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, accountIndexGuard } from './auth.guard';
import { AuthStore } from './auth.store';
import { RegionService } from './region.service';
import { AccountIndexComponent } from '../features/account/account-index.component';

describe('Auth Guards & Account Routing', () => {
  let mockAuthStore: any;
  let mockRegionService: any;
  let router: Router;

  beforeEach(() => {
    mockAuthStore = { isLoggedIn: vi.fn() };
    mockRegionService = { region: vi.fn(() => 'tw') };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: RegionService, useValue: mockRegionService }
      ]
    });
    router = TestBed.inject(Router);
  });

  describe('accountIndexGuard', () => {
    it('redirects to /tw/account/listings when logged in and region is tw', () => {
      mockAuthStore.isLoggedIn.mockReturnValue(true);
      mockRegionService.region.mockReturnValue('tw');
      const result = TestBed.runInInjectionContext(() => accountIndexGuard({} as any, {} as any)) as UrlTree;
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/tw/account/listings');
    });

    it('redirects to /hk/account/listings when logged in and region is hk', () => {
      mockAuthStore.isLoggedIn.mockReturnValue(true);
      mockRegionService.region.mockReturnValue('hk');
      const result = TestBed.runInInjectionContext(() => accountIndexGuard({} as any, {} as any)) as UrlTree;
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/hk/account/listings');
    });

    it('returns true (no redirect) when not logged in', () => {
      mockAuthStore.isLoggedIn.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => accountIndexGuard({} as any, {} as any));
      expect(result).toBe(true);
    });
  });

  describe('authGuard', () => {
    it('redirects to /tw/account with returnUrl when not logged in', () => {
      mockAuthStore.isLoggedIn.mockReturnValue(false);
      mockRegionService.region.mockReturnValue('tw');
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/some/protected/route' } as any)) as UrlTree;
      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/tw/account?returnUrl=%2Fsome%2Fprotected%2Froute');
    });
  });

  describe('AccountIndexComponent', () => {
    it('redirects to /tw/account/listings on init (prevents blank screen)', () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
      mockRegionService.region.mockReturnValue('tw');
      const component = TestBed.runInInjectionContext(() => new AccountIndexComponent());
      component.ngOnInit();
      expect(navigateSpy).toHaveBeenCalledWith(['/tw/account/listings'], { replaceUrl: true });
    });
  });
});
