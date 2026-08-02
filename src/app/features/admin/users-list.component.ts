import { Component, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiSelect, UiPagination],
  template: `
    <div class="filters">
      <ui-search-bar [placeholder]="'admin.searchUsers' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
      <ui-select [label]="'admin.filterActive' | t" [options]="activeOptions" [(ngModel)]="isActiveFilter" (ngModelChange)="reload()"></ui-select>
    </div>

    <div *ngIf="loading" class="empty-state">{{ 'common.noData' | t }}</div>

    <table class="admin-table" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colEmail' | t }}</th>
          <th>{{ 'admin.colName' | t }}</th>
          <th>{{ 'admin.colSchool' | t }}</th>
          <th>{{ 'admin.colVerified' | t }}</th>
          <th>{{ 'admin.colActive' | t }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let user of users" [routerLink]="[user.id]">
          <td>{{ user.email }}</td>
          <td>{{ user.display_name || (user.first_name + ' ' + user.last_name) }}</td>
          <td>{{ user.school_name }}</td>
          <td>
            <span class="status-badge" [class.ok]="user.is_verified">{{ (user.is_verified ? 'admin.yes' : 'admin.no') | t }}</span>
          </td>
          <td>
            <span class="status-badge" [class.ok]="user.is_active">{{ (user.is_active ? 'admin.yes' : 'admin.no') | t }}</span>
          </td>
        </tr>
        <tr *ngIf="users.length === 0">
          <td colspan="5" class="empty-state">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
    .filters {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .filters ui-search-bar {
      flex: 1;
      min-width: 240px;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .admin-table th {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid var(--line);
      color: var(--muted);
      font-weight: 600;
    }
    .admin-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
    }
    .admin-table tbody tr {
      cursor: pointer;
    }
    .admin-table tbody tr:hover {
      background: var(--paper-warm);
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      background: rgba(0,0,0,0.06);
      color: var(--muted);
    }
    .status-badge.ok {
      background: rgba(22,163,74,0.12);
      color: #16a34a;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--muted);
    }
  `]
})
export class AdminUsersListComponent {
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  users: AdminUser[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  q = '';
  isActiveFilter = '';
  loading = true;

  get activeOptions() {
    return [
      { value: '', label: this.i18n.t('admin.filterAll') },
      { value: 'true', label: this.i18n.t('admin.filterActiveOnly') },
      { value: 'false', label: this.i18n.t('admin.filterInactiveOnly') },
    ];
  }

  constructor() {
    // school_name is localized server-side, and every filter/header label
    // here goes through the i18n `t` pipe — but none of that re-fetches the
    // already-loaded rows. Re-run the query on language change so the table
    // actually reflects the new language instead of staying stuck on
    // whatever was active when the page first loaded (same fix as the user
    // detail page's school dropdown).
    effect(() => {
      this.i18n.lang();
      this.reload();
    });
  }

  onSearch(q: string) {
    this.q = q;
    this.page = 1;
    this.reload();
  }

  onPageChange(page: number) {
    this.page = page;
    this.reload();
  }

  reload() {
    this.loading = true;
    this.adminService.getUsers({ page: this.page, q: this.q, is_active: this.isActiveFilter }).subscribe({
      next: (res) => {
        this.users = res.results;
        this.total = res.count;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
