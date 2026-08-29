import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiPagination } from '../../shared/ui/pagination.component';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCurrency, Paginated } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { parseAdminError } from '../../core/admin-error.util';

@Component({
  selector: 'app-admin-currencies-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiPagination],
  template: `
    <div class="header-actions">
      <h2>{{ 'admin.navCurrencies' | t }}</h2>
      <button class="admin-btn admin-btn-primary" (click)="openCreateModal()">{{ 'admin.addCurrency' | t }}</button>
    </div>

    <div class="table-container" *ngIf="data">
      <table class="admin-table">
        <thead>
          <tr>
            <th>{{ 'admin.currencyCode' | t }}</th>
            <th>{{ 'admin.currencySymbol' | t }}</th>
            <th>{{ 'admin.currencyDecimals' | t }}</th>
            <th>{{ 'admin.regionIsActive' | t }}</th>
            <th>{{ 'admin.colActions' | t }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of data.results">
            <td>{{ item.code }}</td>
            <td>{{ item.symbol }}</td>
            <td>{{ item.decimal_places }}</td>
            <td>{{ item.is_active ? ('admin.yes' | t) : ('admin.no' | t) }}</td>
            <td>
              <a class="admin-btn admin-btn-sm admin-btn-outline" [routerLink]="[item.code]">{{ 'common.edit' | t }}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="currentPage" (pageChange)="loadPage($event)"></ui-pagination>
    </div>

    <div class="app-modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
      <div class="app-modal" style="width: 400px; max-width: 90%;" (click)="$event.stopPropagation()">
        <h3 class="app-modal-title">{{ 'admin.addCurrency' | t }}</h3>
        <div class="app-modal-body">
          <div class="form-group">
            <label>{{ 'admin.currencyCode' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.code">
          </div>
          <div class="form-group">
            <label>{{ 'admin.currencySymbol' | t }}</label>
            <input type="text" class="admin-form-control" [(ngModel)]="newItem.symbol">
          </div>
          <div class="form-group">
            <label>{{ 'admin.currencyDecimals' | t }}</label>
            <input type="number" class="admin-form-control" [(ngModel)]="newItem.decimal_places">
          </div>
          <div class="form-group">
            <label>{{ 'admin.currencySymbolPos' | t }}</label>
            <select class="admin-form-control" [(ngModel)]="newItem.symbol_position">
              <option value="prefix">prefix</option>
              <option value="suffix">suffix</option>
            </select>
          </div>
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" [(ngModel)]="newItem.is_active">
              {{ 'admin.regionIsActive' | t }}
            </label>
          </div>
        </div>
        <div class="app-modal-actions">
          <button class="admin-btn admin-btn-secondary" (click)="showCreateModal = false">{{ 'common.cancel' | t }}</button>
          <button class="admin-btn admin-btn-primary" (click)="create()">{{ 'admin.save' | t }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
  `]
})
export class AdminCurrenciesListComponent implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private i18n = inject(I18nService);

  data?: Paginated<AdminCurrency>;
  currentPage = 1;
  total = 0;
  pageSize = 20;

  showCreateModal = false;
  newItem: Partial<AdminCurrency> = { code: '', symbol: '', decimal_places: 0, symbol_position: 'prefix', is_active: true };

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    this.currentPage = page;
    this.adminService.getCurrencies().subscribe({
      next: (res) => {
        // Handle both paginated and non-paginated arrays defensively
        if (Array.isArray(res)) {
           this.data = { count: res.length, results: res, next: null, previous: null } as any;
           this.total = res.length;
        } else {
           this.data = res;
           this.total = res.count;
        }
        this.cdr.markForCheck();
      }
    });
  }

  openCreateModal() {
    this.newItem = { code: '', symbol: '', decimal_places: 0, symbol_position: 'prefix', is_active: true };
    this.showCreateModal = true;
  }

  create() {
    if (!this.newItem.code || !this.newItem.symbol) return;
    this.adminService.createCurrency(this.newItem).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadPage(1);
      },
      error: (err) => alert(parseAdminError(err, this.i18n))
    });
  }
}
