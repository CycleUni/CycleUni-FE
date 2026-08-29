
import { parseAdminError } from '../../core/admin-error.util';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPagination } from '../../shared/ui/pagination.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAd, AdminAdvertiser, Paginated } from '../../core/services/admin.service';
import { ListingService } from '../../core/services/listing.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../core/auth.store';
import { RegionService } from '../../core/region.service';

@Component({
  selector: 'app-admin-ads-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiPagination],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navAds' | t }}</h2>
      <div>
        <button class="admin-btn admin-btn-primary" (click)="openCreateModal()">{{ 'admin.addAd' | t }}</button>
      </div>
    </div>

    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchAds' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
    </div>

    <div class="table-container" *ngIf="!loading && adsData">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ 'admin.colRegion' | t }}</th>
            <th>{{ 'admin.adTitle' | t }}</th>
            <th>{{ 'admin.adAdvertiser' | t }}</th>
            <th>{{ 'admin.adPosition' | t }}</th>
            <th>{{ 'admin.adClicksViews' | t }}</th>
            <th>{{ 'admin.adStatus' | t }}</th>
            <th>{{ 'admin.adPeriod' | t }}</th>
            <th>{{ 'admin.colActions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let ad of adsData.results">
            <td>{{ ad.id }}</td>
            <td>{{ ad.all_regions ? ('admin.allRegions' | t) : formatRegions(ad.regions) }}</td>
            <td>
              {{ ad.title }}
              <a *ngIf="ad.target_url" [href]="ad.target_url" target="_blank" title="跳轉連結">🔗</a>
            </td>
            <td>{{ ad.advertiser_name }}</td>
            <td>{{ ad.position }}</td>
            <td>{{ ad.clicks_count }} / {{ ad.views_count }}</td>
            <td>
              <span class="admin-badge" [class.admin-badge-success]="ad.is_active" [class.admin-badge-error]="!ad.is_active">
                {{ ad.is_active ? ('admin.advertiserActive' | t) : ('admin.advertiserInactive' | t) }}
              </span>
            </td>
            <td style="font-size: 0.85em; color: var(--text-muted)">
              {{ ad.start_date | date:'yyyy/MM/dd HH:mm' }} -<br>
              {{ ad.end_date | date:'yyyy/MM/dd HH:mm' }}
            </td>
            <td>
              <button class="admin-btn admin-btn-sm admin-btn-outline" (click)="openEditModal(ad)">{{ 'common.edit' | t }}</button>
              <button class="admin-btn admin-btn-sm admin-btn-outline" (click)="deleteAd(ad.id)" style="margin-left: 4px; color: var(--error); border-color: var(--error);">{{ 'common.delete' | t }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="currentPage" (pageChange)="loadPage($event)"></ui-pagination>
    </div>

    <div class="empty-note" *ngIf="loading">
      <p>{{ 'common.loading' | t }}</p>
    </div>

    <div class="app-modal-overlay" *ngIf="showModal">
      <div class="app-modal">
        <h3 class="app-modal-title">{{ editingId ? ('admin.editAd' | t) : ('admin.addAd' | t) }}</h3>
        
        <div class="app-modal-body">
          <div class="form-group">
            <label>{{ 'admin.adAdvertiser' | t }} *</label>
            <select class="admin-form-control" [(ngModel)]="formData.advertiser" [disabled]="!!editingId">
              <option *ngFor="let adv of advertisers" [value]="adv.id">{{ adv.company_name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>{{ 'admin.adTitle' | t }} *</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.title">
          </div>
          
          <div class="form-group">
            <label>{{ 'admin.adImage' | t }} *</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;" *ngIf="formData.image_url">
              <img [src]="formData.image_url" style="height: 60px; object-fit: contain; border: 1px solid var(--line); border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 8px;">
              <input *ngIf="!formData.is_internal_image" type="text" class="admin-form-control" [(ngModel)]="formData.image_url" placeholder="https://..." style="flex: 1;">
              <div *ngIf="formData.is_internal_image" style="flex: 1; display: flex; align-items: center; font-size: 14px; color: var(--success); background: var(--paper-warm); padding: 0 12px; border-radius: 4px; border: 1px solid var(--line);">{{ 'admin.uploadedViaFile' | t }}</div>
              <input type="file" accept="image/*" style="display: none" #fileInput (change)="onImageUpload($event)">
              <button class="admin-btn admin-btn-outline" (click)="fileInput.click()" [disabled]="uploadingImage" [title]="'admin.uploadNewImageHint' | t">
                {{ uploadingImage ? ('admin.uploading' | t) : (formData.is_internal_image ? ('admin.reselectFile' | t) : ('admin.selectFile' | t)) }}
              </button>
              <button *ngIf="formData.is_internal_image" class="admin-btn admin-btn-outline" (click)="useExternalUrl()" [title]="'admin.useExternalUrlHint' | t">
                {{ 'admin.useExternalUrl' | t }}
              </button>
            </div>
          </div>
          
          <p style="font-size: 12px; color: var(--muted); margin-top: 4px; margin-bottom: 12px;">{{ 'admin.adImageSpec' | t }}</p>

          <div class="form-group">
            <label>{{ 'admin.adTargetUrl' | t }} *</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.target_url" placeholder="https://...">
          </div>
          
          <div class="form-group">
            <label>{{ 'admin.adHeadline' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.headline">
          </div>
          <div class="form-group">
            <label>{{ 'admin.adSubheadline' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.subheadline">
          </div>
          <div class="form-group">
            <label>{{ 'admin.adSlotIndex' | t }} *</label>
            <input type="number" min="1" max="200" class="admin-form-control" [(ngModel)]="formData.slot_index">
          </div>

          <div class="form-group">
            <label>{{ 'admin.adStartDate' | t }} *</label>
            <input type="datetime-local" class="admin-form-control" [(ngModel)]="formData.start_date">
          </div>
          
          <div class="form-group">
            <label>{{ 'admin.adEndDate' | t }} *</label>
            <input type="datetime-local" class="admin-form-control" [(ngModel)]="formData.end_date">
          </div>
          
          <div class="form-group">
            <label>{{ 'admin.adLabels' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="labelsInput" placeholder="New, Sale">
          </div>
          
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="adIsActive" [(ngModel)]="formData.is_active">
            <label for="adIsActive" style="margin: 0; font-weight: normal;">{{ 'admin.advertiserActive' | t }}</label>
          </div>

          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="adShowInHero" [(ngModel)]="formData.show_in_hero">
            <label for="adShowInHero" style="margin: 0; font-weight: normal;">{{ 'admin.adShowInHero' | t }}</label>
          </div>
        </div>
        
        <div class="app-modal-actions">
          <button class="admin-btn admin-btn-outline" (click)="closeModal()">{{ 'common.cancel' | t }}</button>
          <button class="admin-btn admin-btn-primary" (click)="save()">{{ 'common.save' | t }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-modal { 
      width: 400px; max-width: 90%; 
    }
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
  `]
})
export class AdminAdsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private listingService = inject(ListingService);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  private authStore = inject(AuthStore);
  private regionService = inject(RegionService);
  
  adsData: Paginated<AdminAd> | null = null;
  currentPage = 1;
  total = 0;
  pageSize = 20;
  loading = true;
  saving = false;
  advertisers: AdminAdvertiser[] = [];
  uploadingImage = false;
  
  showModal = false;
  editingId: number | null = null;
  q = '';
  formData: Partial<AdminAd> = {
    title: '',
    image_url: '',
    target_url: '',
    position: 'home_banner',
    headline: '',
    subheadline: '',
    slot_index: 1,
    is_active: true,
    show_in_hero: false
  };
  labelsInput = '';

  getRegionName(code?: string): string {
    if (!code) return '';
    const reg = this.regionService.regions().find(r => r.code === code);
    return reg ? reg.localized_name : code;
  }

  formatRegions(regions?: string[]): string {
    if (!regions || regions.length === 0) return this.i18n.t('admin.noRegion');
    return regions.map(r => this.getRegionName(r)).join(', ');
  }

  ngOnInit() {
    this.loadPage(1);
    this.loadAdvertisers();
  }

  onSearch(q: string) {
    this.q = q;
    this.loadPage(1);
  }


  loadPage(page: number) {
    this.currentPage = page;
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getAds({ page, q: this.q, region: this.regionService.region().toUpperCase() }).subscribe({
      next: (data) => {
        this.adsData = data;
        this.total = data.count;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert(parseAdminError(err, this.i18n, 'admin.errLoadFailed'));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadAdvertisers() {
    this.adminService.getAdvertisers({ page: 1, page_size: 100 }).subscribe(data => {
      this.advertisers = data.results;
      this.cdr.markForCheck();
    });
  }

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  }

  openCreateModal() {
    this.editingId = null;
    this.labelsInput = '';
    this.formData = {
      title: '',
      image_url: '',
      target_url: '',
      position: 'home_banner',
      headline: '',
      subheadline: '',
      slot_index: 1,
      is_active: true,
      show_in_hero: false,
      start_date: this.formatDateForInput(new Date().toISOString()),
      end_date: this.formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    };
    if (this.advertisers.length > 0) {
      this.formData.advertiser = this.advertisers[0].id;
    }
    this.showModal = true;
  }

  openEditModal(ad: AdminAd) {
    this.editingId = ad.id;
    this.formData = { ...ad, show_in_hero: !!ad.show_in_hero };
    this.labelsInput = ad.labels ? ad.labels.join(', ') : '';
    if (this.formData.start_date) {
      this.formData.start_date = this.formatDateForInput(this.formData.start_date);
    }
    if (this.formData.end_date) {
      this.formData.end_date = this.formatDateForInput(this.formData.end_date);
    }
    this.showModal = true;
  }

  async onImageUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    
    this.uploadingImage = true;
    try {
      const res = await firstValueFrom(this.adminService.uploadAdPhoto(file));
      this.formData.image_url = res.url;
      this.formData.is_internal_image = true;
    } catch (e) {
      alert(this.i18n.t('admin.errUploadFailed'));
    } finally {
      this.uploadingImage = false;
      event.target.value = '';
    }
  }

  useExternalUrl() {
    this.formData.is_internal_image = false;
    this.formData.image_url = '';
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (!this.formData.advertiser || !this.formData.title || !this.formData.image_url || !this.formData.start_date || !this.formData.end_date || !this.formData.slot_index) {
      alert(this.i18n.t('admin.errFillRequired'));
      return;
    }

    if (this.formData.target_url && !this.formData.target_url.startsWith('http://') && !this.formData.target_url.startsWith('https://')) {
      alert(this.i18n.t('admin.errUrlScheme'));
      return;
    }

    const payload = { ...this.formData };
    
    const parsedLabels = this.labelsInput.split(',').map(s => s.trim()).filter(s => s);
    if (parsedLabels.length > 3) {
      alert("最多只能有 3 個標籤");
      return;
    }
    for (let l of parsedLabels) {
      if (l.length > 15) {
        alert("單一標籤長度不可超過 15 個字");
        return;
      }
    }
    payload.labels = parsedLabels;

    if (payload.start_date) payload.start_date = new Date(payload.start_date).toISOString();
    if (payload.end_date) payload.end_date = new Date(payload.end_date).toISOString();

    if (new Date(payload.start_date!).getTime() >= new Date(payload.end_date!).getTime()) {
      alert(this.i18n.t('admin.errEndDateBeforeStart'));
      return;
    }

    const obs = this.editingId
      ? this.adminService.updateAd(this.editingId, payload)
      : this.adminService.createAd(payload);

    obs.subscribe({
      next: () => {
        this.closeModal();
        this.loadPage(this.currentPage);
      },
      error: (err) => alert(parseAdminError(err, this.i18n, 'admin.errSaveFailed'))
    });
  }

  deleteAd(id: string | number) {
    if (confirm(this.i18n.t('admin.confirmDelete'))) {
      this.adminService.deleteAd(id).subscribe({
        next: () => {
          this.loadPage(this.currentPage);
        },
        error: (err) => {
          alert(parseAdminError(err, this.i18n, 'admin.errDeleteFailed'));
        }
      });
    }
  }
}
