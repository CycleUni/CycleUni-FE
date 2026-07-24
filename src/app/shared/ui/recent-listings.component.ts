import { Component, Input, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiListingRow } from './listing-row.component';
import { UiSkeleton } from './skeleton.component';
import { UiPagination } from './pagination.component';
import { ListingService } from '../../core/services/listing.service';
import { I18nService, TPipe } from '../../core/i18n.service';

@Component({
  selector: 'ui-recent-listings',
  standalone: true,
  imports: [CommonModule, UiListingRow, UiSkeleton, TPipe, UiPagination],
  template: `
    <h3 class="section-title">{{ (school ? 'home.recentTitle' : 'home.recentTitleAll') | t }}</h3>
    <ng-container *ngIf="loading">
      <ui-skeleton [count]="3"></ui-skeleton>
    </ng-container>
    <ng-container *ngIf="!loading">
      <p *ngIf="errorMessage" class="text-danger">{{ errorMessage }}</p>
      <ui-listing-row
        *ngFor="let item of recentListings; trackBy: trackById"
        [title]="item.title || ('home.unknownBook' | t)"
        [price]="item.avg_price"
        [pricePrefix]="isAveragePrice(item.conditions) ? ('home.avgPricePrefix' | t) : 'NT$ '"
        [conditionSummary]="formatConditions(item.conditions)"
        [authorLine]="authorLineFor(item)"
        [isbnLine]="isbnLineFor(item)"
        [coverUrl]="item.cover_url"
        (click)="goToBook(item)"
        (keydown.enter)="goToBook(item)"
        tabindex="0"
        style="cursor: pointer;"
      ></ui-listing-row>
      <p *ngIf="recentListings.length === 0 && !errorMessage" class="empty-text">{{ 'home.noListings' | t }}</p>
      <ui-pagination *ngIf="totalCount > 20" [total]="totalCount" [pageSize]="20" [currentPage]="currentPage" (pageChange)="onPageChange($event)"></ui-pagination>
    </ng-container>
  `,
  styles: [`
    .section-title {
      font-size: 20px;
      margin: 0 0 24px;
      font-weight: 600;
    }
    .text-danger {
      color: var(--flag);
    }
    .empty-text {
      color: var(--muted);
      font-size: 15px;
    }
  `]
})
export class UiRecentListings {
  @Input() set school(val: string) {
    this._school = val;
    this.fetchRecentListings();
  }
  get school() { return this._school; }
  private _school = '';

  @Input() set limit(val: number) {
    this._limit = val;
    this.fetchRecentListings();
  }
  get limit() { return this._limit; }
  private _limit = 200;

  recentListings: any[] = [];
  loading = true;
  errorMessage: string = '';
  totalCount = 0;
  currentPage = 1;

  private listingService = inject(ListingService);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      // Re-fetch when language changes so localized error/titles update if needed
      this.i18n.lang();
      this.fetchRecentListings();
    });
  }

  private fetchRecentListings() {
    this.loading = true;
    this.cdr.markForCheck();
    this.listingService.getRecentBooks(this.school, this.currentPage, this.limit).subscribe({
      next: (data) => {
        this.recentListings = data.results || data;
        this.totalCount = data.count || this.recentListings.length;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.recentListings = [];
        this.loading = false;
        this.errorMessage = this.i18n.t('common.error') || 'Error loading listings';
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.fetchRecentListings();
  }

  isAveragePrice(conditions: any): boolean {
    return conditions && Object.keys(conditions).length > 1;
  }

  formatConditions(conditions: any): string {
    if (!conditions) return '';
    return Object.entries(conditions)
      .map(([cond, count]) => `${this.i18n.t('cond.' + cond) || cond} x${count}`)
      .join(', ');
  }

  authorLineFor(item: any): string {
    return this.i18n.t('search.authorLine', { author: item.authors || '' }) || '';
  }

  isbnLineFor(item: any): string {
    return this.i18n.t('search.isbnLine', { isbn: item.isbn || '' }) || '';
  }

  trackById(index: number, item: any): any {
    return item.id;
  }

  goToBook(item: any) {
    if (typeof sessionStorage !== 'undefined') {
      const cached = {
        id: item.id,
        title: item.title,
        author: item.authors,
        isbn: item.isbn,
        coverUrl: item.cover_url,
        activeListings: 1
      };
      sessionStorage.setItem(`cachedBook_${item.isbn || item.id}`, JSON.stringify(cached));
    }
    const queryParams: any = { local_cache: 'true' };
    if (item.isbn) queryParams.isbn = item.isbn;
    else queryParams.id = item.id;
    this.router.navigate(['/book'], { queryParams });
  }
}
