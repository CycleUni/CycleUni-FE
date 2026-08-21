import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPagination } from '../../shared/ui/pagination.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminSchool, Paginated } from '../../core/services/admin.service';
import { TPipe } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { BulkImportModalComponent } from './bulk-import-modal.component';

@Component({
  selector: 'app-admin-schools-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, BulkImportModalComponent, UiPagination],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navSchools' | t }}</h2>
      <div>
        <button class="admin-btn admin-btn-outline" style="margin-right: 12px;" (click)="showImportModal = true">{{ 'admin.bulkImport' | t }}</button>
        <button class="admin-btn admin-btn-primary" (click)="openCreateModal()">{{ 'admin.addSchool' | t }}</button>
      </div>
    </div>

    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchSchools' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
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
              <a class="admin-btn admin-btn-sm admin-btn-outline" [routerLink]="[school.id]">{{ 'common.edit' | t }}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="currentPage" (pageChange)="loadPage($event)"></ui-pagination>
    </div>

    <div class="admin-modal-overlay" *ngIf="showCreateModal">
      <div class="admin-modal">
        <h3>{{ 'admin.addSchool' | t }}</h3>
        <div class="form-group">
          <label>{{ 'admin.schoolName' | t }}</label>
          <input type="text" class="admin-form-control" [(ngModel)]="newSchool.name">
        </div>
        <div class="form-group">
          <label>{{ 'admin.colDomain' | t }}</label>
          <input type="text" class="admin-form-control" [(ngModel)]="newSchool.email_domain" [placeholder]="'admin.domainDesc' | t">
        </div>
        <div class="form-group">
          <label>{{ 'admin.translationsSection' | t }}</label>
          <div class="translation-row">
            <span class="lang-tag">zh-TW</span>
            <input type="text" class="admin-form-control" [(ngModel)]="newSchoolZhTwName" [placeholder]="'admin.schoolName' | t">
          </div>
        </div>
        <div class="admin-modal-actions">
          <button class="admin-btn admin-btn-secondary" (click)="showCreateModal = false">{{ 'common.cancel' | t }}</button>
          <button class="admin-btn admin-btn-primary" (click)="createSchool()">{{ 'admin.save' | t }}</button>
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
    .admin-modal { width: 400px; max-width: 90%; }
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
    .translation-row { display: flex; align-items: center; gap: 8px; }
    .lang-tag { flex: 0 0 auto; padding: 4px 8px; border-radius: 4px; background: var(--paper-warm); font-size: 12px; font-weight: 600; }
  `]
})
export class AdminSchoolsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  schoolsData?: Paginated<AdminSchool>;
  currentPage = 1;
  total = 0;
  pageSize = 20;
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
        this.total = data.count;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(q: string) {
    this.q = q;
    this.loadPage(1);
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
