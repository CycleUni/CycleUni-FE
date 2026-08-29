import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';
import { provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { I18nService } from '../../core/i18n.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { SchoolStateService } from '../../core/services/school-state.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { RegionService } from '../../core/region.service';


describe('HomeComponent', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let mockI18n: any;
  let mockListingService: any;
  let mockMetadataService: any;
  let mockSchoolStateService: any;
  let router: Router;

  beforeEach(async () => {
    mockI18n = {
      lang: () => 'zh-TW',
      t: (key: string, params?: Record<string, string | number>) => {
        let text = `Translated: ${key}`;
        if (params) {
          for (const [name, value] of Object.entries(params)) {
            text += ` (${name}=${value})`;
          }
        }
        return text;
      }
    };

    mockListingService = {
      getListings: vi.fn().mockReturnValue(of([])),
      getRecentBooks: vi.fn().mockReturnValue(of([]))
    };

    mockMetadataService = {
      getMetadata: vi.fn().mockReturnValue(of({
        categories: [{ slug: 'cat1', title: 'Cat 1', desc: 'Cat 1 desc' }],
        waitlist: [{ title: 'Wait 1', count: 5 }]
      })),
      getActiveAds: vi.fn().mockReturnValue(of({ results: [] })),
      recordAdView: vi.fn().mockReturnValue(of({})),
      recordAdClick: vi.fn().mockReturnValue(of({}))
    };

    mockSchoolStateService = {
      selectedSchool$: of('NTU')
    };

    await TestBed.configureTestingModule({
      imports: [Home, HttpClientTestingModule],
      providers: [
        { provide: RegionService, useValue: { regions: () => [{ code: 'tw', currency: { code: 'TWD', decimal_places: 0 } }], currency: () => ({ code: 'TWD', decimal_places: 0 }), region: () => 'tw', currentRegionObj: () => ({ search_engines: ['googlebooks'] }) } },
        provideRouter([]),
        { provide: I18nService, useValue: mockI18n },
        { provide: ListingService, useValue: mockListingService },
        { provide: MetadataService, useValue: mockMetadataService },
        { provide: SchoolStateService, useValue: mockSchoolStateService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    router.navigate = vi.fn();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // The metadata endpoint already slices to 7, but the page must not depend
  // on that — this section is a demand signal for sellers, not a directory.
  it('caps the waitlist at seven entries even when the API returns more', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ title: `Book ${i}`, count: 20 - i }));
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist: many }));

    component.loadMetadata();

    expect(component.waitlist.length).toBe(7);
    expect(component.waitlist[0].title).toBe('Book 0');
  });

  // Three is a physical limit: HomeHero only defines three fan positions, so a
  // fourth cover would wrap onto the first one's coordinates and vanish.
  it('caps the hero cover stack at three', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ title: `Book ${i}`, count: 20 - i }));
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist: many }));

    component.loadMetadata();

    expect(component.heroCovers.length).toBe(3);
  });

  it('should provide trackBy ids correctly', () => {
    expect(component.trackById(0, { id: 10 })).toBe(10);
    expect(component.trackByTitle(0, { title: 'book' })).toBe('book');
  });

  it('leaves hero covers empty when there is no waitlist and no hero ad', () => {
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist: [] }));
    mockMetadataService.getActiveAds.mockReturnValue(of({ results: [] }));

    component.loadAds();
    component.loadMetadata();

    expect(component.heroCovers).toEqual([]);
  });

  it('places a show_in_hero ad at the front of hero covers with waitlist books', () => {
    const heroAd: any = { id: 99, title: 'Ad Title', image_url: 'http://img.png', target_url: 'http://link.com', show_in_hero: true, slot_index: 1 };
    const waitlist = [
      { book_id: 1, title: 'Book 1', cover_url: 'http://b1.png', count: 4 },
      { book_id: 2, title: 'Book 2', cover_url: 'http://b2.png', count: 3 },
      { book_id: 3, title: 'Book 3', cover_url: 'http://b3.png', count: 2 },
    ];
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist }));
    mockMetadataService.getActiveAds.mockReturnValue(of({ results: [heroAd] }));

    component.loadAds();
    component.loadMetadata();

    expect(component.heroCovers.length).toBe(3);
    expect(component.heroCovers[0]).toEqual({
      id: 99,
      title: 'Ad Title',
      coverUrl: 'http://img.png',
      isAd: true,
      targetUrl: 'http://link.com',
      adData: heroAd
    });
    expect(component.heroCovers[1].id).toBe(1);
    expect(component.heroCovers[2].id).toBe(2);
  });

  it('shows the hero ad alone when there is no waitlist', () => {
    const heroAd: any = { id: 99, title: 'Ad Title', image_url: 'http://img.png', target_url: 'http://link.com', show_in_hero: true, slot_index: 1 };
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist: [] }));
    mockMetadataService.getActiveAds.mockReturnValue(of({ results: [heroAd] }));

    component.loadAds();
    component.loadMetadata();

    expect(component.heroCovers.length).toBe(1);
    expect(component.heroCovers[0].isAd).toBe(true);
  });

  it('renders waitlist wcount as-is below 10000 and capped at 9999+ when exceeding 9999', () => {
    const waitlist = [
      { book_id: 1, title: 'Book 1', cover_url: '', count: 50 },
      { book_id: 2, title: 'Book 2', cover_url: '', count: 12000 }
    ];
    mockMetadataService.getMetadata.mockReturnValue(of({ categories: [], waitlist }));

    component.loadMetadata();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const wcounts = compiled.querySelectorAll('.wcount');
    expect(wcounts.length).toBe(2);
    expect(wcounts[0].textContent).toContain('n=50');
    expect(wcounts[1].textContent).toContain('n=9999+');
  });
});
