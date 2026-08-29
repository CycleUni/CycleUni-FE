import { Component, OnInit, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { UiListingRow } from '../../shared/ui/listing-row.component';
import { UiSkeleton } from '../../shared/ui/skeleton.component';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../core/services/book.service';
import { AuthStore } from '../../core/auth.store';
import { ChangeDetectorRef } from '@angular/core';
import { I18nService, TPipe } from '../../core/i18n.service';
import { SchoolStateService } from '../../core/services/school-state.service';
import { MetadataService } from '../../core/services/metadata.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { UiRecentListings } from '../../shared/ui/recent-listings.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiPagination } from '../../shared/ui/pagination.component';
import { UiBookTile } from '../../shared/ui/book-tile.component';
import { UiFacetList, FacetOption } from '../../shared/ui/facet-list.component';
import { combineLatest, Subscription } from 'rxjs';
import { map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { RegionLinkService } from '../../core/region-link.service';


@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiSkeleton, UiRecentListings, UiDropdown, UiPagination, UiBookTile, UiFacetList, TPipe],
  template: `
      <div class="search-header">
        <div class="header-inner">
          <div class="search-page-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5"/>
              <line x1="20" y1="20" x2="15.4" y2="15.4"/>
            </svg>
            <ui-input
              [placeholder]="'common.searchPlaceholder' | t"
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearch()"
              class="search-page-input"
            ></ui-input>
          </div>
          <ui-button (onClick)="onSearch()" class="search-button"><span class="submit-label sr-only-mobile">{{ 'common.search' | t }}</span><svg class="submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.4" y2="15.4"/></svg></ui-button>
        </div>
      </div>

      <div class="container">
        <button
          type="button"
          class="filter-toggle"
          (click)="filtersOpen = !filtersOpen"
          [attr.aria-expanded]="filtersOpen"
        >
          <span>{{ 'search.filters' | t }}</span>
          <svg class="filter-toggle-caret" [class.open]="filtersOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <aside class="sidebar" [class.mobile-collapsed]="!filtersOpen">
          <div class="filter-group">
            <ui-facet-list
              [title]="'search.conditionTitle' | t"
              [options]="conditionFacetOptions"
              (optionToggle)="toggleCondition($event)"
            ></ui-facet-list>
          </div>
          <div class="filter-group">
            <ui-facet-list
              [title]="'search.categoryTitle' | t"
              [options]="categoryFacetOptions"
              (optionToggle)="onCategoryChange($event)"
            ></ui-facet-list>
          </div>
          <div class="filter-group">
            <ui-facet-list
              [title]="'search.courseTitle' | t"
              [options]="courseFacetOptions"
              (optionToggle)="onCourseChange($event)"
            ></ui-facet-list>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.stockTitle' | t }}</h4>
            <label class="filter-label"><input type="radio" name="stock" value="all" [(ngModel)]="stockFilter">{{ 'search.all' | t }}</label>
            <label class="filter-label"><input type="radio" name="stock" value="inStock" [(ngModel)]="stockFilter">{{ 'search.inStockOnly' | t }}</label>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.priceTitle' | t }}</h4>
            <div class="price-range">
              <ui-input [placeholder]="'search.priceMinPlaceholder' | t" [(ngModel)]="priceMin" class="price-input"></ui-input>
              <span>-</span>
              <ui-input [placeholder]="'search.priceMaxPlaceholder' | t" [(ngModel)]="priceMax" class="price-input"></ui-input>
            </div>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.engineTitle' | t }}</h4>
            <ui-dropdown
              [(ngModel)]="engine"
              [options]="engineOptions"
              [searchable]="false"
              [appendToBody]="true"
              style="width: 100%; display: block;"
            ></ui-dropdown>
            <p class="engine-hint" *ngIf="engine === 'isbnnet'">{{ 'search.isbnNetHint' | t }}</p>
            <p class="engine-hint" *ngIf="googleUnavailable">{{ 'search.googleUnavailable' | t }}</p>
          </div>
        </aside>

        <main class="results">
          <h2 class="section-heading" *ngIf="activeQuery">{{ 'search.resultsFor' | t:{q: activeQuery} }}</h2>
          <h2 class="section-heading" *ngIf="!activeQuery && category">{{ 'search.categoryResults' | t }}</h2>
          <p class="scoped-count" *ngIf="(activeQuery || category) && !loading && !fetchError && filteredResults.length > 0">
            <ng-container *ngIf="currentSchool">{{ 'search.foundCountScoped' | t:{school: currentSchoolLabel, n: localResultsCount} }}</ng-container>
            <ng-container *ngIf="!currentSchool">{{ 'search.foundCountAll' | t:{n: filteredResults.length} }}</ng-container>
          </p>

          <!-- No active query/category → recent listings -->
          <ng-container *ngIf="!activeQuery && !category">
            <ui-recent-listings [school]="currentSchool" [limit]="4000"></ui-recent-listings>
          </ng-container>

          <!-- Loading state with animation -->
          <ng-container *ngIf="loading">
            <ui-skeleton [count]="4"></ui-skeleton>
          </ng-container>

          <!-- Results loaded successfully -->
          <ng-container *ngIf="!loading && !fetchError">
            <div *ngIf="filteredResults.length > 0" class="discover-grid">
              <ui-book-tile
                *ngFor="let item of filteredResults; let i = index"
                [class.feature-tile]="i === 0"
                [coverUrl]="item.coverUrl"
                [title]="item.title"
                [author]="item.author"
                [isbn]="item.isbn"
                [feature]="i === 0"
                [mode]="item.activeListings > 0 ? 'sellers' : 'waitlist'"
                [minPrice]="item.minPrice"
                [sellerCount]="item.activeListings"
                [waitingCount]="item.waitlistCount"
                [link]="['/book']"
                [linkParams]="bookLinkParams(item)"
                (tileClick)="goToBook(item)"
              >
                <div tile-actions class="tile-actions-inner">
                  <ng-container *ngIf="item.activeListings === 0">
                    <ui-button *ngIf="!item.is_subscribed" variant="ghost" (onClick)="$event.stopPropagation(); subscribeBook(item)">{{ 'search.notifyMe' | t }}</ui-button>
                    <ui-button *ngIf="item.is_subscribed" variant="ghost" style="color: var(--muted); border-color: var(--muted);" (onClick)="$event.stopPropagation(); unsubscribeBook(item)">{{ 'search.cancelNotify' | t }}</ui-button>
                  </ng-container>
                  <ng-container *ngIf="item.activeListings > 0">
                    <ui-button>{{ 'search.viewAll' | t }}</ui-button>
                    <span class="local-badge" *ngIf="currentSchool && item.localActiveListings === 0">
                      {{ 'search.noLocalListings' | t:{school: currentSchoolLabel} }}
                    </span>
                  </ng-container>
                </div>
              </ui-book-tile>
            </div>

            <ui-pagination *ngIf="totalCount > 20" [total]="totalCount" [pageSize]="20" [currentPage]="currentPage" (pageChange)="onPageChange($event)"></ui-pagination>

            <div *ngIf="results.length === 0 && activeQuery" class="empty-state">
              <h3>{{ 'search.notFound' | t }}</h3>
              <p>{{ 'search.notFoundDesc' | t }}</p>
            </div>

            <div *ngIf="results.length > 0 && filteredResults.length === 0" class="empty-state">
              <h3>{{ 'search.noFilterMatch' | t }}</h3>
              <p>{{ 'search.adjustFilters' | t }}</p>
            </div>
          </ng-container>

          <!-- Error state after load failure -->
          <div class="error-box" *ngIf="!loading && fetchError">
            <h3>{{ 'search.errorTitle' | t }}</h3>
            <p>{{ 'search.errorDesc' | t }}</p>
            <ui-button variant="ghost" (onClick)="fetchResults()">{{ 'common.retry' | t }}</ui-button>
          </div>
        </main>
      </div>
  `,
  styles: [`
    .search-header { background-color: var(--paper-warm); border-bottom: 1px solid var(--line); padding: 24px 16px; margin-bottom: 32px; }
    .header-inner { max-width: 1120px; margin: 0 auto; display: flex; gap: 8px; }
    .search-page-input-wrap { position: relative; width: 400px; max-width: 100%; }
    .search-page-input-wrap .search-icon { position: absolute; left: 2px; bottom: 10px; color: var(--muted); pointer-events: none; }
    .search-page-input { display: inline-block !important; width: 100%; }
    .search-page-input ::ng-deep .input-wrapper { margin-bottom: 0; }
    .search-page-input ::ng-deep input {
      border: none;
      border-bottom: 1.5px solid var(--ink);
      border-radius: 0;
      background: none;
      padding-left: 24px;
      font-size: 16px;
    }
    .search-page-input ::ng-deep input:focus {
      border-bottom-color: var(--accent);
      box-shadow: none;
    }
    .search-button { flex-shrink: 0; }
    .search-button .submit-icon { display: none; }
    .container { max-width: 1120px; margin: 0 auto; padding: 0 16px; display: flex; gap: 48px; }
    .filter-toggle { display: none; }
    .sidebar { width: 240px; flex-shrink: 0; }
    .filter-group { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
    .filter-group:last-of-type { border-bottom: none; }
    .filter-title { font-size: 14px; font-weight: 500; margin-top: 0; margin-bottom: 12px; color: var(--ink); }
    .filter-label { display: block; margin-bottom: 12px; font-size: 14px; color: var(--ink); cursor: pointer; }
    .filter-label input { margin-right: 8px; }
    .engine-hint { margin: 8px 0 0; font-size: 12px; color: var(--flag); }
    .price-range { display: flex; gap: 8px; align-items: center; }
    /* Price stays a plain numeric range, not a facet list — strip ui-input's
       boxed border for an underline look consistent with the lighter facet
       treatment above it. */
    .price-input { width: 80px; }
    .price-input ::ng-deep .input-wrapper { margin-bottom: 0; }
    .price-input ::ng-deep input { border: none; border-bottom: 1px solid var(--line); border-radius: 0; padding: 4px 0; background: transparent; }
    .price-input ::ng-deep input:focus { border-color: var(--accent); }
    .results { flex: 1; }
    .scoped-count { margin: -16px 0 24px; font-size: 14px; color: var(--muted); }

    .discover-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 32px 24px;
    }
    .discover-grid ui-book-tile {
      display: block;
    }
    .discover-grid ui-book-tile.feature-tile {
      grid-column: span 2;
      grid-row: span 2;
    }
    .tile-actions-inner { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 8px; }
    .local-badge { display:inline-block; padding:4px 8px; font-size:12px; font-weight:500; color:var(--danger); background-color:var(--danger-light, #fee2e2); border-radius:4px; }

    .error-box { padding: 32px 24px; text-align: center; border: 1px solid var(--flag); border-radius: var(--radius-sm); background-color: var(--warn-bg); }
    .error-box h3 { margin-top: 0; margin-bottom: 12px; color: var(--warn-ink); }
    .error-box p { color: var(--muted); margin-bottom: 24px; }

    @media (max-width: 1024px) {
      .header-inner { flex-wrap:wrap; } .search-page-input-wrap { flex:1; width:auto; min-width:200px; }
      .discover-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      /* Stays a row. With flex-direction:column the main axis turns vertical,
         so the button's flex-basis sized its height and align-items:stretch
         pulled both children to full width — which is what made the button a
         343px block instead of a 44px square. */
      .header-inner { align-items: stretch; }
      /* Same collapse as the home hero: a full-width filled button for an
         action Enter already performs is the biggest thing on the screen. */
      .search-page-input-wrap { flex:1; width:auto; min-width:0; max-width:100%; }
      .search-page-input-wrap .search-icon { display: none; }
      .search-page-input ::ng-deep input { padding-left: var(--space-3); }
      .search-button { flex: 0 0 44px; }
      .search-button ::ng-deep .ui-btn.md { padding-inline: 0; }
      .search-button .submit-icon { display: block; }
      .container { flex-direction:column; gap:0; }
      .filter-toggle { display:flex; align-items:center; justify-content:space-between; width:100%; padding:12px 16px; margin-bottom:16px; border:1px solid var(--line); border-radius:4px; background-color:var(--paper); color:var(--ink); font-size:14px; font-weight:500; font-family:inherit; cursor:pointer; }
      .filter-toggle-caret { flex-shrink:0; color:var(--muted); transition:transform .2s; }
      .filter-toggle-caret.open { transform:rotate(180deg); }
      .sidebar { width:100%; display:flex; flex-wrap:wrap; gap:0 24px; border-bottom:1px solid var(--line); margin-bottom:24px; }
      .sidebar.mobile-collapsed { display:none; }
      .filter-group { flex:1 1 40%; min-width:150px; margin-bottom:16px; padding-bottom:0; border-bottom:none; }
      .discover-grid { grid-template-columns: repeat(2, 1fr); gap: 24px 16px; }
      /* Same reasoning as recent-listings.component.ts: at 2 columns the
         feature tile spanning both would fill the whole row width and
         dominate the screen, so it falls back to a regular-sized tile. */
      .discover-grid ui-book-tile.feature-tile { grid-column: span 1; grid-row: span 1; }
    }
  `]
})
export class Search implements OnInit {
  searchQuery = ''; activeQuery = ''; category = ''; course = '';
  engine: 'googlebooks' | 'openlibrary' | 'isbnnet' = 'googlebooks';
  googleUnavailable = false;
  loading = true; fetchError = false;
  filtersOpen = false;
  results: any[] = []; categories: any[] = []; courses: string[] = []; currentSchool = ''; currentPage = 1; totalCount = 0;
  private searchSub?: Subscription;

  get currentSchoolLabel(): string {
    return this.schoolStateService.getSchoolLabel(this.currentSchool);
  }

  get categoryOptions() {
    return [
      { label: this.i18n.t('search.allCategories'), value: '' },
      ...this.categories.map(c => ({ label: c.title, value: c.slug }))
    ];
  }

  get courseOptions() {
    return [
      { label: this.i18n.t('search.allCourses'), value: '' },
      ...this.courses.map(c => ({ label: c, value: c }))
    ];
  }
  get engineOptions() { return this.bookService.getEngineOptions(); }

  conditionFilters = { new: true, like_new: true, noted: true, damaged: true };
  stockFilter: 'all' | 'inStock' = 'all';
  priceMin = ''; priceMax = '';

  get conditionFacetOptions(): FacetOption[] {
    return [
      { label: this.i18n.t('cond.new'), value: 'new', selected: this.conditionFilters.new },
      { label: this.i18n.t('cond.like_new'), value: 'like_new', selected: this.conditionFilters.like_new },
      { label: this.i18n.t('cond.noted'), value: 'noted', selected: this.conditionFilters.noted },
      { label: this.i18n.t('cond.damaged'), value: 'damaged', selected: this.conditionFilters.damaged },
    ];
  }

  toggleCondition(value: string) {
    const key = value as keyof typeof this.conditionFilters;
    if (key in this.conditionFilters) {
      this.conditionFilters[key] = !this.conditionFilters[key];
    }
  }

  get categoryFacetOptions(): FacetOption[] {
    return this.categoryOptions.map(o => ({ label: o.label, value: o.value, selected: o.value === this.category }));
  }

  get courseFacetOptions(): FacetOption[] {
    return this.courseOptions.map(o => ({ label: o.label, value: o.value, selected: o.value === this.course }));
  }

  get filteredResults(): any[] {
    const allChecked = Object.values(this.conditionFilters).every(v => v);
    const min = parseInt(this.priceMin, 10);
    const max = parseInt(this.priceMax, 10);
    const filterPrice = !isNaN(min) || !isNaN(max);
    return this.results.filter(item => {
      const inStock = item.activeListings > 0;
      if (this.stockFilter === 'inStock' && !inStock) return false;
      if (filterPrice) {
        if (!inStock) return false;
        if (!isNaN(min) && (item.minPrice === null || item.minPrice === undefined || item.minPrice < min)) return false;
        if (!isNaN(max) && (item.minPrice === null || item.minPrice === undefined || item.minPrice > max)) return false;
      }
      if (!allChecked) {
        const checked = this.conditionFilters as Record<string, boolean>;
        const conds: string[] = item.conditions || [];
        if (!conds.some(c => checked[c])) return false;
      }
      return true;
    });
  }

  get localResultsCount(): number {
    return this.filteredResults.filter(item => item.localActiveListings > 0).length;
  }

  private bookService = inject(BookService);
  private auth = inject(AuthStore);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private schoolStateService = inject(SchoolStateService);
  private metadataService = inject(MetadataService);
  private ga = inject(GoogleAnalyticsService);

  private regionLink = inject(RegionLinkService);

  constructor(private route: ActivatedRoute, private router: Router) {
    effect(() => { this.i18n.lang(); this.loadMetadata(); });
  }

  loadMetadata() {
    this.metadataService.getMetadata().subscribe({
      next: data => { if (data.categories) { this.categories = data.categories; this.cdr.markForCheck(); } },
      error: err => console.error('Failed to load metadata', err)
    });
  }

  ngOnInit() {
    this.schoolStateService.schools$.subscribe(() => {
      this.cdr.markForCheck();
    });

    combineLatest([
      this.schoolStateService.selectedSchool$.pipe(distinctUntilChanged()),
      this.route.queryParams.pipe(
        map(params => params['category'] || ''),
        distinctUntilChanged()
      )
    ]).pipe(
      switchMap(([school, category]) => this.bookService.getTopCourses(school, category)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: data => { this.courses = data; this.cdr.markForCheck(); },
      error: err => console.error('Failed to load courses', err)
    });

    // queryParams and selectedSchool$ both outlive this routed component, so
    // without this every visit to /search left another live subscription
    // calling markForCheck() on a destroyed view.
    combineLatest([this.route.queryParams, this.schoolStateService.selectedSchool$]).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(([params, school]) => {
      this.currentSchool = school; this.cdr.markForCheck();
      this.searchQuery = params['q'] || ''; this.activeQuery = this.searchQuery;
      this.category = params['category'] || '';
      this.course = params['course'] || '';
      this.engine = params['engine'] === 'openlibrary' ? 'openlibrary' : params['engine'] === 'isbnnet' ? 'isbnnet' : 'googlebooks';
      this.currentPage = parseInt(params['page'] || '1', 10);

      if (this.activeQuery || this.category || this.course) {
        this.fetchResults();
      } else {
        this.results = []; this.totalCount = 0; this.loading = false; this.fetchError = false;
        this.cdr.markForCheck();
      }
    });
  }

  fetchResults() {
    this.loading = true;
    this.fetchError = false;
    this.cdr.markForCheck();

    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }

    this.searchSub = this.bookService.searchBooks(this.activeQuery, this.category, this.course, this.schoolStateService.currentSchool, this.currentPage, this.engine).subscribe({
      next: data => {
        this.results = data.results || data;
        this.totalCount = data.count || this.results.length;
        this.googleUnavailable = !!data.google_unavailable;
        this.loading = false;
        this.fetchError = false;
        if (this.activeQuery || this.category || this.course) {
          this.ga.trackSearch(this.activeQuery || `${this.category} ${this.course}`.trim(), this.totalCount, this.currentSchool);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.fetchError = true;
        // Keep any previously-loaded results showing (don't blank them)
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(page: number) {
    const params: any = {}; if (this.activeQuery) params.q = this.activeQuery;
    if (this.category) params.category = this.category;
    if (this.course) params.course = this.course;
    params.engine = this.engine;
    params.page = page;
    this.router.navigate(this.regionLink.path(['/search']), { queryParams: params });
  }
  onSearch() {
    if (this.searchQuery.trim()) {
      const params: any = { q: this.searchQuery.trim() };
      params.engine = this.engine;
      this.router.navigate(this.regionLink.path(['/search']), { queryParams: params });
    }
  }
  onCategoryChange(cat: string) {
    const params: any = {};
    if (this.activeQuery) params.q = this.activeQuery;
    if (cat) params.category = cat;
    // We intentionally drop this.course when category changes
    params.engine = this.engine;
    this.router.navigate(this.regionLink.path(['/search']), { queryParams: params });
  }

  onCourseChange(course: string) {
    const params: any = {};
    if (this.activeQuery) params.q = this.activeQuery;
    if (this.category) params.category = this.category;
    if (course) params.course = course;
    params.engine = this.engine;
    this.router.navigate(this.regionLink.path(['/search']), { queryParams: params });
  }

  /** Route params for a result tile; the tile's own anchor does the navigating. */
  bookLinkParams(item: any): Record<string, any> {
    const params: Record<string, any> = { local_cache: 'true' };
    if (item.isbn) params['isbn'] = item.isbn; else params['id'] = item.id;
    // Belt-and-suspenders alongside goToBook()'s sessionStorage priming:
    // if the cache entry is missing (cleared tab, private browsing) the
    // book page falls back to a live lookup, which must use the same
    // engine this tile's data came from — otherwise the two pages can show
    // different covers/titles for the same ISBN.
    params['engine'] = this.engine;
    return params;
  }

  /** Cache priming only — must not navigate, or the anchor fires twice. */
  goToBook(item: any) {
    const key = item.isbn || item.id; if (!key) return;
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem(`cachedBook_${key}`, JSON.stringify(item)); }
      catch (e) { /* ok — cache is optional */ }
    }
  }

  subscribeBook(item: any) {
    if (!this.auth.isLoggedIn()) {
      alert(this.i18n.t('alert.loginToSubscribe')); this.router.navigate(this.regionLink.path(['/account'])); return;
    }
    const doSubscribe = (id: string) => {
      this.bookService.subscribe(id).subscribe({
        next: res => {
          alert(this.i18n.t('alert.subscribed'));
          item.waitlistCount++; item.is_subscribed = true; item.subscription_id = res.id; item.id = id;
          this.cdr.markForCheck();
        },
        error: () => alert(this.i18n.t('alert.unsubscribeFailed'))
      });
    };
    if (item.id) { doSubscribe(item.id); } else {
      const bookData = { isbn13: item.isbn || '', title: item.title, authors: item.author || '', publisher: item.publisher || '', published_date: item.published_date || '', cover_url: item.coverUrl || '', source: item.source || 'manual' };
      this.bookService.createManualBook(bookData).subscribe({
        next: created => doSubscribe(created.id),
        error: () => alert(this.i18n.t('alert.subscribeFailed'))
      });
    }
  }

  unsubscribeBook(item: any) {
    if (item.subscription_id) {
      this.bookService.unsubscribe(item.subscription_id).subscribe({
        next: () => {
          alert(this.i18n.t('alert.unsubscribed'));
          item.waitlistCount--; item.is_subscribed = false; item.subscription_id = null;
          this.cdr.markForCheck();
        },
        error: () => alert(this.i18n.t('alert.unsubscribeFailed'))
      });
    }
  }
}
