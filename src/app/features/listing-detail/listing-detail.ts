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
  templateUrl: './listing-detail.html',
  styleUrls: ['./listing-detail.css']
})
export class ListingDetail implements OnInit {
  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  listing: any = null;
  isLoading = true;
  errorMsg = '';
  
  allPhotos: string[] = [];
  selectedIndex: number = 0;
  otherListings: any[] = [];
  brokenPhotos = new Set<number>();

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

    // Fetch the current user's profile (browser-side only) to determine
    // whether to hide the "report" button on the user's own listing.
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
        // Fallback in case the API hangs. Running outside Angular's zone
        // so the timeout doesn't trigger unnecessary change detection.
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
        this.brokenPhotos = new Set<number>();
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

        // Fetch other listings for the same book — after the main listing loads.
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

  onImageError(index: number) {
    if (!this.brokenPhotos.has(index)) {
      this.brokenPhotos.add(index);
      this.cdr.markForCheck();
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
