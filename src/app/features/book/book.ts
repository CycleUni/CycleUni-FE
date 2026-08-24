import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { UiBackButton } from '../../shared/ui/back-button.component';
import { BookService } from '../../core/services/book.service';
import { MessageService } from '../../core/services/message.service';
import { AccountService } from '../../core/services/account.service';
import { AuthStore } from '../../core/auth.store';
import { ChangeDetectorRef } from '@angular/core';
import { I18nService, TPipe } from '../../core/i18n.service';
import { SchoolStateService } from '../../core/services/school-state.service';
import { UiListingCard } from '../../shared/ui/listing-card.component';
import { UiBookCover } from '../../shared/ui/book-cover.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [CommonModule, RouterModule, UiButton, UiBackButton, TPipe, UiListingCard, UiBookCover, UiPagination],
  template: `
      <div class="container" *ngIf="book">
        <ui-back-button></ui-back-button>

        <div class="book-header">
          <div class="book-cover">
            <ui-book-cover
              [coverUrl]="book.cover_url"
              [title]="book.title"
              [author]="book.authors"
              [isbn]="book.isbn13"
              [zoom]="2"
            ></ui-book-cover>
          </div>
          <div class="book-info">
            <h2 class="book-title">{{ book.title }}</h2>
            <div class="meta-list">
              <div class="meta-row">
                <span class="meta-label">{{ 'book.author' | t }}</span>
                <span class="meta-value">{{ book.authors }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">{{ 'book.publisher' | t }}</span>
                <span class="meta-value">{{ book.publisher }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">{{ 'book.year' | t }}</span>
                <span class="meta-value">{{ book.published_date }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">ISBN</span>
                <span class="meta-value" style="font-family: monospace;">{{ book.isbn13 }}</span>
              </div>
            </div>
            <div class="waitlist-banner" [class.hot]="book.waiting_count > 0" *ngIf="!isLoadingListings && totalListings === 0">
              <span class="waitlist-count" [class.hot]="book.waiting_count > 0">
                {{ (book.waiting_count > 0 ? 'book.waitingBanner' : 'book.waitingBannerZero') | t:{n: book.waiting_count} }}
              </span>
              <ui-button *ngIf="!book.is_subscribed" variant="white" (onClick)="subscribeBook()">{{ 'search.notifyMe' | t }}</ui-button>
              <ui-button *ngIf="book.is_subscribed" variant="white" style="color: var(--muted); border-color: var(--muted);" (onClick)="unsubscribeBook()">{{ 'search.cancelNotify' | t }}</ui-button>
            </div>
          </div>
        </div>

        <div class="listings-section">
          <h3 class="section-heading" *ngIf="!isLoadingListings">{{ 'book.currentListings' | t:{n: totalListings} }}</h3>
          <h3 class="section-heading" *ngIf="isLoadingListings">{{ 'book.currentListings' | t:{n: '-'} }}</h3>
          
          <div class="no-local-alert" *ngIf="!isLoadingListings && listings.length > 0 && localListingsCount === 0 && currentSchool">
            {{ 'search.noLocalListings' | t:{school: currentSchoolLabel} }}
          </div>

          <div class="listings-grid" *ngIf="!isLoadingListings && listings.length > 0">
            <ui-listing-card *ngFor="let item of listings" 
              [item]="item"
              (onClickCard)="openListing($event)"
              (onBuyNow)="buyNow($event)"
              (onContactSeller)="contactSeller($event)"
            ></ui-listing-card>
          </div>
          
          <ui-pagination *ngIf="!isLoadingListings && totalListings > 20" [total]="totalListings" [pageSize]="20" [currentPage]="currentPage" (pageChange)="onPageChange($event)"></ui-pagination>

          <div class="empty-state" *ngIf="!isLoadingListings && listings.length === 0">
            <p>{{ 'book.emptyState' | t }}</p>
          </div>
        </div>
      </div>
  `,
  styles: [`
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    
    .book-header {
      display: flex;
      gap: 32px;
      margin-bottom: 48px;
    }
    .book-cover {
      width: 200px;
      height: 280px;
      background-color: var(--line);
      flex-shrink: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      transform: rotate(-1.4deg);
    }
    .book-info {
      flex: 1;
    }
    .book-title {
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 28px;
      font-family: 'Noto Serif TC', serif;
      font-weight: 700;
      border-bottom: 2px solid var(--line);
      padding-bottom: 12px;
    }
    
    .meta-list {
      margin-bottom: 32px;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 120px 1fr;
      padding: 12px 0;
      border-top: 1px solid var(--line);
      font-size: 15px;
    }
    .meta-row:first-child {
      border-top: none;
    }
    .meta-label {
      color: var(--muted);
      font-weight: 500;
    }
    .meta-value {
      color: var(--ink);
    }

    .waitlist-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
      border-radius: 4px;
    }
    .waitlist-banner.hot {
      background-color: var(--flag-light);
      border: 1px solid var(--flag-border);
    }
    .waitlist-count {
      color: var(--muted);
      font-weight: 500;
      font-size: 16px;
    }
    .waitlist-count.hot {
      color: var(--flag);
      font-weight: 700;
    }

    .listings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .no-local-alert {
      padding: 12px 16px;
      margin-bottom: 24px;
      background-color: var(--danger-light, #fee2e2);
      color: var(--danger, #ef4444);
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }
    .course-info {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      background-color: var(--paper-warm);
    }

    @media (max-width: 768px) {
      .book-header {
        flex-direction: column;
        gap: 24px;
        margin-bottom: 32px;
      }
      .book-cover {
        width: 140px;
        height: 196px;
        margin: 8px auto;
      }
      .book-title {
        font-size: 22px;
      }
      .meta-row {
        grid-template-columns: 88px 1fr;
        padding: 8px 0;
        font-size: 14px;
      }
      .waitlist-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
      }
      .listings-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class Book implements OnInit {
  bookId: string | null = null;
  book: any = null;
  listings: any[] = [];
  totalListings = 0;
  localListingsCount = -1;
  currentSchool = '';
  currentPage = 1;
  isLoadingListings = true;
  private isLocalCache = false;
  // Which external catalogue to query when this ISBN isn't in our own DB
  // yet — defaults to 'googlebooks' server-side. Threaded through from the
  // route so a link built from a search result (rendered via a specific
  // engine, see search.ts's bookLinkParams) fetches from that same engine
  // instead of falling back to whichever one this page defaults to, which
  // is what caused the same ISBN to show a different cover here than on
  // the search result it was opened from.
  private engine: string | null = null;

  get currentSchoolLabel(): string {
    return this.schoolStateService.getSchoolLabel(this.currentSchool);
  }

  private bookService = inject(BookService);
  private messageService = inject(MessageService);
  private accountService = inject(AccountService);
  private auth = inject(AuthStore);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private schoolStateService = inject(SchoolStateService);

  isVerified = false;
  private isFirstSchoolEmission = true;

  constructor(private route: ActivatedRoute, private router: Router) {
    effect(() => {
      this.i18n.lang();
      if (this.bookId && !this.isLocalCache) {
        this.fetchBook();
      }
    });
  }

  ngOnInit() {
    this.schoolStateService.selectedSchool$.subscribe(school => {
      const prev = this.currentSchool;
      this.currentSchool = school;
      
      const wasFirstEmission = this.isFirstSchoolEmission;
      this.isFirstSchoolEmission = false;
      
      if (!wasFirstEmission && prev !== school && this.bookId && !this.isLocalCache) {
        this.fetchBook(true);
      } else {
        this.sortListings();
      }
      this.cdr.markForCheck();
    });

    this.schoolStateService.schools$.subscribe(() => {
      this.cdr.markForCheck();
    });

    this.route.queryParamMap.subscribe(params => {
      this.bookId = params.get('isbn') || params.get('id');
      this.engine = params.get('engine') === 'openlibrary' ? 'openlibrary' : null;
      const localCache = params.get('local_cache');

      if (this.bookId) {
        if (localCache === 'true') {
          if (typeof sessionStorage !== 'undefined') {
            const cachedStr = sessionStorage.getItem(`cachedBook_${this.bookId}`);
            if (cachedStr) {
              try {
                const cached = JSON.parse(cachedStr);
                this.book = {
                  id: cached.id || '',
                  isbn13: cached.isbn || cached.isbn13 || '',
                  title: cached.title,
                  authors: cached.author || cached.authors || '',
                  publisher: cached.publisher || '',
                  published_date: cached.published_date || '',
                  cover_url: cached.coverUrl || cached.cover_url || '',
                  source: 'manual',
                  listings: { count: 0, results: [] },
                  waiting_count: cached.waitlistCount ?? 0,
                  is_subscribed: cached.is_subscribed ?? false,
                  subscription_id: cached.subscription_id ?? null
                };
                this.isLocalCache = true;
                this.cdr.markForCheck();
                // The cached search result carries everything except the
                // actual listings, so hit the backend to get the real status
                this.fetchBook(true);
              } catch (e) {
                this.isLocalCache = false;
                this.fetchBook();
              }
            } else {
              this.isLocalCache = false;
              this.fetchBook();
            }
          } else {
            // Not in a browser environment (sessionStorage unavailable) — skip fetch.
            this.isLocalCache = true;
            // Nothing will resolve the loading state on this branch, so clear it
            // here or the listings section stays blank forever.
            this.isLoadingListings = false;
          }
        } else {
          this.isLocalCache = false;
          this.fetchBook();
        }
      }
    });

    if (this.auth.isLoggedIn()) {
      this.accountService.getMyProfile().subscribe({
        next: (profile) => {
          this.isVerified = !!profile.verified_at;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isVerified = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  private fetchBook(silent = false) {
    this.isLoadingListings = true;
    // A silent refresh of an already-cached preview is only supposed to
    // supplement it with real listing status, not replace it — but when the
    // book has no local DB row, this refetch re-runs the same kind of
    // external lookup that produced the cached preview in the first place,
    // and Open Library (and Google Books) can return a different edition's
    // title/cover for a plain ISBN lookup than their own search endpoint
    // just showed on the search page (confirmed: their /api/books ISBN
    // endpoint and /search.json endpoint aren't guaranteed to agree). Since
    // the cached preview is exactly what the user just saw and clicked,
    // prefer it over a possibly-worse live re-lookup for this identity data.
    const previewToKeep = (silent && this.isLocalCache) ? this.book : null;
    this.bookService.getBook(this.bookId!, this.currentPage, this.currentSchool, this.engine ?? undefined).subscribe({
      next: (data) => {
        // `data.id` set means this came from our own catalog (an
        // authoritative record), not another external lookup — always
        // trust that over the preview.
        this.book = (previewToKeep && !data.id)
          ? { ...previewToKeep, listings: data.listings, waiting_count: data.waiting_count, is_subscribed: data.is_subscribed, subscription_id: data.subscription_id }
          : data;
        // handle both raw array (old API) or paginated object (new API)
        if (data.listings && !Array.isArray(data.listings)) {
          this.listings = data.listings.results || [];
          this.totalListings = data.listings.count || this.listings.length;
        } else {
          this.listings = data.listings || [];
          this.totalListings = this.listings.length;
        }
        this.localListingsCount = data.local_listings_count ?? -1;
        this.isLoadingListings = false;
        this.isLocalCache = false;
        this.sortListings();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingListings = false;
        this.isLocalCache = false;
        // A silent fetch only supplements an already-rendered preview;
        // keep showing the preview instead of alarming the user
        if (!silent) {
          alert(this.i18n.t('alert.bookNotFound'));
        }
        this.cdr.markForCheck();
      }
    });
  }

  sortListings() {
    if (this.currentSchool && this.listings.length > 0) {
      const currentSchoolId = this.schoolStateService.getSchoolId(this.currentSchool);
      this.listings.sort((a, b) => {
        const aLocal = a.seller_school_id === currentSchoolId ? 1 : 0;
        const bLocal = b.seller_school_id === currentSchoolId ? 1 : 0;
        return bLocal - aLocal;
      });
    }
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.fetchBook();
  }

  getConditionLabel(cond: string): string {
    const translated = this.i18n.t(`cond.${cond}`);
    return translated === `cond.${cond}` ? cond : translated;
  }

  contactSeller(listingId: string) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/account'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (!this.isVerified) {
      if (confirm(this.i18n.t('alert.verifyToContact'))) {
        this.router.navigate(['/account']);
      }
      return;
    }

    // Get-or-create the conversation for this listing so we navigate with a
    // real conversation id, not the listing id (they're different UUIDs).
    this.messageService.startConversation(listingId).subscribe({
      next: (conv) => {
        this.router.navigate(['/messages'], { queryParams: { chat: conv.id } });
      },
      error: (err) => alert(err.error?.error || this.i18n.t('alert.conversationFailed'))
    });
  }

  openListing(listingId: string) { // navigate to listing detail
    this.router.navigate(['/listing', listingId]);
  }

  buyNow(listingId: string) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/account'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/checkout', listingId]);
  }

  subscribeBook() {
    if (!this.auth.isLoggedIn()) {
      alert(this.i18n.t('alert.loginToSubscribe'));
      this.router.navigate(['/account']);
      return;
    }
    if (this.bookId) {
      this.bookService.subscribe(this.bookId).subscribe({
        next: (res) => {
          alert(this.i18n.t('alert.subscribed'));
          if (this.book) {
            this.book.waiting_count++;
            this.book.is_subscribed = true;
            this.book.subscription_id = res.id;
            this.cdr.markForCheck();
          }
        },
        error: () => alert(this.i18n.t('alert.subscribeFailed'))
      });
    }
  }

  unsubscribeBook() {
    if (this.book && this.book.subscription_id) {
      this.bookService.unsubscribe(this.book.subscription_id).subscribe({
        next: () => {
          alert(this.i18n.t('alert.unsubscribed'));
          this.book.waiting_count--;
          this.book.is_subscribed = false;
          this.book.subscription_id = null;
          this.cdr.markForCheck();
        },
        error: () => alert(this.i18n.t('alert.unsubscribeFailed'))
      });
    }
  }
}
