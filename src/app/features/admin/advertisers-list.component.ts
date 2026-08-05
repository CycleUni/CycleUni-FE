import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminAdvertiser, Paginated } from '../../core/services/admin.service';
import { MetadataService } from '../../core/services/metadata.service';
import { I18nService, TPipe } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';

@Component({
  selector: 'app-admin-advertisers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navAdvertisers' | t }}</h2>
      <div>
        <button class="btn btn-primary" (click)="openCreateModal()">{{ 'admin.addAdvertiser' | t }}</button>
      </div>
    </div>

    <div class="filters">
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
              <span class="badge" [class.badge-success]="adv.is_active" [class.badge-error]="!adv.is_active">
                {{ adv.is_active ? ('admin.advertiserActive' | t) : ('admin.advertiserInactive' | t) }}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-outline" (click)="openEditModal(adv)">{{ 'common.edit' | t }}</button>
              <button class="btn btn-sm btn-outline" (click)="deleteAdvertiser(adv.id)" style="margin-left: 4px; color: var(--error); border-color: var(--error);">{{ 'common.delete' | t }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" *ngIf="advertisersData.count > 0">
        <button class="btn btn-sm btn-outline" [disabled]="!advertisersData.previous" (click)="loadPage(currentPage - 1)">‹</button>
        <span>{{ currentPage }}</span>
        <button class="btn btn-sm btn-outline" [disabled]="!advertisersData.next" (click)="loadPage(currentPage + 1)">›</button>
      </div>
    </div>
    
    <div class="empty-state" *ngIf="loading">
      <p>{{ 'common.loading' | t }}</p>
    </div>

    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal">
        <h3>{{ editingId ? ('admin.editAdvertiser' | t) : ('admin.addAdvertiser' | t) }}</h3>
        <div class="form-group">
          <label>{{ 'admin.advertiserName' | t }}</label>
          <input type="text" class="form-control" [(ngModel)]="formData.company_name">
        </div>
        <div class="form-group">
          <label>{{ 'admin.advertiserEmail' | t }}</label>
          <input type="email" class="form-control" [(ngModel)]="formData.contact_email">
        </div>
        <div class="form-group">
          <label>{{ 'admin.advertiserPhone' | t }}</label>
          <input type="text" class="form-control" [(ngModel)]="formData.contact_phone">
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
          <input type="text" class="form-control" [placeholder]="'admin.searchSchool' | t" [(ngModel)]="schoolSearchQuery" style="margin-bottom: 8px;">
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
export class AdminAdvertisersListComponent implements OnInit {
  private adminService = inject(AdminService);
  private metadataService = inject(MetadataService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  
  schools: any[] = [];
  
  advertisersData: Paginated<AdminAdvertiser> | null = null;
  currentPage = 1;
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
      error: () => {}
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
      error: (err) => alert(this.i18n.t('admin.errSaveFailed'))
    });
  }

  deleteAdvertiser(id: string | number) {
    if (confirm(this.i18n.t('admin.confirmDeleteAdvertiser'))) {
      this.adminService.deleteAdvertiser(id).subscribe({
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
