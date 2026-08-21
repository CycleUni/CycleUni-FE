import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiConditionPicker } from '../../shared/ui/condition-picker.component';
import { AccountService } from '../../core/services/account.service';
import { BookService } from '../../core/services/book.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { AuthStore } from '../../core/auth.store';
import { I18nService, TPipe } from '../../core/i18n.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiDropdown, UiConditionPicker, TPipe],
  templateUrl: './sell.html',
  styleUrls: ['./sell.css']
})
export class Sell implements OnInit, OnDestroy {
  step = 1;
  searchQuery = '';
  searchResults: any[] = [];
  bookPreview: any = null;
  isLoggedIn = false;
  isVerified = false;
  isLoading = true;
  isCheckingIsbn = false;
  isSubmitting = false;
  apiError = '';
  isSearchQueryDirty = false;
  hideSearchButtonForNow = false;
  engine: 'google' | 'openlibrary' = 'google';

  isScanning = false;
  cameraError = '';
  private html5QrCode: Html5Qrcode | null = null;

  private authStore = inject(AuthStore);
  private accountService = inject(AccountService);
  private bookService = inject(BookService);
  private listingService = inject(ListingService);
  private metadataService = inject(MetadataService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private ga = inject(GoogleAnalyticsService);

  category = '';
  categoryOptions: any[] = [];

  get engineOptions() {
    return this.bookService.getEngineOptions(this.i18n);
  }

  condition = 'new';
  get conditionOptions() {
    return ['new', 'like_new', 'noted', 'damaged'].map(value => ({
      value,
      label: this.i18n.t(`cond.${value}`)
    }));
  }
  course = '';
  professor = '';
  privateNote = '';
  description = '';
  price: number | null = null;

  uploadedPhotos: string[] = [];

  isUploading = false;
  uploadError = '';
  isDragOver = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
      event.target.value = ''; // Reset input
    }
  }

  handleFile(file: File) {
    this.isUploading = true;
    this.uploadError = '';
    this.cdr.markForCheck();

    this.listingService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.uploadedPhotos.push(res.url);
        this.ga.trackEvent('upload_listing_photo');
        this.isUploading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.uploadError = this.i18n.t('sell.uploadFailed');
        this.isUploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  removePhoto(index: number) {
    const url = this.uploadedPhotos[index];
    this.uploadedPhotos.splice(index, 1);
    
    // Asynchronously tell the server to delete the physical file
    this.listingService.deletePhoto(url).subscribe({
      next: () => console.log('Successfully deleted orphaned photo from server'),
      error: (err) => console.error('Failed to delete orphaned photo from server', err)
    });
  }

  ngOnInit() {
    this.metadataService.getMetadata().subscribe({
      next: (data) => {
        if (data.categories) {
          this.categoryOptions = [{ label: this.i18n.t('sell.categoryPlaceholder'), value: '' }, ...data.categories.map((c: any) => ({
            label: c.title,
            value: c.slug
          }))];
        }
      }
    });

    if (this.authStore.isLoggedIn()) {
      this.isLoggedIn = true;
      this.accountService.getMyProfile().subscribe({
        next: (profile) => {
          this.isLoading = false;
          this.isVerified = !!profile.verified_at;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.isVerified = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.isLoggedIn = false;
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  async toggleScanner() {
    if (this.isScanning) {
      await this.stopScanner();
    } else {
      await this.startScanner();
    }
  }

  async startScanner() {
    this.cameraError = '';
    this.isScanning = true;
    this.cdr.markForCheck();

    try {
      this.html5QrCode = new Html5Qrcode("reader");
      await this.html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          this.searchQuery = decodedText;
          this.onSearchQueryChange();
          this.stopScanner().then(() => {
            this.searchBook();
          });
        },
        (errorMessage) => {
          // ignore scan errors, they happen continuously when no code is visible
        }
      );
    } catch (err) {
      console.error('Scanner error', err);
      this.cameraError = this.i18n.t('sell.cameraPermission');
      this.isScanning = false;
      this.cdr.markForCheck();
    }
  }

  async stopScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner', err);
      }
    }
    this.isScanning = false;
    this.cdr.markForCheck();
  }

  searchBook() {
    if (!this.searchQuery) return;
    this.isCheckingIsbn = true;
    this.apiError = '';
    this.isSearchQueryDirty = false;
    this.hideSearchButtonForNow = false;

    this.bookService.searchBooks(this.searchQuery, '', '', '', 1, this.engine).subscribe({
      next: (data) => {
        this.isCheckingIsbn = false;
        this.ga.trackEvent('isbn_lookup', { query: this.searchQuery, engine: this.engine });
        const items = data.results || data;
        if (items && items.length > 0) {
          this.searchResults = items;
          this.bookPreview = null;
        } else {
          this.searchResults = [];
          this.enterManually();
          this.apiError = this.i18n.t('sell.notFoundIsbn');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isCheckingIsbn = false;
        this.apiError = this.i18n.t('sell.networkError');
        this.cdr.markForCheck();
      }
    });
  }

  onSearchQueryChange() {
    this.isSearchQueryDirty = true;
    this.hideSearchButtonForNow = false;
    this.apiError = '';
  }

  selectBook(book: any) {
    this.bookPreview = book;
    this.bookPreview.authors = this.bookPreview.author || this.bookPreview.authors;
    this.bookPreview.isManual = false;
    this.hideSearchButtonForNow = true;
  }

  clearSelection() {
    this.bookPreview = null;
    this.hideSearchButtonForNow = false;
    this.apiError = '';
  }

  enterManually() {
    this.bookPreview = { title: '', authors: '', coverUrl: '', isManual: true };
    this.hideSearchButtonForNow = true;
  }

  nextStep() {
    this.apiError = '';
    this.step++;
  }

  prevStep() {
    this.apiError = '';
    this.step--;
  }

  setFree() {
    this.price = 0;
  }

  async submit() {
    this.apiError = '';

    if (this.price === null || this.price < 0) {
      this.apiError = this.i18n.t('sell.priceRequired');
      return;
    }



    if (!this.bookPreview) return;

    this.isSubmitting = true;

    const executeListingCreation = (bookId: string) => {
      const payload = {
        book: bookId,
        condition: this.condition,
        category: this.category || null,
        course_name: this.course,
        professor_name: this.professor,
        private_note: this.privateNote,
        description: this.description,
        price: this.price,
        photos: this.uploadedPhotos
      };

      this.listingService.createListing(payload).subscribe({
        next: () => {
          this.ga.trackPublishListing(this.category, this.condition, this.price);
          this.isSubmitting = false;
          this.step = 4;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          const code = err.error?.error?.code;
          this.apiError = this.i18n.t('sell.listFailed') + (code ? this.i18n.t(code) : (err.error?.error?.message || err.error?.detail || this.i18n.t('sell.unknownError')));
          this.cdr.markForCheck();
        }
      });
    };

    if (this.bookPreview.id) {
      // Book already exists in our DB
      executeListingCreation(this.bookPreview.id);
    } else {
      const fallbackIsbn = this.searchQuery.replace(/[^0-9]/g, '');
      const validFallback = (fallbackIsbn.length === 10 || fallbackIsbn.length === 13) ? fallbackIsbn : '';

      const bookData = {
        isbn13: this.bookPreview.isbn || validFallback,
        title: this.bookPreview.title,
        authors: this.bookPreview.author || this.bookPreview.authors || '',
        publisher: this.bookPreview.publisher || '',
        published_date: this.bookPreview.published_date || this.bookPreview.publishedDate || '',
        cover_url: this.bookPreview.coverUrl || '',
        source: this.bookPreview.source || 'manual'
      };

      this.bookService.createManualBook(bookData).subscribe({
        next: (createdBook) => {
          executeListingCreation(createdBook.id);
        },
        error: (err) => {
          this.isSubmitting = false;
          const code = err.error?.error?.code;
          let details = code ? this.i18n.t(code) : (err.error?.error?.message || err.error?.detail || '');
          if (!details && err.error) {
            details = JSON.stringify(err.error);
          }
          this.apiError = this.i18n.t('sell.createBookFailed', {msg: details});
          this.cdr.markForCheck();
        }
      });
    }
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  goToAccount() {
    this.router.navigate(['/account']);
  }

  goToAccountSettings() {
    this.router.navigate(['/account/settings']);
  }
}
