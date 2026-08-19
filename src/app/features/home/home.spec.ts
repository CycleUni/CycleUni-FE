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
      t: (key: string) => `Translated: ${key}`,
      lang: () => 'zh-TW'
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
      getActiveAds: vi.fn().mockReturnValue(of({ results: [] }))
    };

    mockSchoolStateService = {
      selectedSchool$: of('NTU')
    };

    await TestBed.configureTestingModule({
      imports: [Home, HttpClientTestingModule],
      providers: [
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
});
