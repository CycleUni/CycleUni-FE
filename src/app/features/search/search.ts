import { Component, OnInit, inject, effect } from '@angular/core';
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
import { UiRecentListings } from '../../shared/ui/recent-listings.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiPagination } from '../../shared/ui/pagination.component';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiSkeleton, UiRecentListings, UiDropdown, UiPagination, TPipe],
  template: `
      <div class="search-header">
        <div class="header-inner">
          <ui-input
            [placeholder]="'common.searchPlaceholder' | t"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            class="search-input"
          ></ui-input>
          <ui-button (onClick)="onSearch()" class="search-button">{{ 'common.search' | t }}</ui-button>
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
            <h4 class="filter-title">{{ 'search.conditionTitle' | t }}</h4>
            <label class="filter-label"><input type="checkbox" [(ngModel)]="conditionFilters.new"> {{ 'cond.new' | t }}</label>
            <label class="filter-label"><input type="checkbox" [(ngModel)]="conditionFilters.like_new"> {{ 'cond.like_new' | t }}</label>
            <label class="filter-label"><input type="checkbox" [(ngModel)]="conditionFilters.noted"> {{ 'cond.noted' | t }}</label>
            <label class="filter-label"><input type="checkbox" [(ngModel)]="conditionFilters.damaged"> {{ 'cond.damaged' | t }}</label>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.categoryTitle' | t }}</h4>
            <ui-dropdown
              [(ngModel)]="category"
              (ngModelChange)="onCategoryChange($event)"
              [options]="categoryOptions"
              style="width: 100%; display: block;"
            ></ui-dropdown>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.stockTitle' | t }}</h4>
            <label class="filter-label"><input type="radio" name="stock" value="all" [(ngModel)]="stockFilter"> {{ 'search.all' | t }}</label>
            <label class="filter-label"><input type="radio" name="stock" value="inStock" [(ngModel)]="stockFilter"> {{ 'search.inStockOnly' | t }}</label>
          </div>
          <div class="filter-group">
            <h4 class="filter-title">{{ 'search.priceTitle' | t }}</h4>
            <div style="display: flex; gap: 8px; align-items: center;">
              <ui-input placeholder="Min" [(ngModel)]="priceMin" style="width: 80px;"></ui-input>
              <span>-</span>
              <ui-input placeholder="Max" [(ngModel)]="priceMax" style="width: 80px;"></ui-input>
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
            <p class="engine-hint" *ngIf="googleUnavailable">{{ 'search.googleUnavailable' | t }}</p>
          </div>
        </aside>

        <main class="results">
          <h2 class="results-title" *ngIf="activeQuery">{{ 'search.resultsFor' | t:{q: activeQuery} }}</h2>
          <h2 class="results-title" *ngIf="!activeQuery && category">{{ 'search.categoryResults' | t }}</h2>
          
          <!-- When no active query and no category, show recent listings -->
          <ng-container *ngIf="!activeQuery && !category">
            <ui-recent-listings [school]="currentSchool" [limit]="4000"></ui-recent-listings>
          </ng-container>
          
          <ng-container *ngIf="loading">
            <ui-skeleton [count]="4"></ui-skeleton>
          </ng-container>

          <ng-container *ngIf="!loading">
            <div *ngIf="filteredResults.length > 0" class="list">
              <div class="result-card" *ngFor="let item of filteredResults" (click)="goToBook(item)">
                <div class="book-cover">
                  <img *ngIf="item.coverUrl" [src]="item.coverUrl" alt="Book cover" loading="lazy" />
                </div>
                <div class="book-info">
                  <h3 class="book-title">{{ item.title }}</h3>
                  <p class="book-meta">
                    <span class="meta-author">{{ 'search.authorLine' | t:{author: item.author} }}</span>
                    <span class="meta-isbn">{{ 'search.isbnLine' | t:{isbn: item.isbn} }}</span>
                  </p>

                  <div class="stock-status" *ngIf="item.activeListings > 0">
                    {{ 'search.stockBefore' | t:{n: item.activeListings} }}<span class="price">\${{ item.minPrice }}</span>{{ 'search.stockAfter' | t }}
                  </div>
                  <div class="stock-status" [class.empty]="item.waitlistCount > 0" *ngIf="item.activeListings === 0">
                    <ng-container *ngIf="item.waitlistCount > 0">
                      {{ 'search.noStockLine' | t:{n: item.waitlistCount} }}
                    </ng-container>
                    <ng-container *ngIf="item.waitlistCount === 0">
                      {{ 'search.noStockNoWaitlist' | t }}
                    </ng-container>
                  </div>
                </div>
                <div class="book-action">
                  <ng-container *ngIf="item.activeListings === 0">
                    <ui-button *ngIf="!item.is_subscribed" variant="ghost" (onClick)="$event.stopPropagation(); subscribeBook(item)">{{ 'search.notifyMe' | t }}</ui-button>
                    <ui-button *ngIf="item.is_subscribed" variant="ghost" style="color: var(--muted); border-color: var(--muted);" (onClick)="$event.stopPropagation(); unsubscribeBook(item)">{{ 'search.cancelNotify' | t }}</ui-button>
                  </ng-container>
                  <ui-button *ngIf="item.activeListings > 0">{{ 'search.viewAll' | t }}</ui-button>
                </div>
              </div>
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
        </main>
      </div>
  `,
  styles: [`
    .search-header {
      background-color: var(--paper-warm);
      border-bottom: 1px solid var(--line);
      padding: 24px 16px;
      margin-bottom: 32px;
    }
    .header-inner {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      gap: 8px;
    }
    .search-input {
      display: inline-block;
      width: 400px;
      max-width: 100%;
    }
    .search-button {
      flex-shrink: 0;
    }

    .container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 16px;
      display: flex;
      gap: 48px;
    }

    .filter-toggle {
      display: none;
    }

    .sidebar {
      width: 240px;
      flex-shrink: 0;
    }
    .filter-group {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }
    .filter-group:last-child {
      border-bottom: none;
    }
    .filter-title {
      font-size: 16px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .filter-label {
      display: block;
      margin-bottom: 12px;
      font-size: 14px;
      color: var(--ink);
      cursor: pointer;
    }
    .filter-label input {
      margin-right: 8px;
    }
    .engine-hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--flag);
    }

    .results {
      flex: 1;
    }
    .results-title {
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 24px;
    }

    .result-card {
      display: flex;
      gap: 24px;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 4px;
      margin-bottom: 16px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .result-card:hover {
      border-color: var(--accent);
    }
    .book-cover {
      width: 100px;
      height: 140px;
      background-color: var(--line);
      flex-shrink: 0;
    }
    .book-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .book-info {
      flex: 1;
    }
    .book-title {
      font-size: 20px;
      margin: 0 0 8px;
      font-family: 'Noto Serif TC', serif;
      font-weight: 700;
    }
    .book-meta {
      color: var(--muted);
      font-size: 14px;
      margin: 0 0 16px;
    }
    .book-meta .meta-author::after {
      content: ' • ';
      margin: 0 4px;
    }
    .stock-status {
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
      padding: 8px 12px;
      background-color: var(--paper-warm);
      border-radius: 4px;
      display: inline-block;
    }
    .stock-status.empty {
      color: var(--flag);
      background-color: #fff0eb;
    }
    .price {
      color: var(--accent);
      font-weight: 700;
      font-size: 16px;
    }

    .book-action {
      display: flex;
      align-items: center;
    }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background-color: var(--paper-warm);
    }
    .empty-state h3 {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .empty-state p {
      color: var(--muted);
      margin-bottom: 24px;
    }

    @media (max-width: 1024px) {
      .header-inner {
        flex-wrap: wrap;
      }
      .search-input {
        flex: 1;
        width: auto;
        min-width: 200px;
      }
    }

@media (max-width: 768px) {
      .header-inner {
        flex-direction: column;
        align-items: stretch;
      }
      .search-input {
        flex: none;
        width: 100%;
        max-width: 100%;
      }
      /* Ensure ui-input inside search-input fills full width on mobile */
      .search-input ui-input {
        width: 100%;
      }
      .search-button {
        width: 100%;
      }
      .container {
        flex-direction: column;
        gap: 0;
      }
      .filter-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        margin-bottom: 16px;
        border: 1px solid var(--line);
        border-radius: 4px;
        background-color: var(--paper);
        color: var(--ink);
        font-size: 14px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
      }
      .filter-toggle-caret {
        flex-shrink: 0;
        color: var(--muted);
        transition: transform 0.2s;
      }
      .filter-toggle-caret.open {
        transform: rotate(180deg);
      }
      .sidebar {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 0 24px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 24px;
      }
      .sidebar.mobile-collapsed {
        display: none;
      }
      .filter-group {
        flex: 1 1 40%;
        min-width: 150px;
        margin-bottom: 16px;
        padding-bottom: 0;
        border-bottom: none;
      }
      .result-card {
        flex-wrap: wrap;
        gap: 16px;
        padding: 16px;
      }
      .book-cover {
        width: 72px;
        height: 100px;
      }
      .book-info {
        min-width: 0;
      }
      .book-meta .meta-author::after {
        content: '';
        margin: 0;
      }
      .book-meta .meta-isbn {
        display: block;
        margin-top: 4px;
      }
      .book-action {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class Search implements OnInit {
  searchQuery = '';
  activeQuery = '';
  category = '';
  engine: 'google' | 'openlibrary' = 'google';
  googleUnavailable = false;
  filtersOpen = false;
  loading = true;
  results: any[] = [];
  categories: any[] = [];
  currentSchool: string = '';
  currentPage = 1;
  totalCount = 0;

  get categoryOptions() {
    return [
      { label: this.i18n.t('search.allCategories'), value: '' },
      ...this.categories.map(c => ({
        label: c.title,
        value: c.slug
      }))
    ];
  }

  get engineOptions() {
    return this.bookService.getEngineOptions(this.i18n);
  }

  conditionFilters = {
    new: true,
    like_new: true,
    noted: true,
    damaged: true,
  };
  stockFilter: 'all' | 'inStock' = 'all';
  priceMin = '';
  priceMax = '';

  // Client-side filtering over the loaded results. Price bounds apply to each
  // book's lowest active price; the condition filter only takes effect when at
  // least one condition is unchecked, so books without local listings still
  // show under the default (all-checked) state.
  get filteredResults(): any[] {
    const allConditionsChecked = Object.values(this.conditionFilters).every(v => v);
    const min = parseInt(this.priceMin, 10);
    const max = parseInt(this.priceMax, 10);
    const priceFilterActive = !isNaN(min) || !isNaN(max);

    return this.results.filter(item => {
      const inStock = item.activeListings > 0;
      if (this.stockFilter === 'inStock' && !inStock) {
        return false;
      }
      if (priceFilterActive) {
        if (!inStock) return false;
        if (!isNaN(min) && item.minPrice < min) return false;
        if (!isNaN(max) && item.minPrice > max) return false;
      }
      if (!allConditionsChecked) {
        const checked = this.conditionFilters as Record<string, boolean>;
        const conditions: string[] = item.conditions || [];
        if (!conditions.some(c => checked[c])) return false;
      }
      return true;
    });
  }

  private bookService = inject(BookService);
  private auth = inject(AuthStore);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private schoolStateService = inject(SchoolStateService);
  private metadataService = inject(MetadataService);

  constructor(private route: ActivatedRoute, private router: Router) {
    effect(() => {
      // Re-fetch metadata when language changes so category titles update
      this.i18n.lang();
      this.loadMetadata();
    });
  }

  loadMetadata() {
    this.metadataService.getMetadata().subscribe({
      next: (data) => {
        if (data.categories) {
          this.categories = data.categories;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        // Category options are supplementary; log and don't block search results.
        console.error('Failed to load metadata', err);
      }
    });
  }

  ngOnInit() {
    combineLatest([
      this.route.queryParams,
      this.schoolStateService.selectedSchool$
    ]).subscribe(([params, school]) => {
      this.currentSchool = school;
      this.cdr.markForCheck(); // Ensure [school] binding propagates to ui-recent-listings
      this.searchQuery = params['q'] || '';
      this.activeQuery = this.searchQuery;
      this.category = params['category'] || '';
      this.engine = params['engine'] === 'openlibrary' ? 'openlibrary' : 'google';
      this.currentPage = parseInt(params['page'] || '1', 10);
      
      if (this.activeQuery || this.category) {
        this.fetchResults();
      } else {
        this.results = [];
        this.totalCount = 0;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  fetchResults() {
    this.loading = true;
    this.cdr.markForCheck();
    this.bookService.searchBooks(this.activeQuery, this.category, this.schoolStateService.currentSchool, this.currentPage, this.engine).subscribe({
      next: (data) => {
        this.results = data.results || data;
        this.totalCount = data.count || this.results.length;
        this.googleUnavailable = !!data.google_unavailable;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.results = [];
        this.totalCount = 0;
        this.googleUnavailable = false;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(page: number) {
    const params: any = {};
    if (this.activeQuery) params.q = this.activeQuery;
    if (this.category) params.category = this.category;
    if (this.engine !== 'google') params.engine = this.engine;
    params.page = page;
    this.router.navigate(['/search'], { queryParams: params });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      const params: any = { q: this.searchQuery.trim() };
      if (this.engine !== 'google') params.engine = this.engine;
      this.router.navigate(['/search'], { queryParams: params });
    }
  }

  onCategoryChange(cat: string) {
    const params: any = {};
    if (this.activeQuery) params.q = this.activeQuery;
    if (cat) params.category = cat;
    if (this.engine !== 'google') params.engine = this.engine;
    this.router.navigate(['/search'], { queryParams: params });
  }

  goToBook(item: any) {
    // Hand the already-loaded search result to the book page via
    // sessionStorage so it renders instantly without re-fetching
    const key = item.isbn || item.id;
    if (!key) {
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(`cachedBook_${key}`, JSON.stringify(item));
      } catch (err) {
        // Safari private browsing (or a full quota) can throw here; this cache
        // is a performance optimization only, so failures are safe to ignore —
        // the book page will still fetch via the normal API.
        console.error('Failed to cache book for instant nav', err);
      }
    }
    const queryParams: any = { local_cache: 'true' };
    if (item.isbn) {
      queryParams.isbn = item.isbn;
    } else {
      queryParams.id = item.id;
    }
    this.router.navigate(['/book'], { queryParams });
  }

  subscribeBook(item: any) {
    if (!this.auth.isLoggedIn()) {
      alert(this.i18n.t('alert.loginToSubscribe'));
      this.router.navigate(['/account']);
      return;
    }
    
    const doSubscribe = (id: string) => {
      this.bookService.subscribe(id).subscribe({
        next: (res) => {
          alert(this.i18n.t('alert.subscribed'));
          item.waitlistCount++;
          item.is_subscribed = true;
          item.subscription_id = res.id;
          item.id = id;
          this.cdr.markForCheck();
        },
        error: () => alert(this.i18n.t('alert.subscribeFailed'))
      });
    };

    if (item.id) {
      doSubscribe(item.id);
    } else {
      const bookData = {
        isbn13: item.isbn || '',
        title: item.title,
        authors: item.author || item.authors || '',
        publisher: item.publisher || '',
        published_date: item.published_date || '',
        cover_url: item.coverUrl || '',
        source: item.source || 'manual'
      };
      this.bookService.createManualBook(bookData).subscribe({
        next: (createdBook) => {
          doSubscribe(createdBook.id);
        },
        error: () => alert(this.i18n.t('alert.subscribeFailed'))
      });
    }
  }

  unsubscribeBook(item: any) {
    if (item.subscription_id) {
      this.bookService.unsubscribe(item.subscription_id).subscribe({
        next: () => {
          alert(this.i18n.t('alert.unsubscribed'));
          item.waitlistCount--;
          item.is_subscribed = false;
          item.subscription_id = null;
          this.cdr.markForCheck();
        },
        error: () => alert(this.i18n.t('alert.unsubscribeFailed'))
      });
    }
  }
}
