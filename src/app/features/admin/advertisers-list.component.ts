import { parseAdminError } from '../../core/admin-error.util';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPagination } from '../../shared/ui/pagination.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAdvertiser, Paginated } from '../../core/services/admin.service';
import { MetadataService } from '../../core/services/metadata.service';
import { I18nService, TPipe } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';

@Component({
  selector: 'app-admin-advertisers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiPagination],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navAdvertisers' | t }}</h2>
      <div>
        <button class="admin-btn admin-btn-primary" (click)="openCreateModal()">{{ 'admin.addAdvertiser' | t }}</button>
      </div>
    </div>

    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchAdvertisers' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
    </div>

    <div class="table-container" *ngIf="!loading && advertisersData">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ 'admin.advertiserName' | t }}</th>
            <th>{{ 'admin.advertiserEmail' | t }}</th>
            <th>{{ 'admin.advertiserPhone' | t }}</th>
            <th>{{ 'admin.advertiserStatus' | t }}</th>
            <th>{{ 'admin.colActions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let adv of advertisersData.results">
            <td>{{ adv.id }}</td>
            <td>{{ adv.company_name }}</td>
            <td>{{ adv.contact_email }}</td>
            <td>{{ adv.contact_phone }}</td>
            <td>
              <span class="admin-badge" [class.admin-badge-success]="adv.is_active" [class.admin-badge-error]="!adv.is_active">
                {{ adv.is_active ? ('admin.advertiserActive' | t) : ('admin.advertiserInactive' | t) }}
              </span>
            </td>
            <td>
              <button class="admin-btn admin-btn-sm admin-btn-outline" (click)="openEditModal(adv)">{{ 'common.edit' | t }}</button>
              <button class="admin-btn admin-btn-sm admin-btn-outline" (click)="deleteAdvertiser(adv.id)" style="margin-left: 4px; color: var(--error); border-color: var(--error);">{{ 'common.delete' | t }}</button>
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
        <h3 class="app-modal-title">{{ editingId ? ('admin.editAdvertiser' | t) : ('admin.addAdvertiser' | t) }}</h3>
        
        <div class="app-modal-body">
          <div class="form-group">
            <label>{{ 'admin.advertiserName' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.company_name">
          </div>
          <div class="form-group">
            <label>{{ 'admin.advertiserEmail' | t }}</label>
            <input type="email" class="admin-form-control" [(ngModel)]="formData.contact_email">
          </div>
          <div class="form-group">
            <label>{{ 'admin.advertiserPhone' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="formData.contact_phone">
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="isActive" [(ngModel)]="formData.is_active">
            <label for="isActive" style="margin: 0; font-weight: normal;">{{ 'admin.advertiserActive' | t }}</label>
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="allSchools" [(ngModel)]="formData.all_schools">
            <label for="allSchools" style="margin: 0; font-weight: normal;">{{ 'admin.allSchools' | t }}</label>
          </div>
          <div class="form-group" *ngIf="!formData.all_schools">
            <label>{{ 'admin.selectSpecificSchool' | t }}</label>
            <input type="text" class="admin-form-control" [placeholder]="'admin.searchSchool' | t" [(ngModel)]="schoolSearchQuery" style="margin-bottom: 8px;">
            <div class="school-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--line); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 8px;">
              <div *ngFor="let school of filteredSchools" style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" [id]="'school_' + school.id" 
                       [checked]="formData.schools?.includes(school.id)" 
                       (change)="toggleSchool(school.id)">
                <label [for]="'school_' + school.id" style="margin: 0; font-weight: normal; cursor: pointer;">{{ school.display_name || school.name }}</label>
              </div>
              <div *ngIf="filteredSchools.length === 0" style="color: var(--muted); text-align: center; padding: 12px;">找不到符合的學校</div>
            </div>
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
export class AdminAdvertisersListComponent implements OnInit {
  private adminService = inject(AdminService);
  private metadataService = inject(MetadataService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  
  schools: any[] = [];
  
  advertisersData: Paginated<AdminAdvertiser> | null = null;
  currentPage = 1;
  total = 0;
  pageSize = 20;
  loading = true;
  schoolSearchQuery = '';
  q = '';
  
  showModal = false;
  editingId: number | null = null;
  formData: Partial<AdminAdvertiser> = {
    company_name: '',
    contact_email: '',
    contact_phone: '',
    is_active: true,
    all_schools: true,
    schools: []
  };

  constructor() {}

  get filteredSchools() {
    if (!this.schoolSearchQuery) return this.schools;
    const q = this.schoolSearchQuery.toLowerCase();
    return this.schools.filter(s => 
      (s.display_name || s.name).toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    this.loadPage(1);
    this.metadataService.getMetadata().subscribe({
      next: (meta: any) => { this.schools = meta?.schools || []; this.cdr.markForCheck(); },
      error: (err) => {}
    });
  }

  onSearch(q: string) {
    this.q = q;
    this.loadPage(1);
  }

  loadPage(page: number) {
    this.currentPage = page;
    this.loading = true;
    this.cdr.markForCheck();
    this.adminService.getAdvertisers({ page, q: this.q }).subscribe({
      next: (data) => {
        this.advertisersData = data;
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

  openCreateModal() {
    this.editingId = null;
    this.formData = {
      company_name: '',
      contact_email: '',
      contact_phone: '',
      is_active: true,
      all_schools: true,
      schools: []
    };
    this.schoolSearchQuery = '';
    this.showModal = true;
  }

  openEditModal(adv: AdminAdvertiser) {
    this.editingId = adv.id;
    this.formData = { ...adv, schools: adv.schools ? [...adv.schools] : [] };
    this.schoolSearchQuery = '';
    this.showModal = true;
  }

  toggleSchool(schoolId: number) {
    if (!this.formData.schools) this.formData.schools = [];
    const idx = this.formData.schools.indexOf(schoolId);
    if (idx > -1) {
      this.formData.schools.splice(idx, 1);
    } else {
      this.formData.schools.push(schoolId);
    }
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (!this.formData.company_name || !this.formData.contact_email) {
      alert(this.i18n.t('admin.errFillRequired'));
      return;
    }

    const payload = { ...this.formData };
    if (payload.schools) {
      payload.schools = payload.schools.map(id => Number(id));
    }

    const obs = this.editingId
      ? this.adminService.updateAdvertiser(this.editingId, payload)
      : this.adminService.createAdvertiser(payload);

    obs.subscribe({
      next: () => {
        this.closeModal();
        this.loadPage(this.currentPage);
      },
      error: (err) => alert(parseAdminError(err, this.i18n, 'admin.errSaveFailed'))
    });
  }

  deleteAdvertiser(id: string | number) {
    if (confirm(this.i18n.t('admin.confirmDeleteAdvertiser'))) {
      this.adminService.deleteAdvertiser(id).subscribe({
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
