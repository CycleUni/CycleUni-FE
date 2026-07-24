import { Component, OnInit, inject, ChangeDetectorRef, effect, ViewChild, ElementRef, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ListingService } from '../../core/services/listing.service';
import { BookService } from '../../core/services/book.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiBackButton } from '../../shared/ui/back-button.component';
import { UiListingCard } from '../../shared/ui/listing-card.component';
import { TPipe, I18nService } from '../../core/i18n.service';
import { AuthStore } from '../../core/auth.store';
import { BookCoverPipe } from '../../shared/pipes/book-cover.pipe';
import { AccountService } from '../../core/services/account.service';
import { ReportModalComponent } from './report-modal.component';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, UiButton, UiBackButton, UiListingCard, TPipe, ReportModalComponent],
  template: `
    <main class="container">
      <ui-back-button></ui-back-button>

      <div *ngIf="isLoading" class="loading">{{ 'sell.searching' | t }}</div>
      
      <div *ngIf="!isLoading && listing" class="product-layout">
        
        <!-- Left Column: Image Gallery -->
        <div class="gallery-col">
          <div class="main-image-wrapper">
            
            <div class="carousel-track" #carouselTrack (scroll)="onScroll()">
              <div class="carousel-slide" *ngFor="let photo of allPhotos">
                <img [src]="photo" alt="Book Cover" class="main-image" />
              </div>
              <div class="carousel-slide" *ngIf="allPhotos.length === 0">
                <div class="placeholder-cover">
                  <span>{{ 'book.noPhoto' | t }}</span>
                </div>
              </div>
            </div>

            <button class="nav-btn prev-btn" *ngIf="allPhotos.length > 1" (click)="scrollGallery(-1)">&#10094;</button>
            <button class="nav-btn next-btn" *ngIf="allPhotos.length > 1" (click)="scrollGallery(1)">&#10095;</button>
          </div>
          
          <div class="thumbnails" *ngIf="allPhotos.length > 1">
            <div 
              *ngFor="let photo of allPhotos; let i = index" 
              class="thumbnail" 
              [class.active]="i === selectedIndex"
              (click)="selectPhoto(i)">
              <img [src]="photo" alt="Thumbnail" />
            </div>
          </div>
        </div>

        <!-- Right Column: Details & Actions -->
        <div class="details-col">
          <h1 class="book-title-serif">{{ listing.book_title }}</h1>
          <p class="book-authors">{{ listing.book_authors }}</p>
          
          <a [routerLink]="['/book']" [queryParams]="{ isbn: listing.isbn }" class="book-link" [innerHTML]="'sell.viewOtherListings' | t">
          </a>

          <div class="price-condition-row">
            <div class="price">NT$ {{ listing.price }}</div>
            <div class="condition-badge" [ngClass]="listing.condition">
              {{ ('cond.' + listing.condition) | t }}
            </div>
          </div>

          <div class="seller-box clickable" [routerLink]="['/seller', listing.seller]">
            <div class="seller-header">
              <div class="seller-avatar" *ngIf="!listing.seller_avatar_url">{{ listing.seller_name.charAt(0) }}</div>
              <div class="seller-avatar-image-container" *ngIf="listing.seller_avatar_url">
                <img [src]="listing.seller_avatar_url" alt="Avatar" class="seller-avatar-image" referrerpolicy="no-referrer">
              </div>
              <div class="seller-info-text">
                <div class="seller-name">{{ listing.seller_name }}</div>
                <div class="seller-school">{{ listing.school_name || ('acct.noSchool' | t) }}</div>
              </div>
            </div>
          </div>

          <div class="info-list">
            <div class="info-row" *ngIf="listing.course_name">
              <span class="info-label">{{ 'sell.course' | t }}</span>
              <span class="info-value">{{ listing.course_name }}</span>
            </div>
            <div class="info-row" *ngIf="listing.description">
              <span class="info-label">{{ 'sell.note' | t }}</span>
              <span class="info-value note-box">{{ listing.description }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">ISBN</span>
              <span class="info-value" style="font-family: monospace;">{{ listing.isbn }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <ui-button style="flex: 1; font-size: 16px; padding: 12px;" (onClick)="buyNow()">
              {{ 'checkout.buyNow' | t }}
            </ui-button>
            <ui-button variant="white" style="flex: 1; font-size: 16px; padding: 12px;" (onClick)="contactSeller()">
              {{ 'checkout.contactSeller' | t }}
            </ui-button>
          </div>

          <button
            *ngIf="canReport()"
            type="button"
            class="report-link"
            (click)="openReportModal()"
          >
            {{ 'moderation.reportButton' | t }}
          </button>

          <div *ngIf="reportConfirmationMsg" class="report-confirmation">
            {{ reportConfirmationMsg }}
          </div>
        </div>

      </div>

      <app-report-modal
        *ngIf="showReportModal && listing"
        [listingId]="listing.id"
        (closed)="closeReportModal()"
        (submitted)="onReportSubmitted()"
      ></app-report-modal>

      <div class="other-listings-section" *ngIf="otherListings.length > 0">
        <h3 class="section-title">{{ 'sell.otherSellersTitle' | t }}</h3>
        <div class="listings-grid">
          <ui-listing-card
            *ngFor="let item of otherListings; trackBy: trackById"
            [item]="item"
            (onClickCard)="goToListing($event)"
            (onBuyNow)="buyNowOther($event)"
            (onContactSeller)="contactSellerOther($event)"
          ></ui-listing-card>
        </div>
      </div>

      <div *ngIf="errorMsg" class="empty-state">{{ errorMsg }}</div>
    </main>
  `,
  styles: [`
    .container { 
      max-width: 1000px; 
      margin: 40px auto; 
      padding: 0 16px;
    }
    
    .product-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
      background: var(--paper);
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
    }
    
    @media (min-width: 768px) {
      .product-layout {
        grid-template-columns: 400px 1fr;
      }
    }

    /* Other Sellers Section */
    .other-listings-section {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid var(--line);
    }
    .section-title {
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 24px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--line);
    }
    .listings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    @media (max-width: 768px) {
      .listings-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Gallery */
    .gallery-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .main-image-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 4;
      background: var(--paper-warm);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .carousel-track {
      display: flex;
      width: 100%;
      height: 100%;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      -ms-overflow-style: none;
      -webkit-overflow-scrolling: touch;
    }
    .carousel-track::-webkit-scrollbar {
      display: none;
    }
    .carousel-slide {
      flex: 0 0 100%;
      height: 100%;
      scroll-snap-align: start;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .main-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .placeholder-cover {
      color: var(--muted);
      font-size: 16px;
    }
    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.3);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }
    .main-image-wrapper:hover .nav-btn {
      opacity: 1;
    }
    .nav-btn:hover {
      background: rgba(0,0,0,0.6);
    }
    .prev-btn { left: 8px; }
    .next-btn { right: 8px; }
    .thumbnails {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .thumbnail {
      width: 80px;
      height: 80px;
      border: 2px solid transparent;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      opacity: 0.7;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .thumbnail:hover {
      opacity: 1;
    }
    .thumbnail.active {
      border-color: var(--accent);
      opacity: 1;
    }
    .thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Details */
    .details-col {
      display: flex;
      flex-direction: column;
    }
    .book-title-serif {
      font-family: 'Noto Serif TC', serif;
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .book-authors {
      font-size: 16px;
      color: var(--muted);
      margin: 0 0 16px 0;
    }
    .book-link {
      display: inline-block;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 32px;
      padding-bottom: 4px;
      border-bottom: 1px dashed var(--accent);
      transition: opacity 0.2s;
    }
    .book-link:hover {
      opacity: 0.8;
    }

    .price-condition-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }
    .price {
      font-size: 36px;
      font-weight: 800;
      color: var(--accent);
    }
    .condition-badge {
      font-size: 14px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 4px;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
    }

    /* Seller Box */
    .seller-box {
      background: var(--paper-warm);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 32px;
    }
    .seller-box.clickable {
      cursor: pointer;
      transition: filter 0.2s ease;
    }
    .seller-box.clickable:hover {
      filter: brightness(0.95);
    }
    .seller-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .seller-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
    }
    .seller-avatar-image-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
    }
    .seller-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .seller-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .seller-school {
      font-size: 14px;
      color: var(--muted);
    }

    /* Info List */
    .info-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 40px;
    }
    .info-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .info-label {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }
    .info-value {
      font-size: 16px;
      line-height: 1.5;
    }
    .note-box {
      background: #fdfdfd;
      border-left: 4px solid var(--line);
      padding: 12px 16px;
      color: var(--ink);
      font-style: italic;
    }

    /* Actions */
    .action-buttons {
      display: flex;
      gap: 16px;
      margin-top: auto;
    }
    
    @media (max-width: 600px) {
      .action-buttons {
        flex-direction: column;
      }
    }

    .report-link {
      align-self: flex-start;
      margin-top: 16px;
      background: none;
      border: none;
      padding: 0;
      color: var(--muted);
      font-size: 13px;
      text-decoration: underline;
      cursor: pointer;
    }
    .report-link:hover {
      color: var(--flag);
    }
    .report-confirmation {
      margin-top: 12px;
      font-size: 14px;
      color: var(--accent);
    }

    .loading { padding: 40px; text-align: center; color: var(--muted); }
    .empty-state { padding: 64px 24px; text-align: center; color: var(--muted); background: var(--paper); border-radius: 12px; border: 1px solid var(--line); }
  `]
})
export class ListingDetail implements OnInit {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  listing: any = null;
  isLoading = true;
  errorMsg = '';
  
  allPhotos: string[] = [];
  selectedIndex: number = 0;
  otherListings: any[] = [];

  showReportModal = false;
  reportConfirmationMsg = '';
  private currentUserId: string | number | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listingService = inject(ListingService);
  private bookService = inject(BookService);
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthStore);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  readonly i18n = inject(I18nService);

  private currentId: string | null = null;

  constructor() {
    effect(() => {
      // Re-fetch listing when language changes so that backend translated fields (e.g. school_name, course_name) update.
      this.i18n.lang();
      if (this.currentId) {
        this.loadListing(this.currentId);
      }
    });

    // Personalized content only renders after client hydration; SSR always
    // outputs the guest view. This fetches the current user's own id from
    // /auth/me/, browser-side only and only when logged in, to decide whether
    // the "report" button should be hidden on the user's own listing.
    effect(() => {
      if (isPlatformBrowser(this.platformId) && this.auth.isLoggedIn()) {
        this.accountService.getMyProfile().subscribe({
          next: (profile) => {
            this.currentUserId = profile?.id ?? null;
            this.cdr.markForCheck();
          },
          error: () => {
            // If the profile fetch fails, stay conservative (don't show the
            // report button) rather than risk mistaking someone else's listing for the user's own.
          }
        });
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const newId = params.get('id');
      this.currentId = newId;
      if (newId) {
        this.isLoading = true;
        this.otherListings = [];
        this.errorMsg = '';
        this.cdr.markForCheck();
        this.loadListing(newId);
        // Fallback in case the API hangs. Scheduled outside Angular's zone
        // so it doesn't count as a pending task for SSR — a plain
        // setTimeout inside the zone makes Angular Universal wait out the
        // full 8s on every server render before it'll send the response,
        // even on a normal fast load where this timeout is a no-op by the
        // time it fires (isLoading is already false from loadListing()).
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            if (this.isLoading && this.currentId === newId) {
              this.ngZone.run(() => {
                this.isLoading = false;
                this.errorMsg = this.i18n.t('alert.loadingTimeout') ?? 'Failed to load listing.';
                this.cdr.markForCheck();
              });
            }
          }, 8000);
        });
      } else {
        this.isLoading = false;
        this.errorMsg = this.i18n.t('alert.bookNotFound');
        this.cdr.markForCheck();
      }
    });
  }


  private loadListing(id: string) {
    this.listingService.getListing(id).subscribe({
      next: (data) => {
        this.listing = data;
        this.isLoading = false;
        
        // Setup photos array (combine user uploaded photos + book cover)
        this.allPhotos = [];
        if (data.photos && data.photos.length > 0) {
          this.allPhotos.push(...data.photos);
        }
        // Apply zoom=3 to Google Books cover for max resolution
        const coverUrl = data.book_cover_url
          ? new BookCoverPipe().transform(data.book_cover_url, 3)
          : null;
        if (coverUrl && !this.allPhotos.includes(coverUrl)) {
          this.allPhotos.push(coverUrl);
        }
        this.selectedIndex = 0;

        // Fetch other listings for the same book — client-side only. This
        // section isn't SEO-relevant content (the route is SSR'd for the
        // listing itself, not its cross-sell list), and Angular's SSR
        // blocks the whole response on every outstanding HTTP call, so
        // chaining this one after getListing() was doubling the server
        // render's latency on every refresh for no visible benefit before
        // hydration. Skipping it on the server keeps the response bound to
        // a single round trip; it still loads moments after hydration.
        const bookIdentifier = data.isbn || data.book;
        if (bookIdentifier && isPlatformBrowser(this.platformId)) {
          this.bookService.getBook(bookIdentifier).subscribe({
            next: (bookData) => {
              if (bookData && bookData.listings) {
                const listingsArray = Array.isArray(bookData.listings) 
                  ? bookData.listings 
                  : bookData.listings.results || [];
                this.otherListings = listingsArray.filter((l: any) => l.id !== this.listing.id);
                this.cdr.markForCheck();
              }
            }
          });
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = this.i18n.t('alert.bookNotFound');
        this.cdr.markForCheck();
      }
    });
  }

  buyNow() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/account'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.listing?.id) {
      this.router.navigate(['/checkout', this.listing.id]);
    }
  }

  buyNowOther(id: string) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/account'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.router.navigate(['/checkout', id]);
  }

  contactSeller() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/account'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.listing?.id) {
      this.router.navigate(['/messages'], { queryParams: { listing: this.listing.id } });
    }
  }

  contactSellerOther(id: string) {
    this.goToListing(id);
  }

  selectPhoto(index: number) {
    if (!this.carouselTrack) return;
    const el = this.carouselTrack.nativeElement;
    el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' });
  }

  scrollGallery(direction: number) {
    if (!this.carouselTrack) return;
    const el = this.carouselTrack.nativeElement;
    const scrollAmount = el.clientWidth;
    el.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
  }

  onScroll() {
    if (!this.carouselTrack) return;
    const el = this.carouselTrack.nativeElement;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (this.selectedIndex !== index) {
      this.selectedIndex = index;
      this.cdr.detectChanges();
    }
  }

  goToListing(id: string) {
    this.router.navigate(['/listing', id]);
  }

  // Only show the report button when logged in and the listing isn't the user's own.
  canReport(): boolean {
    if (!this.listing || !this.auth.isLoggedIn() || this.currentUserId === null) {
      return false;
    }
    return String(this.listing.seller) !== String(this.currentUserId);
  }

  openReportModal() {
    this.reportConfirmationMsg = '';
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  onReportSubmitted() {
    this.showReportModal = false;
    this.reportConfirmationMsg = this.i18n.t('moderation.reportSubmitted');
    this.cdr.markForCheck();
  }

  trackById(index: number, item: any): any {
    return item.id || index;
  }
}
