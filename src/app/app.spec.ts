import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

/** Smoke tests: the App shell can be created and the route table covers all routes. */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
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
