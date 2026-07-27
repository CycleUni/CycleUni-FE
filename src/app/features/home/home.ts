import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { UiRecentListings } from '../../shared/ui/recent-listings.component';
import { UiSkeleton } from '../../shared/ui/skeleton.component';
import { FormsModule } from '@angular/forms';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { SchoolStateService } from '../../core/services/school-state.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChangeDetectorRef, effect } from '@angular/core';
import { I18nService, TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiRecentListings, UiSkeleton, TPipe],
  template: `
      <section class="hero-search">
        <h2 class="search-title">{{ 'home.heroTitle' | t }}</h2>
        <div class="search-bar">
          <ui-input
            [placeholder]="'common.searchPlaceholder' | t"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            class="hero-input"
          ></ui-input>
          <ui-button (onClick)="onSearch()">{{ 'common.search' | t }}</ui-button>
        </div>
        <div class="popular-tags">
          <span class="tag-label">{{ 'home.popularSearches' | t }}</span>
          <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagCalculus')">{{ 'home.tagCalculus' | t }}</button>
          <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagEconomics')">{{ 'home.tagEconomics' | t }}</button>
          <button type="button" class="tag-btn" (click)="setSearchQueryFromKey('home.tagAnatomy')">{{ 'home.tagAnatomy' | t }}</button>
        </div>
      </section>

      <!-- Categories: show skeleton during load, then the real content, never blank -->
      <section class="section">
        <h3 class="section-title">{{ 'home.categoriesTitle' | t }}</h3>
        <ng-container *ngIf="categoriesLoading || categoriesError; else categoriesLoaded">
          <ui-skeleton *ngIf="categoriesLoading && !categoriesError" [count]="2"></ui-skeleton>
          <div class="error-box" *ngIf="categoriesError">
            <p>{{ 'home.categoriesError' | t }}</p>
            <ui-button variant="ghost" (onClick)="loadMetadata()">{{ 'common.retry' | t }}</ui-button>
          </div>
        </ng-container>
        <ng-template #categoriesLoaded>
          <div class="categories-wrapper" *ngIf="categories?.length">
            <button class="scroll-btn left" *ngIf="canScrollLeft" (click)="scrollCategories(-1)">&#8249;</button>
            <div class="categories-grid" #categoriesGrid (scroll)="checkScroll()">
              <a [routerLink]="['/search']" [queryParams]="{ category: cat.slug }" class="category-card" *ngFor="let cat of categories; trackBy: trackBySlug">
                <h4>{{ cat.title }}</h4>
                <p>{{ cat.desc }}</p>
              </a>
            </div>
            <button class="scroll-btn right" *ngIf="canScrollRight" (click)="scrollCategories(1)">&#8250;</button>
          </div>
          <p class="muted-text" *ngIf="categories?.length === 0">{{ 'home.noCategories' | t }}</p>
        </ng-template>
      </section>

      <div class="two-cols">
        <section class="section flex-2">
          <ui-recent-listings [school]="currentSchool"></ui-recent-listings>
        </section>

        <section class="section flex-1">
          <h3 class="section-title">{{ 'home.waitlistTitle' | t }}</h3>
          <ng-container *ngIf="metadataLoading || waitlist; else waitlistLoaded">
            <ui-skeleton *ngIf="metadataLoading && !metadataError" [count]="2"></ui-skeleton>
          </ng-container>
          <ng-template #waitlistLoaded>
            <div class="waitlist-card" *ngIf="waitlist?.length">
              <div class="waitlist-item" *ngFor="let wait of waitlist; trackBy: trackByTitle">
                <div class="title">{{ wait.title }}</div>
                <div class="count">{{ 'home.waitingCount' | t:{n: wait.count} }}</div>
              </div>
              <ui-button variant="ghost" routerLink="/sell" style="width: 100%; margin-top: 16px;">{{ 'home.sellCta' | t }}</ui-button>
            </div>
            <p class="muted-text" *ngIf="waitlist?.length === 0">{{ 'home.waitlistEmpty' | t }}</p>
          </ng-template>
        </section>
      </div>

      <section class="section how-it-works">
        <h3 class="section-title">{{ 'home.howTitle' | t }}</h3>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-num">1</div>
            <h4>{{ 'home.step1Title' | t }}</h4>
            <p>{{ 'home.step1Desc' | t }}</p>
          </div>
          <div class="step-card">
            <div class="step-num">2</div>
            <h4>{{ 'home.step2Title' | t }}</h4>
            <p>{{ 'home.step2Desc' | t }}</p>
          </div>
          <div class="step-card">
            <div class="step-num">3</div>
            <h4>{{ 'home.step3Title' | t }}</h4>
            <p>{{ 'home.step3Desc' | t }}</p>
          </div>
        </div>
      </section>
  `,
  styles: [`
    .hero-search { padding: 64px 16px; text-align: center; background-color: var(--paper-warm); border-bottom: 1px solid var(--line); margin-bottom: 48px; }
    .search-title { font-size: 28px; margin-top: 0; margin-bottom: 32px; }
    .search-bar { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
    .hero-input { display: inline-block; width: 100%; max-width: 500px; }
    .popular-tags { font-size: 14px; color: var(--muted); }
    .tag-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 14px; margin-left: 8px; padding: 0; font-family: inherit; }
    .tag-btn:hover, .tag-btn:active { text-decoration: underline; }
    .section { max-width: 1120px; margin: 0 auto 48px; padding: 0 16px; }
    .section-title { font-size: 20px; margin-top: 0; margin-bottom: 24px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .categories-wrapper { position: relative; }
    .scroll-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; background-color: var(--paper); border: 1px solid var(--line); border-radius: 50%; font-size: 24px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; color: var(--ink); box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; }
    .scroll-btn:hover { background-color: var(--paper-warm); color: var(--accent); border-color: var(--accent); }
    .scroll-btn.left { left: 8px; }
    .scroll-btn.right { right: 8px; }
    .categories-grid { display: flex; overflow-x: auto; gap: 16px; padding-bottom: 8px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
    .categories-grid::-webkit-scrollbar { height: 6px; }
    .categories-grid::-webkit-scrollbar-track { background: transparent; }
    .categories-grid::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
    .category-card { border: 1px solid var(--line); padding: 24px; text-decoration: none; color: var(--ink); border-radius: 4px; transition: border-color 0.2s; flex: 0 0 240px; }
    .category-card:hover { border-color: var(--accent); }
    .category-card h4 { margin: 0 0 8px; font-size: 16px; }
    .category-card p { margin: 0; color: var(--muted); font-size: 14px; }
    .two-cols { max-width: 1120px; margin: 0 auto; display: flex; gap: 48px; }
    .flex-2 { flex: 2; }
    .flex-1 { flex: 1; }
    .waitlist-card { border: 1px solid var(--line); padding: 16px; border-radius: 4px; }
    .waitlist-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed var(--line); }
    .waitlist-item:last-of-type { border-bottom: none; }
    .waitlist-item .title { font-weight: 500; }
    .waitlist-item .count { color: var(--flag); font-size: 12px; font-weight: 500; }
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .step-card { border: 1px solid var(--line); padding: 32px 24px; text-align: center; border-radius: 4px; }
    .step-num { width: 40px; height: 40px; border: 1px solid var(--ink); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: 700; font-size: 18px; }
    .step-card h4 { margin: 0 0 12px; font-size: 18px; }
    .step-card p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 14px; }
    .error-box { padding: 24px; text-align: center; border: 1px solid var(--line); border-radius: 4px; background-color: var(--paper-warm); }
    .error-box p { margin: 0 0 12px; font-size: 14px; color: var(--muted); }
    .muted-text { color: var(--muted); font-size: 14px; text-align: center; padding: 24px; }

    @media (max-width: 768px) {
      .hero-search { padding: 40px 16px; margin-bottom: 32px; }
      .search-title { font-size: 22px; line-height: 1.35; margin-bottom: 24px; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
      .search-bar { flex-direction: column; align-items: stretch; }
      .hero-input { width: 100%; max-width: none; }
      .hero-input ui-input { width: 100%; display: block; }
      .hero-input ui-input, .search-bar > ui-button, .search-bar > ui-input { align-self: stretch; }
      .popular-tags { display: flex; flex-wrap: wrap; row-gap: 8px; column-gap: 12px; align-items: center; justify-content: center; }
      .tag-label { flex: 0 0 100%; margin-bottom: 4px; }
      .tag-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 14px; margin-left: 0; padding: 0; font-family: inherit; display: inline-flex; }
      .two-cols { flex-direction: column; gap: 0; }
      .two-cols .section { width: 100%; margin: 0 0 24px; }
      .steps-grid { grid-template-columns: 1fr; }
      @media(max-width: 420px) { .category-card { flex: 0 0 calc(100vw - 64px); } }
    }
  `]
})
export class Home implements OnInit, OnDestroy {
  @ViewChild('categoriesGrid') categoriesGrid?: ElementRef<HTMLDivElement>;
  canScrollLeft = false;
  canScrollRight = false;

  searchQuery = '';
  categories: any[] = [];
  waitlist: any[] = [];
  currentSchool: string = '';

  categoriesLoading = false;
  metadataLoading = false;
  metadataError = false;

  private metadataService = inject(MetadataService);
  private schoolStateService = inject(SchoolStateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private i18n = inject(I18nService);

  constructor(private router: Router) {
    effect(() => {
      this.i18n.lang();
      this.loadMetadata();
    });
  }

  private loadMetadata() {
    this.categoriesLoading = true;
    this.metadataLoading = true;
    this.metadataError = false;

    this.metadataService.getMetadata().subscribe({
      next: (data) => {
        if (data.categories) {
          this.categories = data.categories;
          setTimeout(() => this.checkScroll(), 0);
        }
        if (data.waitlist !== undefined) {
          this.waitlist = data.waitlist;
        }
        this.categoriesLoading = false;
        this.metadataLoading = false;
        this.metadataError = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep any previously-loaded data visible so the page doesn't
        // go blank on a transient failure — only clear if first load fails
        if (!this.categories) {
          this.categoriesLoading = false;
        }
        if (this.waitlist.length === 0) {
          this.metadataLoading = false;
        }
        this.metadataError = true;
        console.error('Failed to load metadata — will retry on next interaction');
        this.cdr.markForCheck();
      }
    });
  }

  retry() {
    this.loadMetadata();
  }

  ngOnInit() {
    this.schoolStateService.selectedSchool$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(school => {
      this.currentSchool = school;
      this.cdr.markForCheck();
    });
  }

  @HostListener('window:resize')
  onResize() { this.checkScroll(); }

  checkScroll() {
    if (!this.categoriesGrid) return;
    const el = this.categoriesGrid.nativeElement;
    this.canScrollLeft = el.scrollLeft > 0;
    this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    this.cdr.detectChanges();
  }

  scrollCategories(direction: number) {
    if (!this.categoriesGrid) return;
    const el = this.categoriesGrid.nativeElement;
    el.scrollBy({ left: el.clientWidth * 0.8 * direction, behavior: 'smooth' });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() },
        replaceUrl: true
      });
    }
  }

  setSearchQuery(tag: string) { this.searchQuery = tag; this.onSearch(); }

  setSearchQueryFromKey(key: string) {
    const translated = this.i18n.t(key);
    if (translated && translated !== key) {
      this.setSearchQuery(translated);
    }
  }

  trackById(idx: number, item: any): any { return item.id || idx; }
  trackBySlug(idx: number, cat: any): string { return cat.slug; }
  trackByTitle(idx: number, wait: any): string { return wait.title; }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}