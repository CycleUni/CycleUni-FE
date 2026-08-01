import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiInput } from '../../shared/ui/input.component';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { AccountService } from '../../core/services/account.service';
import { BookService } from '../../core/services/book.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';
import { AuthStore } from '../../core/auth.store';
import { I18nService, TPipe } from '../../core/i18n.service';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UiInput, UiButton, UiDropdown, TPipe],
  template: `
      <main class="container">
      <h2>{{ 'sell.title' | t }}</h2>

      <div *ngIf="!isLoggedIn && !isLoading" class="unverified-state">
        <div class="alert-box warning">
          <h3>{{ 'sell.notLoggedInTitle' | t }}</h3>
          <p>{{ 'sell.notLoggedInDesc' | t }}</p>
          <ui-button style="margin-top: 16px;" (onClick)="goToAccount()">{{ 'sell.goLogin' | t }}</ui-button>
        </div>
      </div>

      <div *ngIf="isLoggedIn && !isVerified && !isLoading" class="unverified-state">
        <div class="alert-box warning">
          <h3>{{ 'acct.unverifiedTitle' | t }}</h3>
          <p>{{ 'sell.unverifiedDesc' | t }}</p>
          <ui-button style="margin-top: 16px;" (onClick)="goToAccountSettings()">{{ 'sell.goVerify' | t }}</ui-button>
        </div>
      </div>

      <ng-container *ngIf="isLoggedIn && isVerified && !isLoading">
        <div class="stepper">
        <div class="step" [class.active]="step === 1">{{ 'sell.step1' | t }}</div>
        <div class="step" [class.active]="step === 2">{{ 'sell.step2' | t }}</div>
        <div class="step" [class.active]="step === 3">{{ 'sell.step3' | t }}</div>
      </div>

      <div class="form-container">
        <!-- Step 1 -->
        <div *ngIf="step === 1" class="step-content">
          <p class="desc">{{ 'sell.isbnDesc' | t }}</p>
          <ui-input [placeholder]="'sell.isbnPlaceholder' | t" [(ngModel)]="searchQuery" (ngModelChange)="onSearchQueryChange()"></ui-input>

          <div style="margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 150px;" *ngIf="!hideSearchButtonForNow && (!bookPreview && searchResults.length === 0 || isSearchQueryDirty)">
              <ui-dropdown [options]="engineOptions" [(ngModel)]="engine" [searchable]="false" style="width: 100%; display: block;"></ui-dropdown>
            </div>
            <ui-button variant="ghost" (onClick)="toggleScanner()" *ngIf="!hideSearchButtonForNow && (!bookPreview && searchResults.length === 0 || isSearchQueryDirty)">
              {{ (isScanning ? 'sell.stopScan' : 'sell.scanBarcode') | t }}
            </ui-button>
            <ui-button (onClick)="searchBook()" *ngIf="!hideSearchButtonForNow && (!bookPreview && searchResults.length === 0 || isSearchQueryDirty)" [disabled]="isCheckingIsbn || !searchQuery">
              {{ (isCheckingIsbn ? 'sell.searching' : 'sell.searchBook') | t }}
            </ui-button>
          </div>

          <div id="reader" [hidden]="!isScanning" style="margin-top: 16px; width: 100%; max-width: 100%; border-radius: 4px; overflow: hidden; border: 1px solid var(--line);"></div>
          <div *ngIf="cameraError" class="inline-msg error" style="margin-top: 8px; font-size: 14px;">{{ cameraError }}</div>
          <!-- Search Results List -->
          <div *ngIf="searchResults.length > 0 && !bookPreview" class="results-container">
            <h4 class="select-hint">{{ 'sell.selectBook' | t }}</h4>
            <div class="preview selectable" *ngFor="let result of searchResults" (click)="selectBook(result)">
              <div class="cover">
                <img *ngIf="result.coverUrl" [src]="result.coverUrl" alt="Cover" />
                <div class="placeholder" *ngIf="!result.coverUrl"></div>
              </div>
              <div class="info" style="flex: 1;">
                <h3 class="book-title-serif">{{ result.title }}</h3>
                <p class="muted">{{ result.author || result.authors }}</p>
                <p class="muted" style="font-size: 12px; margin-top: 4px;">ISBN: {{ result.isbn }}</p>
              </div>
            </div>
            <div class="actions split" style="margin-top: 16px;">
              <ui-button variant="ghost" (onClick)="enterManually()">{{ 'sell.enterManually' | t }}</ui-button>
            </div>
          </div>

          <!-- Selected Book Preview -->
          <div class="preview" *ngIf="bookPreview">
            <div class="cover">
              <img *ngIf="bookPreview.coverUrl" [src]="bookPreview.coverUrl" alt="Cover" />
              <div class="placeholder" *ngIf="!bookPreview.coverUrl"></div>
            </div>
            <div class="info" *ngIf="!bookPreview.isManual" style="flex: 1;">
              <h3 class="book-title-serif">{{ bookPreview.title }}</h3>
              <p class="muted">{{ bookPreview.authors }}</p>
              <div style="margin-top: 8px;">
                <ui-button variant="ghost" (onClick)="clearSelection()" style="padding: 4px 8px; font-size: 12px; height: auto;">{{ 'sell.reselect' | t }}</ui-button>
              </div>
            </div>
            <div class="info" *ngIf="bookPreview.isManual" style="flex: 1;">
              <ui-input [placeholder]="'sell.titlePlaceholder' | t" [(ngModel)]="bookPreview.title" style="margin-bottom: 8px;"></ui-input>
              <ui-input [placeholder]="'sell.authorPlaceholder' | t" [(ngModel)]="bookPreview.authors"></ui-input>
              <div style="margin-top: 8px;">
                <ui-button variant="ghost" (onClick)="clearSelection()" style="padding: 4px 8px; font-size: 12px; height: auto;">{{ 'sell.reselect' | t }}</ui-button>
              </div>
            </div>
          </div>

          <div *ngIf="apiError && step === 1" class="inline-msg error" style="margin-top: 16px; margin-bottom: 16px; padding: 12px; background: #f8d7da; color: #842029; border-radius: 4px; font-size: 14px;">
            {{ apiError }}
          </div>

          <div class="actions">
            <ui-button (onClick)="nextStep()" *ngIf="bookPreview" [disabled]="bookPreview.isManual && (!bookPreview.title || !bookPreview.authors)">
              {{ (bookPreview.isManual ? 'sell.confirmManual' : 'sell.confirmBook') | t }}
            </ui-button>
          </div>
        </div>

        <!-- Step 2 -->
        <div *ngIf="step === 2" class="step-content">
          <ui-dropdown [label]="'acct.conditionLabel' | t" [(ngModel)]="condition" [options]="conditionOptions" [searchable]="false"></ui-dropdown>
          <ui-dropdown [label]="'sell.categoryLabel' | t" [(ngModel)]="category" [options]="categoryOptions"></ui-dropdown>
          <ui-input [label]="'sell.courseLabel' | t" [placeholder]="'sell.coursePlaceholder' | t" [(ngModel)]="course"></ui-input>
          <ui-input [label]="'sell.privateNoteLabel' | t" [placeholder]="'sell.privateNotePlaceholder' | t" [(ngModel)]="privateNote"></ui-input>
          <ui-input [label]="'sell.descriptionLabel' | t" [placeholder]="'sell.descriptionPlaceholder' | t" [(ngModel)]="description"></ui-input>

          <div class="photo-upload">
            <label>{{ 'sell.photoLabel' | t }}</label>
            <div class="upload-container">
              <div class="preview-box" *ngFor="let url of uploadedPhotos; let i = index">
                <img [src]="url" alt="Uploaded photo">
                <button class="remove-btn" (click)="removePhoto(i)">×</button>
              </div>
              <div class="upload-box" *ngIf="uploadedPhotos.length < 3"
                   (click)="fileInput.click()"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   [class.drag-over]="isDragOver">
                <span *ngIf="!isUploading">{{ 'sell.uploadBox' | t }}</span>
                <span *ngIf="isUploading">{{ 'sell.uploading' | t }}</span>
                <input #fileInput type="file" accept="image/*" style="display: none" (change)="onFileSelected($event)" [disabled]="isUploading">
              </div>
            </div>
            <div *ngIf="uploadError" class="inline-msg error" style="margin-top: 8px; font-size: 14px;">
              {{ uploadError }}
            </div>
          </div>

          <div class="actions split">
            <ui-button variant="ghost" (onClick)="prevStep()">{{ 'sell.prev' | t }}</ui-button>
            <ui-button (onClick)="nextStep()">{{ 'sell.next' | t }}</ui-button>
          </div>
        </div>

        <!-- Step 3 -->
        <div *ngIf="step === 3" class="step-content">
          <ui-input type="number" [label]="'acct.priceLabel' | t" [(ngModel)]="price"></ui-input>

          <div class="free-btn">
            <ui-button variant="ghost" (onClick)="setFree()">{{ 'sell.free' | t }}</ui-button>
          </div>


          

          <div *ngIf="apiError && step === 3" class="inline-msg error" style="margin-top: 16px; margin-bottom: 16px; padding: 12px; background: #f8d7da; color: #842029; border-radius: 4px; font-size: 14px;">
            {{ apiError }}
          </div>

          <div class="actions split">
            <ui-button variant="ghost" (onClick)="prevStep()" [disabled]="isSubmitting">{{ 'sell.prev' | t }}</ui-button>
            <ui-button (onClick)="submit()" [disabled]="isSubmitting">
              {{ (isSubmitting ? 'sell.submitting' : 'sell.submit') | t }}
            </ui-button>
          </div>
        </div>

        <!-- Complete -->
        <div *ngIf="step === 4" class="step-content text-center">
          <h2>{{ 'sell.successTitle' | t }}</h2>
          <p>{{ 'sell.successDesc' | t }}</p>
          <ui-button (onClick)="goToHome()">{{ 'sell.backHome' | t }}</ui-button>
        </div>
      </div>
      </ng-container>
    </main>
  `,
  styles: [`
    .app-header {
      border-bottom: 1px solid var(--line);
      padding: 16px 0;
      background-color: var(--paper);
    }
    .header-content {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 16px;
    }
    .logo a {
      text-decoration: none;
      color: var(--ink);
      font-weight: 700;
      font-size: 20px;
    }
    .container {
      max-width: 600px;
      margin: 48px auto;
      padding: 0 16px;
    }
    h2 {
      text-align: center;
      margin-bottom: 32px;
    }
    .stepper {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
    }
    .step {
      color: var(--muted);
      font-weight: 500;
    }
    .step.active {
      color: var(--accent);
      font-weight: 700;
    }
    .form-container {
      background-color: var(--paper);
      padding: 32px;
      border: 1px solid var(--line);
      border-radius: 4px;
    }
    .desc {
      color: var(--muted);
      margin-bottom: 24px;
    }
    .actions {
      margin-top: 32px;
      text-align: right;
    }
    .split {
      display: flex;
      justify-content: space-between;
    }
    .preview {
      display: flex;
      gap: 16px;
      padding: 16px;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
      margin-top: 16px;
      border-radius: 4px;
    }
    .preview.selectable {
      cursor: pointer;
      transition: border-color 0.2s, transform 0.2s;
    }
    .preview.selectable:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }
    .select-hint {
      margin-top: 24px;
      margin-bottom: -4px;
    }
    .preview .cover {
      width: 60px;
      height: 84px;
      background-color: var(--line);
      flex-shrink: 0;
    }
    .preview .cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .preview h3 {
      margin: 0 0 4px;
    }
    .photo-upload label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 14px;
    }
    .upload-box {
      border: 1px dashed var(--line);
      padding: 32px;
      text-align: center;
      color: var(--muted);
      cursor: pointer;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100px;
      transition: background-color 0.2s;
    }
    .upload-box.drag-over {
      background-color: var(--paper-warm);
      border-color: var(--primary);
    }
    .upload-container {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .preview-box {
      width: 100px;
      height: 100px;
      position: relative;
      border: 1px solid var(--line);
      border-radius: 4px;
    }
    .preview-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }
    .remove-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      background: var(--flag);
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .free-btn {
      margin-bottom: 16px;
    }
    .info-text {
      font-size: 14px;
    }
    .text-center {
      text-align: center;
    }
    .unverified-state {
      padding: 32px 0;
    }
    .alert-box {
      padding: 24px;
      border-radius: 4px;
      text-align: center;
      background-color: #fff3cd;
      border: 1px solid #ffe69c;
      color: #664d03;
    }
    .alert-box h3 {
      margin-top: 0;
      margin-bottom: 12px;
    }

    @media (max-width: 768px) {
      .container {
        margin: 24px auto;
      }
      .stepper {
        gap: 8px;
        font-size: 14px;
        flex-wrap: wrap;
      }
      .form-container {
        padding: 20px 16px;
      }
      .preview {
        flex-wrap: wrap;
      }
    }
    .checkbox-group {
      margin-bottom: 8px;
    }
    .group-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 8px;
    }
    .checkboxes {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .checkboxes label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--text);
      cursor: pointer;
    }
  `]
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

    this.bookService.searchBooks(this.searchQuery, '', '', 1, this.engine).subscribe({
      next: (data) => {
        this.isCheckingIsbn = false;
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
        private_note: this.privateNote,
        description: this.description,
        price: this.price,
        photos: this.uploadedPhotos
      };

      this.listingService.createListing(payload).subscribe({
        next: () => {
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
