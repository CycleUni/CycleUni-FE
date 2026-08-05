import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAd, AdminAdvertiser, Paginated } from '../../core/services/admin.service';
import { ListingService } from '../../core/services/listing.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-ads-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navAds' | t }}</h2>
      <div>
        <button class="btn btn-primary" (click)="openCreateModal()">{{ 'admin.addAd' | t }}</button>
      </div>
    </div>

    <div class="filters">
      <ui-search-bar [placeholder]="'admin.searchAds' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
    </div>

    <div class="table-container" *ngIf="!loading && adsData">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
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
            <td>
              {{ ad.title }}
              <a *ngIf="ad.target_url" [href]="ad.target_url" target="_blank" title="跳轉連結">🔗</a>
            </td>
            <td>{{ ad.advertiser_name }}</td>
            <td>{{ ad.position }}</td>
            <td>{{ ad.clicks_count }} / {{ ad.views_count }}</td>
            <td>
              <span class="badge" [class.badge-success]="ad.is_active" [class.badge-error]="!ad.is_active">
                {{ ad.is_active ? ('admin.advertiserActive' | t) : ('admin.advertiserInactive' | t) }}
              </span>
            </td>
            <td style="font-size: 0.85em; color: var(--text-muted)">
              {{ ad.start_date | date:'yyyy/MM/dd HH:mm' }} -<br>
              {{ ad.end_date | date:'yyyy/MM/dd HH:mm' }}
            </td>
            <td>
              <button class="btn btn-sm btn-outline" (click)="openEditModal(ad)">{{ 'common.edit' | t }}</button>
              <button class="btn btn-sm btn-outline" (click)="deleteAd(ad.id)" style="margin-left: 4px; color: var(--error); border-color: var(--error);">{{ 'common.delete' | t }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" *ngIf="adsData.count > 0">
        <button class="btn btn-sm btn-outline" [disabled]="!adsData.previous" (click)="loadPage(currentPage - 1)">‹</button>
        <span>{{ currentPage }}</span>
        <button class="btn btn-sm btn-outline" [disabled]="!adsData.next" (click)="loadPage(currentPage + 1)">›</button>
      </div>
    </div>

    <div class="empty-state" *ngIf="loading">
      <p>載入中...</p>
    </div>

    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal">
        <h3>{{ editingId ? ('admin.editAd' | t) : ('admin.addAd' | t) }}</h3>
        
        <div class="form-group">
          <label>{{ 'admin.adAdvertiser' | t }} *</label>
          <select class="form-control" [(ngModel)]="formData.advertiser" [disabled]="!!editingId">
            <option *ngFor="let adv of advertisers" [value]="adv.id">{{ adv.company_name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ 'admin.adTitle' | t }} *</label>
          <input type="text" class="form-control" [(ngModel)]="formData.title">
        </div>
        
        <div class="form-group">
          <label>{{ 'admin.adImage' | t }} *</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;" *ngIf="formData.image_url">
            <img [src]="formData.image_url" style="height: 60px; object-fit: contain; border: 1px solid var(--line); border-radius: 4px;">
          </div>
          <div style="display: flex; gap: 8px;">
            <input *ngIf="!formData.is_internal_image" type="text" class="form-control" [(ngModel)]="formData.image_url" placeholder="https://..." style="flex: 1;">
            <div *ngIf="formData.is_internal_image" style="flex: 1; display: flex; align-items: center; font-size: 14px; color: var(--success); background: var(--paper-warm); padding: 0 12px; border-radius: 4px; border: 1px solid var(--line);">{{ 'admin.uploadedViaFile' | t }}</div>
            <input type="file" accept="image/*" style="display: none" #fileInput (change)="onImageUpload($event)">
            <button class="btn btn-outline" (click)="fileInput.click()" [disabled]="uploadingImage" [title]="'admin.uploadNewImageHint' | t">
              {{ uploadingImage ? ('admin.uploading' | t) : (formData.is_internal_image ? ('admin.reselectFile' | t) : ('admin.selectFile' | t)) }}
            </button>
            <button *ngIf="formData.is_internal_image" class="btn btn-outline" (click)="useExternalUrl()" [title]="'admin.useExternalUrlHint' | t">
              {{ 'admin.useExternalUrl' | t }}
            </button>
          </div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">{{ 'admin.adImageHint' | t }}</div>
        </div>
        
        <div class="form-group">
          <label>{{ 'admin.adTargetUrl' | t }} *</label>
          <input type="text" class="form-control" [(ngModel)]="formData.target_url" placeholder="https://...">
        </div>
        
        <div class="form-group">
          <label>{{ 'admin.adStartDate' | t }} *</label>
          <input type="datetime-local" class="form-control" [(ngModel)]="formData.start_date">
        </div>
        
        <div class="form-group">
          <label>{{ 'admin.adEndDate' | t }} *</label>
          <input type="datetime-local" class="form-control" [(ngModel)]="formData.end_date">
        </div>
        
        <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="adIsActive" [(ngModel)]="formData.is_active">
          <label for="adIsActive" style="margin: 0; font-weight: normal;">{{ 'admin.advertiserActive' | t }}</label>
        </div>
        
        <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-outline" (click)="closeModal()">{{ 'common.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="save()">{{ 'common.save' | t }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filters { display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start; flex-wrap: wrap; }
    .filters ui-search-bar { flex: 1; min-width: 240px; }
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .table-container { background: white; border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
    .admin-table th, .admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--line); }
    .admin-table th { background: var(--paper-warm); font-weight: 600; }
    .admin-table tr:last-child td { border-bottom: none; }
    .btn { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; font-size: 14px; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-secondary { background: var(--paper-warm); color: var(--ink); border: 1px solid var(--line); }
    .btn-outline { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
    .btn-sm { padding: 4px 8px; font-size: 12px; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-top: 1px solid var(--line); }
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; padding: 24px; border-radius: 8px; width: 400px; max-width: 90%; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
    .form-control { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; box-sizing: border-box; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-success { background: rgba(22,163,74,0.12); color: #16a34a; }
    .badge-error { background: rgba(220,38,38,0.12); color: #dc2626; }
    .empty-state { padding: 48px; text-align: center; color: var(--muted); }
  `]
})
export class AdminAdsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private listingService = inject(ListingService);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);
  
  adsData: Paginated<AdminAd> | null = null;
  currentPage = 1;
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
    is_active: true
  };

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
    this.adminService.getAds({ page, q: this.q }).subscribe({
      next: (data) => {
        this.adsData = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert(this.i18n.t('admin.errLoadFailed'));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadAdvertisers() {
    // 暫以較大的 page_size 拉取，足以涵蓋多數使用情境
    this.adminService.getAdvertisers({ page: 1, page_size: 100 }).subscribe(data => {
      this.advertisers = data.results;
      this.cdr.markForCheck();
    });
  }

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  }

  openCreateModal() {
    this.editingId = null;
    this.formData = {
      title: '',
      image_url: '',
      target_url: '',
      position: 'home_banner',
      is_active: true,
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
    this.formData = { ...ad };
    // Format dates for datetime-local input
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
      event.target.value = ''; // reset file input
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
    if (!this.formData.advertiser || !this.formData.title || !this.formData.image_url || !this.formData.start_date || !this.formData.end_date) {
      alert(this.i18n.t('admin.errFillRequired'));
      return;
    }

    if (this.formData.target_url && !this.formData.target_url.startsWith('http://') && !this.formData.target_url.startsWith('https://')) {
      alert(this.i18n.t('admin.errUrlScheme'));
      return;
    }

    const payload = { ...this.formData };
    // Convert back to UTC ISO string for backend
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
      error: (err) => alert(this.i18n.t('admin.errSaveFailed'))
    });
  }

  deleteAd(id: string | number) {
    if (confirm(this.i18n.t('admin.confirmDelete'))) {
      this.adminService.deleteAd(id).subscribe({
        next: () => {
          this.loadPage(this.currentPage);
        },
        error: (err) => {
          alert(this.i18n.t('admin.errDeleteFailed'));
        }
      });
    }
  }
}
