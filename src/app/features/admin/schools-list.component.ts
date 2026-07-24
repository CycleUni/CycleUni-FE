import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminSchool, Paginated } from '../../core/services/admin.service';
import { TPipe } from '../../core/i18n.service';
import { BulkImportModalComponent } from './bulk-import-modal.component';

@Component({
  selector: 'app-admin-schools-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, BulkImportModalComponent],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navSchools' | t }}</h2>
      <div>
        <button class="btn btn-outline" style="margin-right: 12px;" (click)="showImportModal = true">{{ 'admin.bulkImport' | t }}</button>
        <button class="btn btn-primary" (click)="openCreateModal()">{{ 'admin.addSchool' | t }}</button>
      </div>
    </div>

    <div class="filters">
      <input type="text" class="search-input" [placeholder]="'admin.searchSchools' | t" [(ngModel)]="q" (keyup.enter)="loadPage(1)">
      <button class="btn btn-secondary" (click)="loadPage(1)">{{ 'common.search' | t }}</button>
    </div>

    <div class="table-container" *ngIf="schoolsData">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{{ 'admin.schoolName' | t }}</th>
            <th>{{ 'admin.colDomain' | t }}</th>
            <th>{{ 'admin.colActions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let school of schoolsData.results">
            <td>{{ school.id }}</td>
            <td>{{ school.name }}</td>
            <td>{{ school.email_domain }}</td>
            <td>
              <a class="btn btn-sm btn-outline" [routerLink]="[school.id]">{{ 'common.edit' | t }}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" *ngIf="schoolsData.count > 0">
        <button class="btn btn-sm btn-outline" [disabled]="!schoolsData.previous" (click)="loadPage(currentPage - 1)">‹</button>
        <span>{{ currentPage }}</span>
        <button class="btn btn-sm btn-outline" [disabled]="!schoolsData.next" (click)="loadPage(currentPage + 1)">›</button>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showCreateModal">
      <div class="modal">
        <h3>{{ 'admin.addSchool' | t }}</h3>
        <div class="form-group">
          <label>{{ 'admin.schoolName' | t }}</label>
          <input type="text" class="input" [(ngModel)]="newSchool.name">
        </div>
        <div class="form-group">
          <label>{{ 'admin.colDomain' | t }}</label>
          <input type="text" class="input" [(ngModel)]="newSchool.email_domain" [placeholder]="'admin.domainDesc' | t">
        </div>
        <div class="form-group">
          <label>{{ 'admin.translationsSection' | t }}</label>
          <div class="translation-row">
            <span class="lang-tag">zh-TW</span>
            <input type="text" class="input" [(ngModel)]="newSchoolZhTwName" [placeholder]="'admin.schoolName' | t">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="showCreateModal = false">{{ 'common.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="createSchool()">{{ 'admin.save' | t }}</button>
        </div>
      </div>
    </div>

    <app-bulk-import-modal 
      [show]="showImportModal"
      endpoint="schools"
      (close)="showImportModal = false"
      (imported)="showImportModal = false; loadPage(1)">
    </app-bulk-import-modal>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .filters { display: flex; gap: 12px; margin-bottom: 24px; }
    .search-input { flex: 1; max-width: 400px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; }
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
    .input { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; box-sizing: border-box; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .translation-row { display: flex; align-items: center; gap: 8px; }
    .lang-tag { flex: 0 0 auto; padding: 4px 8px; border-radius: 4px; background: var(--paper-warm); font-size: 12px; font-weight: 600; }
  `]
})
export class AdminSchoolsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  schoolsData?: Paginated<AdminSchool>;
  currentPage = 1;
  q = '';

  showCreateModal = false;
  showImportModal = false;
  newSchool: Partial<AdminSchool> = { name: '', email_domain: '' };
  newSchoolZhTwName = '';

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    this.currentPage = page;
    this.adminService.getSchools({ page: this.currentPage, q: this.q }).subscribe({
      next: (data) => {
        this.schoolsData = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  openCreateModal() {
    this.newSchool = { name: '', email_domain: '' };
    this.newSchoolZhTwName = '';
    this.showCreateModal = true;
  }

  createSchool() {
    if (!this.newSchool.name || !this.newSchool.email_domain) return;
    const payload: Partial<AdminSchool> = { ...this.newSchool };
    if (this.newSchoolZhTwName.trim()) {
      payload.translations = { 'zh-TW': { name: this.newSchoolZhTwName.trim() } };
    }
    this.adminService.createSchool(payload).subscribe(() => {
      this.showCreateModal = false;
      this.cdr.markForCheck();
      this.loadPage(1);
    });
  }
}
