import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeHero } from './home-hero.component';
import { provideRouter, Router } from '@angular/router';
import { I18nService } from '../../core/i18n.service';

/**
 * Search submission and the popular-query chips moved here from the home
 * component when the hero was split out; these are the same assertions that
 * used to live in home.spec.ts.
 */
describe('HomeHero', () => {
  let component: HomeHero;
  let fixture: ComponentFixture<HomeHero>;
  let mockI18n: any;
  let router: Router;

  beforeEach(async () => {
    mockI18n = { t: (key: string) => key, lang: () => 'zh-TW' };

    await TestBed.configureTestingModule({
      imports: [HomeHero],
      providers: [
        provideRouter([]),
        { provide: I18nService, useValue: mockI18n }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeHero);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('does not search when the translation key resolves to itself', () => {
    mockI18n.t = (key: string) => key;
    component.setSearchQueryFromKey('home.tagCalculus');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('searches using the translated string when one exists', () => {
    mockI18n.t = () => '微積分';
    component.setSearchQueryFromKey('home.tagCalculus');
    expect(router.navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { q: '微積分' },
      replaceUrl: true
    });
  });

  it('does not navigate on an empty or whitespace-only query', () => {
    component.searchQuery = '   ';
    component.onSearch();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes a hero cover by isbn, falling back to id', () => {
    expect(component.heroBookParams({ id: 7, isbn: '978', title: 'x' }))
      .toEqual({ local_cache: 'true', isbn: '978' });
    expect(component.heroBookParams({ id: 7, title: 'x' }))
      .toEqual({ local_cache: 'true', id: 7 });
  });
});
