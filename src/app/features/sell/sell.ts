import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiConditionPicker } from '../../shared/ui/condition-picker.component';
import { UiBookCover } from '../../shared/ui/book-cover.component';
import { UiVerificationPrompt } from '../../shared/ui/verification-prompt.component';
import { AccountService } from '../../core/services/account.service';
import { BookService } from '../../core/services/book.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { AuthStore } from '../../core/auth.store';
import { I18nService, TPipe } from '../../core/i18n.service';
import { GoogleAnalyticsService } from '../../core/services/google-analytics.service';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Cleans and validates an ISBN string (mirroring backend clean_and_validate_isbn).
 * Strips hyphens and whitespace, uppercases 'X', and validates:
 * - ISBN-13: exactly 13 digits (EAN-13)
 * - ISBN-10: exactly 10 characters (first 9 digits, last char digit or 'X')
 * Returns the cleaned ISBN string if valid, or null if invalid.
 */
export function cleanAndValidateIsbn(isbnStr: string | null | undefined): string | null {
  if (!isbnStr) {
    return null;
  }
  const rawIsbn = String(isbnStr).replace(/[-\s]/g, '').toUpperCase();
  const isAllDigits = /^\d+$/.test(rawIsbn);
  const is10WithX = rawIsbn.length === 10 && /^\d{9}[0-9X]$/.test(rawIsbn);
  if (isAllDigits || is10WithX) {
    if (rawIsbn.length === 10 || rawIsbn.length === 13) {
      return rawIsbn;
    }
  }
  return null;
}

export const clean_and_validate_isbn = cleanAndValidateIsbn;

/**
 * Verifies the ISBN-10/13 check digit. Deliberately kept separate from
 * cleanAndValidateIsbn (which mirrors the backend's format-only check used
 * for typed search input) — a camera misread can produce a string that's
 * the right length and all-digit but numerically wrong, which a checksum
 * catches and a length/format check alone cannot.
 */
export function isValidIsbnChecksum(isbn: string): boolean {
  if (isbn.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === Number(isbn[12]);
  }
  if (isbn.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += Number(isbn[i]) * (10 - i);
    }
    const last = isbn[9] === 'X' ? 10 : Number(isbn[9]);
    sum += last;
    return sum % 11 === 0;
  }
  return false;
}

/**
 * Selects the most appropriate rear camera from available video devices,
 * avoiding ultra-wide and telephoto lenses which suffer from poor close-up focus on iOS.
 */
export function selectBestRearCamera(devices: { id: string; label: string }[] | null | undefined): string | null {
  if (!devices || devices.length === 0) return null;

  // Filter out front-facing cameras
  const frontRegex = /front|user|前置|前相機|前鏡頭|facetime|selfie/i;
  const backDevices = devices.filter(d => !frontRegex.test(d.label || ''));
  const candidates = backDevices.length > 0 ? backDevices : devices;

  // Avoid ultra-wide and telephoto lenses
  const ultraWideRegex = /ultra[\s-]?wide|0\.5x|超廣角/i;
  const telephotoRegex = /telephoto|望遠|長焦|[2-9]x/i;

  const normalBackCameras = candidates.filter(d =>
    !ultraWideRegex.test(d.label || '') && !telephotoRegex.test(d.label || '')
  );

  if (normalBackCameras.length > 0) {
    // If there is one explicitly labeled as main / wide / back camera, prefer it
    const preferred = normalBackCameras.find(d =>
      /back camera|main|廣角|後置|後相機/i.test(d.label || '')
    );
    return preferred ? preferred.id : normalBackCameras[0].id;
  }

  return candidates[0]?.id || null;
}

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiDropdown, UiConditionPicker, UiBookCover, UiVerificationPrompt, TPipe],
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
  showUnverifiedPrompt = false;
  isLoading = true;
  isCheckingIsbn = false;
  isSubmitting = false;
  apiError = '';
  isSearchQueryDirty = false;
  hideSearchButtonForNow = false;
  engine: 'googlebooks' | 'openlibrary' = 'googlebooks';

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
          // Both triggers for this banner — landing here unverified, and a
          // later submit blocked by a stale 403 — must go through the same
          // flag, or the dismiss button only silences one of the two paths.
          if (!this.isVerified) this.showUnverifiedPrompt = true;
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

  cleanAndValidateIsbn(isbnStr: string | null | undefined): string | null {
    return cleanAndValidateIsbn(isbnStr);
  }

  handleScanResult(decodedText: string): boolean {
    const validIsbn = cleanAndValidateIsbn(decodedText);
    if (!validIsbn || !isValidIsbnChecksum(validIsbn)) {
      const errorMsg = this.i18n.t('sell.invalidBarcodeScanned');
      if (this.cameraError !== errorMsg) {
        this.cameraError = errorMsg;
        this.cdr.markForCheck();
      }
      return false;
    }

    this.cameraError = '';
    this.searchQuery = validIsbn;
    this.onSearchQueryChange();
    this.stopScanner().then(() => {
      this.searchBook();
    });
    return true;
  }

  async startScanner() {
    this.cameraError = '';
    this.isScanning = true;
    this.cdr.markForCheck();

    try {
      if (this.html5QrCode && this.html5QrCode.isScanning) {
        await this.stopScanner();
      }
      this.html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      // Try camera enumeration to pick standard wide rear camera if available
      let selectedDeviceId: string | null = null;
      try {
        const devices = await Html5Qrcode.getCameras();
        selectedDeviceId = selectBestRearCamera(devices);
      } catch (e) {
        // Device enumeration can fail if permissions not yet granted or unsupported; fall back to facingMode
        console.warn('Camera enumeration fallback to facingMode', e);
      }

      const qrboxFn = (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.max(Math.floor(viewfinderWidth * 0.9), 250);
        const height = Math.min(
          Math.max(Math.floor(viewfinderHeight * 0.6), 160),
          Math.max(viewfinderHeight - 20, 50)
        );
        return {
          width: Math.min(width, viewfinderWidth),
          height: Math.min(height, viewfinderHeight)
        };
      };

      const primaryConfig = {
        fps: 10,
        qrbox: qrboxFn,
        videoConstraints: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          : {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
      };

      const cameraIdOrConfig = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : { facingMode: "environment" };

      try {
        await this.html5QrCode.start(
          cameraIdOrConfig,
          primaryConfig,
          (decodedText) => {
            this.handleScanResult(decodedText);
          },
          (errorMessage) => {
            // ignore scan errors, they happen continuously when no code is visible
          }
        );
      } catch (startErr) {
        console.warn('Initial camera start failed, retrying with fallback constraints', startErr);
        // Fallback retry with simplest constraints in case resolution negotiation fails
        await this.html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: qrboxFn,
            videoConstraints: { facingMode: "environment" }
          },
          (decodedText) => {
            this.handleScanResult(decodedText);
          },
          (errorMessage) => {
            // ignore scan errors
          }
        );
      }
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
    if (this.cameraError === this.i18n.t('sell.invalidBarcodeScanned')) {
      this.cameraError = '';
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

    if (!this.isVerified) {
      this.showUnverifiedPrompt = true;
      this.cdr.markForCheck();
      return;
    }

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
          if (err.status === 403 || code === 'acct.errUnverified' || code === 'auth.errNotVerified') {
            this.showUnverifiedPrompt = true;
          } else {
            this.apiError = this.i18n.t('sell.listFailed') + (code ? this.i18n.t(code) : (err.error?.error?.message || err.error?.detail || this.i18n.t('sell.unknownError')));
          }
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
