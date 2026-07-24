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
      }))
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

  it('should not search when translation key returns itself (missing translation)', () => {
    mockI18n.t = (key: string) => key; // Simulate missing translation
    component.setSearchQueryFromKey('home.tagCalculus');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should search using translated string if available', () => {
    mockI18n.t = (key: string) => '微積分';
    component.setSearchQueryFromKey('home.tagCalculus');
    expect(router.navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { q: '微積分' },
      replaceUrl: true
    });
  });

  it('should provide trackBy ids correctly', () => {
    expect(component.trackById(0, { id: 10 })).toBe(10);
    expect(component.trackBySlug(0, { slug: 'test' })).toBe('test');
    expect(component.trackByTitle(0, { title: 'book' })).toBe('book');
  });
});
