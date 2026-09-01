import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RegionService } from '../../core/region.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UiButton } from '../../shared/ui/button.component';
import { UiEmpty } from '../../shared/ui/empty.component';
import { UiInput } from '../../shared/ui/input.component';
import { UiListingRow } from '../../shared/ui/listing-row.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiPagination } from '../../shared/ui/pagination.component';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { TPipe, I18nService } from '../../core/i18n.service';
import { ListingService } from '../../core/services/listing.service';
import { MetadataService } from '../../core/services/metadata.service';

import { AccountService } from '../../core/services/account.service';
import { RegionLinkService } from '../../core/region-link.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';


@Component({
  selector: 'app-account-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButton, UiEmpty, UiInput, UiListingRow, UiDropdown, UiPagination, UiSearchBarComponent, TPipe],
  template: `
    <div class="section-head-row">
      <h2 class="section-heading">{{ 'acct.tabListings' | t }}</h2>
      <ui-button (onClick)="goToSell()">+ {{ 'acct.addListing' | t }}</ui-button>
    </div>

    <ui-search-bar 
       class="mb-5" style="display: block;"
      [placeholder]="'acct.searchListings' | t" 
      [value]="searchQuery" 
      (search)="onSearchQuery($event)">
    </ui-search-bar>

    
    <div class="list-container" *ngIf="myListings.length > 0">
      <ui-listing-row
        *ngFor="let item of myListings"
        [id]="item.id"
        [title]="item.book_title"
        [price]="item.price"
        [condition]="item.condition"
        [status]="item.status"
        [isEditable]="true"
        (action)="onListingAction($event)"
        [metaInfo]="'ISBN: ' + (item.isbn || '')"
        [coverUrl]="item.photo_url || item.book_cover_url"
      ></ui-listing-row>
    </div>
    
    <ui-empty *ngIf="myListings.length === 0" [message]="'acct.noListings' | t"></ui-empty>
    
    <ui-pagination *ngIf="totalListings > 20" [total]="totalListings" [pageSize]="20" [currentPage]="currentPage" (pageChange)="onPageChange($event)"></ui-pagination>

    <!-- Edit Modal Overlay -->
    <div class="edit-modal" *ngIf="editingListing">
      <div class="modal-overlay" (click)="closeEdit()"></div>
      <div class="modal-content app-modal">
        <h3 class="app-modal-title">{{ 'acct.editTitle' | t }}</h3>
        
        <div class="modal-body app-modal-body">
          <p  class="mb-4" style="margin-top: 0; color: var(--muted); overflow-wrap: anywhere; word-break: break-word;">{{ editingListing.book_title }}</p>
          
          <div *ngIf="editingListing.book_source === 'manual'" class="manual-book-edit mb-4"  style="padding: 16px; border: 1px solid var(--line); border-radius: 4px; background-color: var(--paper-warm);">
            <p  style="margin-top: 0; margin-bottom: 12px; font-weight: 500; font-size: var(--text-base);">{{ 'acct.manualBookDesc' | t }}</p>
            <ui-input [label]="'acct.bookTitleLabel' | t" [(ngModel)]="editForm.book_title"  style="margin-bottom: 12px;"></ui-input>
            <ui-input [label]="'acct.bookAuthorsLabel' | t" [(ngModel)]="editForm.book_authors"  style="margin-bottom: 12px;"></ui-input>
            <ui-input [label]="'acct.isbnLabel' | t" [(ngModel)]="editForm.isbn"></ui-input>
          </div>

          <ui-input type="number" [label]="'acct.priceLabel' | t:{currency: regionService.currency().symbol}" [(ngModel)]="editForm.price"  class="mb-4"></ui-input>
          <ui-dropdown [label]="'common.condition' | t" [(ngModel)]="editForm.condition" [options]="conditionOptions" [searchable]="false"  class="mb-4"></ui-dropdown>
          <ui-dropdown [label]="'sell.categoryLabel' | t" [(ngModel)]="editForm.category" [options]="categoryOptions"  class="mb-4"></ui-dropdown>
          <ui-input [label]="'sell.courseLabel' | t" [(ngModel)]="editForm.course_name"  class="mb-4"></ui-input>
          <ui-input [label]="'sell.professorLabel' | t" [(ngModel)]="editForm.professor_name"  class="mb-4"></ui-input>
          <ui-input [label]="'sell.privateNoteLabel' | t" [(ngModel)]="editForm.private_note"  class="mb-4"></ui-input>
          <ui-input [label]="'sell.descriptionLabel' | t" [(ngModel)]="editForm.description"  class="mb-4"></ui-input>
          
          <div class="photo-upload mb-5" >
            <label  class="mb-2" style="display: block; font-weight: 500; font-size: var(--text-base);">{{ 'acct.photoLabel' | t }}</label>
            <div class="photo-preview" *ngIf="editForm.photos && editForm.photos.length > 0" style="margin-bottom: 8px; position: relative; display: inline-block;">
              <img [src]="editForm.photos[0]" loading="lazy"  style="width: 88px; height: 124px; object-fit: cover; border: 1px solid var(--line); border-radius: 4px;" />
              <button class="delete-photo-btn" (click)="editForm.photos = []" title="{{ 'common.delete' | t }}">✕</button>
            </div>
            <div>
              <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput  style="display: none;" />
              <ui-button variant="ghost" (onClick)="fileInput.click()" [disabled]="isUploadingPhoto">{{ (isUploadingPhoto ? 'sell.uploading' : 'acct.uploadPhoto') | t }}</ui-button>
            </div>
          </div>
        </div>
        <div class="actions app-modal-actions">
          <ui-button variant="ghost" (onClick)="closeEdit()">{{ 'common.cancel' | t }}</ui-button>
          <ui-button (onClick)="submitEdit()">{{ 'acct.save' | t }}</ui-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-head-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .section-head-row .section-heading { margin-bottom: 0; }
    .edit-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    .modal-content {
      position: relative;
      width: 100%;
      max-width: 400px;
      z-index: 1001;
    }
    .delete-photo-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--flag);
      color: var(--on-flag);
      border: none;
      font-size: var(--text-base);
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .delete-photo-btn:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      .section-head-row { flex-wrap: wrap; gap: 12px; }
      .edit-modal { padding: 16px; }
    }

  `]
})
export class ListingsComponent implements OnInit {
  regionService = inject(RegionService);
  myListings: any[] = [];
  editingListing: any = null;
  editForm: any = {};
  isUploadingPhoto = false;
  categoryOptions: any[] = [];
  totalListings = 0;
  currentPage = 1;
  searchQuery = '';

  onSearchQuery(query: string) {
    this.searchQuery = query;
    this.onSearch();
  }

  get conditionOptions() {
    return ['new', 'like_new', 'noted', 'damaged'].map(value => ({
      value,
      label: this.i18n.t(`cond.${value}`)
    }));
  }

  private accountService = inject(AccountService);
  private listingService = inject(ListingService);
  private metadataService = inject(MetadataService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private regionLink = inject(RegionLinkService);
  readonly i18n = inject(I18nService);

  private toast = inject(ToastService);
  private confirms = inject(ConfirmService);
  ngOnInit() {
    this.metadataService.getMetadata().subscribe({
      next: (data) => {
        if (data.categories) {
          this.categoryOptions = [{ label: this.i18n.t('sell.categoryPlaceholder'), value: '' }, ...data.categories.map((c: any) => ({
            label: c.title,
            value: c.slug
          }))];
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        // Category options are supplementary; log and don't block the rest of the page.
        console.error('Failed to load metadata', err);
      }
    });
    this.loadMyListings();
  }

  onSearch() {
    this.currentPage = 1;
    this.loadMyListings();
  }

  loadMyListings() {
    this.accountService.getMyProfile(this.currentPage, this.searchQuery).subscribe({
      next: (data: any) => {
        if (data.myListings && !Array.isArray(data.myListings)) {
          this.myListings = data.myListings.results || [];
          this.totalListings = data.myListings.count || this.myListings.length;
        } else {
          this.myListings = data.myListings || [];
          this.totalListings = this.myListings.length;
        }
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadMyListings();
  }

  async onListingAction(event: {type: string, id: number | string}) {
    if (event.type === 'edit') {
      const listing = this.myListings.find(l => l.id === event.id);
      if (listing) {
        this.editingListing = listing;
        this.editForm = {
          price: listing.price,
          condition: listing.condition,
          category: listing.category || '',
          course_name: listing.course_name || '',
          professor_name: listing.professor_name || '',
          private_note: listing.private_note,
          description: listing.description,
          photos: listing.photo_url ? [listing.photo_url] : [],
          book_title: listing.book_title,
          book_authors: listing.book_authors,
          isbn: listing.isbn
        };
      }
    } else if (event.type === 'mark_sold') {
      this.listingService.updateListing(event.id, { status: 'sold' }).subscribe({
        next: () => {
          this.accountService.clearProfileCache();
          this.loadMyListings();
        },
        error: (err) => {
          const code = err.error?.error?.code;
          this.toast.error(this.i18n.t('acct.errUpdate', { msg: code ? this.i18n.t(code) : (err.error?.error?.message || err.message) }));
        }
      });
    } else if (event.type === 'mark_active') {
      this.listingService.updateListing(event.id, { status: 'active' }).subscribe({
        next: () => {
          this.accountService.clearProfileCache();
          this.loadMyListings();
        },
        error: (err) => {
          const code = err.error?.error?.code;
          this.toast.error(this.i18n.t('acct.errUpdate', { msg: code ? this.i18n.t(code) : (err.error?.error?.message || err.message) }));
        }
      });
    } else if (event.type === 'delete') {
      const confirmed = await this.confirms.askDanger(this.i18n.t('acct.confirmDelete'), {
        confirmLabel: this.i18n.t('common.delete'),
      });
      if (confirmed) {
        this.listingService.deleteListing(event.id).subscribe({
          next: () => {
            this.accountService.clearProfileCache();
            this.loadMyListings();
          }
        });
      }
    }
  }

  closeEdit() {
    this.editingListing = null;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingPhoto = true;
      this.cdr.markForCheck();
      try {
        const url = await this.listingService.uploadPhoto(file);
        this.editForm.photos = [url];
      } catch (err) {
        console.error('Upload failed', err);
        this.toast.error(this.i18n.t('acct.uploadFailed'));
      } finally {
        this.isUploadingPhoto = false;
        this.cdr.markForCheck();
      }
    }
  }

  submitEdit() {
    if (!this.editingListing) return;

    const payload: any = {
      price: this.editForm.price,
      condition: this.editForm.condition,
      category: this.editForm.category || null,
      course_name: this.editForm.course_name || '',
      professor_name: this.editForm.professor_name || '',
      private_note: this.editForm.private_note,
      description: this.editForm.description,
      photos: this.editForm.photos
    };
    
    if (this.editingListing.book_source === 'manual') {
      payload.book_title = this.editForm.book_title;
      payload.book_authors = this.editForm.book_authors;
      payload.isbn = this.editForm.isbn;
    }
    
    this.listingService.updateListing(this.editingListing.id, payload).subscribe({
      next: () => {
        this.accountService.clearProfileCache();
        this.closeEdit();
        this.loadMyListings();
      },
      error: () => {
        this.toast.error(this.i18n.t('acct.updateFailed'));
      }
    });
  }

  goToSell() {
    this.router.navigate(this.regionLink.path(['/sell']));
  }
}
