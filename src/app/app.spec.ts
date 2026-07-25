import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { routes } from './app.routes';

/** Smoke tests: the App shell can be created and the route table covers all routes. */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // UiLayout (the persistent app shell rendered inside App) injects
      // SwUpdate to auto-reload on a new deployed version — provide the
      // service worker (disabled, no actual SW script in tests) so that
      // injection resolves instead of throwing NG0201.
      providers: [provideRouter(routes), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    }).compileComponents();
  });

  it('creates the App', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('covers the SSD §2 routes plus verify and checkout', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toEqual([
      '', 'search', 'book', 'sell', 'account',
      'checkout/success', 'checkout/:id', 'listing/:id', 'seller/:id', 'messages', 'verify', 'forgot-password', 'admin',
    ]);
  });
});
