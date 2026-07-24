import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCategory, Paginated } from '../../core/services/admin.service';
import { TPipe } from '../../core/i18n.service';
import { TranslationEditorComponent, TranslationField } from './translation-editor.component';
import { BulkImportModalComponent } from './bulk-import-modal.component';

@Component({
  selector: 'app-admin-categories-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, TranslationEditorComponent, BulkImportModalComponent],
  template: `
    <ng-container *ngIf="!showModal">
      <div class="header-actions">
        <h2>{{ 'admin.navCategories' | t }}</h2>
        <div>
          <button class="btn btn-outline" style="margin-right: 12px;" (click)="showImportModal = true">{{ 'admin.bulkImport' | t }}</button>
          <button class="btn btn-primary" (click)="openCreateModal()">{{ 'admin.addCollege' | t }}</button>
        </div>
      </div>

      <div class="table-container" *ngIf="categoriesData">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ 'admin.catSlug' | t }}</th>
              <th>{{ 'admin.catTitle' | t }}</th>
              <th>{{ 'admin.catSort' | t }}</th>
              <th>{{ 'admin.colActive' | t }}</th>
              <th>{{ 'admin.colActions' | t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cat of categoriesData.results">
              <td>{{ cat.id }}</td>
              <td>{{ cat.slug }}</td>
              <td>{{ cat.title }}</td>
              <td>{{ cat.sort_order }}</td>
              <td>
                <span class="status-badge" [class.active]="cat.is_active">{{ (cat.is_active ? 'common.yes' : 'common.no') | t }}</span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline" (click)="openEditModal(cat)">{{ 'common.edit' | t }}</button>
                <button class="btn btn-sm btn-danger" style="margin-left: 8px;" (click)="deleteCategory(cat.id)">{{ 'common.delete' | t }}</button>
              </td>
            </tr>
            <tr *ngIf="categoriesData.results.length === 0">
              <td colspan="6" class="empty-state">{{ 'common.noMatches' | t }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="categoriesData.count > 0">
          <button class="btn btn-sm btn-outline" [disabled]="!categoriesData.previous" (click)="loadPage(currentPage - 1)">‹</button>
          <span>{{ currentPage }}</span>
          <button class="btn btn-sm btn-outline" [disabled]="!categoriesData.next" (click)="loadPage(currentPage + 1)">›</button>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="showModal">
      <div class="header-actions">
        <div>
          <h2>{{ editingId ? ('common.edit' | t) : ('common.create' | t) }}: {{ form.title || form.slug }}</h2>
          <a class="btn btn-sm btn-outline" (click)="showModal = false">‹ {{ 'admin.backToList' | t }}</a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="panel">
          <div class="form-group">
            <label>{{ 'admin.catSlug' | t }}</label>
            <input type="text" class="input" [(ngModel)]="form.slug">
          </div>

          <div class="form-group">
            <label>{{ 'admin.catTitle' | t }}</label>
            <input type="text" class="input" [(ngModel)]="form.title">
          </div>

          <div class="form-group">
            <label>{{ 'admin.catDesc' | t }}</label>
            <textarea class="input" [(ngModel)]="form.description"></textarea>
          </div>

          <div class="form-group row-group">
            <div class="col">
              <label>{{ 'admin.catSort' | t }}</label>
              <input type="number" class="input" [(ngModel)]="form.sort_order">
            </div>
            <div class="col checkbox-col">
              <label>
                <input type="checkbox" [(ngModel)]="form.is_active">
                {{ 'admin.colActive' | t }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>{{ 'admin.translationsSection' | t }}</label>
            <app-translation-editor 
              [fields]="translationFields"
              [translations]="form.translations"
              (translationsChange)="form.translations = $event">
            </app-translation-editor>
          </div>

          <button class="btn btn-primary" (click)="saveCategory()">{{ 'admin.save' | t }}</button>
        </div>
      </div>
    </ng-container>
    
    <app-bulk-import-modal 
      [show]="showImportModal"
      endpoint="categories"
      (close)="showImportModal = false"
      (imported)="showImportModal = false; loadPage(1)">
    </app-bulk-import-modal>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-actions h2 { margin-bottom: 8px; }
    .header-actions a { text-decoration: none; cursor: pointer; }
    .detail-grid { max-width: 600px; }
    .panel { background: white; padding: 24px; border-radius: 8px; border: 1px solid var(--line); }
    .panel h3 { margin-top: 0; margin-bottom: 24px; }
    .table-container { background: white; border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
    .admin-table th, .admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--line); }
    .admin-table th { background: var(--paper-warm); font-weight: 600; }
    .admin-table tr:last-child td { border-bottom: none; }
    .empty-state { text-align: center; color: var(--muted); padding: 24px; }
    .btn { padding: 8px 16px; border-radius: 4px; cursor: pointer; border: none; font-size: 14px; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-secondary { background: var(--paper-warm); color: var(--ink); border: 1px solid var(--line); }
    .btn-outline { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
    .btn-danger { background: transparent; color: #dc2626; border: 1px solid #dc2626; }
    .btn-sm { padding: 4px 8px; font-size: 12px; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-top: 1px solid var(--line); }
    
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; background: var(--paper-warm); color: var(--muted); }
    .status-badge.active { background: #e0f2fe; color: #0284c7; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
    .input { width: 100%; padding: 8px 12px; border: 1px solid var(--line); border-radius: 4px; box-sizing: border-box; font-family: inherit; }
    textarea.input { min-height: 80px; resize: vertical; }
    .row-group { display: flex; gap: 16px; }
    .row-group .col { flex: 1; }
    .checkbox-col label { display: flex; align-items: center; gap: 8px; font-weight: normal; margin-top: 32px; cursor: pointer; }
  `]
})
export class AdminCategoriesListComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  categoriesData?: Paginated<AdminCategory>;
  currentPage = 1;

  showModal = false;
  showImportModal = false;
  editingId: number | null = null;
  form: Partial<AdminCategory> = { slug: '', title: '', description: '', sort_order: 0, is_active: true };
  
  translationFields: TranslationField[] = [
    { key: 'title', placeholder: 'admin.collegeName', type: 'text' },
    { key: 'description', placeholder: 'admin.catDesc', type: 'textarea' }
  ];

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    this.currentPage = page;
    const opts: any = { page: this.currentPage };
    
    this.adminService.getCategories(opts).subscribe({
      next: (data) => {
        this.categoriesData = data;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }
  
  openCreateModal() {
    this.form = { slug: '', title: '', description: '', sort_order: 0, is_active: true, translations: {} };
    this.editingId = null;
    this.showModal = true;
  }

  openEditModal(category: AdminCategory) {
    this.form = {
      slug: category.slug,
      title: category.title,
      description: category.description,
      sort_order: category.sort_order,
      is_active: category.is_active,
      translations: category.translations || {}
    };
    this.editingId = category.id;
    this.showModal = true;
  }

  saveCategory() {
    if (!this.form.slug || !this.form.title) return;
    const payload = { ...this.form };

    if (this.editingId) {
      this.adminService.updateCategory(this.editingId, payload).subscribe(() => {
        this.showModal = false;
        this.loadPage(this.currentPage);
        this.cdr.markForCheck();
      });
    } else {
      this.adminService.createCategory(payload).subscribe(() => {
        this.showModal = false;
        this.loadPage(1);
        this.cdr.markForCheck();
      });
    }
  }

  
  deleteCategory(id: number) {
    if (confirm('Are you sure you want to delete this category?')) {
      this.adminService.deleteCategory(id).subscribe(() => {
        this.loadPage(this.currentPage);
        this.cdr.markForCheck();
      });
    }
  }
}
