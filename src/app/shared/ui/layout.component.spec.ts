import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { UiLayout } from './layout.component';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MetadataService } from '../../core/services/metadata.service';
import { AuthStore } from '../../core/auth.store';
import { AccountService } from '../../core/services/account.service';
import { SchoolStateService } from '../../core/services/school-state.service';
import { MessageService } from '../../core/services/message.service';
import { I18nService } from '../../core/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { MobileLayoutService } from '../../core/services/mobile-layout.service';

@Component({ standalone: true, template: '' })
class DummyRouteComponent {}

describe('UiLayout', () => {
  let component: UiLayout;
  let fixture: ComponentFixture<UiLayout>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiLayout],
      providers: [
        provideRouter([
          { path: '', component: DummyRouteComponent },
          { path: 'search', component: DummyRouteComponent },
          { path: 'sell', component: DummyRouteComponent },
          { path: 'account', component: DummyRouteComponent },
          { path: 'messages', component: DummyRouteComponent },
          { path: 'book/:id', component: DummyRouteComponent },
          { path: '**', component: DummyRouteComponent }
        ]),
        { provide: MetadataService, useValue: { getMetadata: () => of({ schools: [] }) } },
        { provide: AuthStore, useValue: { isAuthenticated: signal(false), user: signal(null) } },
        { provide: AccountService, useValue: {} },
        { provide: SchoolStateService, useValue: { currentSchool: '', hasInitialized: false, getManualSchool: () => null, setSchools: vi.fn(), setSchool: vi.fn(), clearManualSchool: vi.fn() } },
        { provide: MessageService, useValue: { unreadCount$: of(0), disconnectHub: vi.fn() } },
        { provide: I18nService, useValue: { t: (k: string) => k, lang: signal('zh-TW') } },
        { provide: ThemeService, useValue: { mode: signal('system'), resolved: signal('light'), setMode: vi.fn() } },
        { provide: MobileLayoutService, useValue: { hideBottomNav: signal(false), setHideBottomNav: vi.fn() } },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(UiLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the footer on home route ("/")', async () => {
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(component.showFooter).toBe(true);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.footer-tagline')).toBeTruthy();
  });

  it('shows the footer on search route ("/search")', async () => {
    await router.navigateByUrl('/search');
    fixture.detectChanges();

    expect(component.showFooter).toBe(true);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeTruthy();
  });

  it('shows the footer on search with query params ("/search?q=biology")', async () => {
    await router.navigateByUrl('/search?q=biology');
    fixture.detectChanges();

    expect(component.showFooter).toBe(true);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeTruthy();
  });

  it('hides the entire footer bar on other routes', async () => {
    await router.navigateByUrl('/sell');
    fixture.detectChanges();

    expect(component.showFooter).toBe(false);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeNull();

    await router.navigateByUrl('/account');
    fixture.detectChanges();
    expect(component.showFooter).toBe(false);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeNull();

    await router.navigateByUrl('/book/123');
    fixture.detectChanges();
    expect(component.showFooter).toBe(false);
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeNull();
  });

  it('hides the entire footer on full-bleed routes like /messages', async () => {
    await router.navigateByUrl('/messages');
    fixture.detectChanges();

    expect(component.fullBleed).toBe(true);
    const footer = fixture.nativeElement.querySelector('.app-footer');
    expect(footer).toBeNull();
  });
});
