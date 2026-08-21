import { Component, OnInit, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { AccountService } from '../../core/services/account.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-managers-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiSelect, UiPagination],
  template: `
    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchManagers' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
      <ui-select [label]="'admin.filterActive' | t" [options]="activeOptions" [(ngModel)]="isActiveFilter" (ngModelChange)="reload()"></ui-select>
    </div>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <div class="table-container">


      <table class="admin-table" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colEmail' | t }}</th>
          <th>{{ 'admin.colName' | t }}</th>
          <th>{{ 'admin.colSchool' | t }}</th>
          <th>{{ 'admin.colAdmin' | t }}</th>
          <th>{{ 'admin.colActions' | t }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let user of users">
          <td>{{ user.email }}</td>
          <td>{{ user.display_name || (user.first_name + ' ' + user.last_name) }}</td>
          <td>{{ user.school_name }}</td>
          <td>
            <span class="admin-status-badge" [class.ok]="user.is_staff">{{ (user.is_staff ? 'admin.yes' : 'admin.no') | t }}</span>
            <span class="admin-status-badge superuser-badge" *ngIf="user.is_superuser">Superuser</span>
          </td>
          <td>
            <button 
              *ngIf="canManage(user)"
              class="btn-toggle" 
              [class.revoke]="user.is_staff" 
              (click)="toggleAdmin(user)">
              {{ (user.is_staff ? 'admin.revokeAdmin' : 'admin.grantAdmin') | t }}
            </button>
            <span *ngIf="!isSuperuser" class="text-muted text-sm">{{ 'admin.superuserOnly' | t }}</span>
          </td>
        </tr>
        <tr *ngIf="users.length === 0">
          <td colspan="5" class="empty-note">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>


    </div>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
    .superuser-badge {
      background: rgba(139,92,246,0.12);
      color: #8b5cf6;
    }
    .btn-toggle {
      padding: 4px 10px;
      font-size: 13px;
      border-radius: 4px;
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-toggle:hover {
      background: var(--paper-warm);
    }
    .btn-toggle.revoke {
      border-color: rgba(220,38,38,0.3);
      color: #dc2626;
    }
    .btn-toggle.revoke:hover {
      background: rgba(220,38,38,0.05);
    }
    .btn-toggle:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .text-muted {
      color: var(--muted);
    }
    .text-sm {
      font-size: 12px;
    }
  `]
})
export class AdminManagersListComponent implements OnInit {
  private adminService = inject(AdminService);
  private accountService = inject(AccountService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  users: AdminUser[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  q = '';
  isActiveFilter = 'true';
  loading = true;
  isSuperuser = false;

  constructor() {
    effect(() => {
      const profile = this.accountService.profileCache();
      this.isSuperuser = profile?.is_superuser === true;
      this.cdr.markForCheck();
    });
  }

  get activeOptions() {
    return [
      { value: '', label: this.i18n.t('admin.filterAll') },
      { value: 'true', label: this.i18n.t('admin.filterActiveOnly') },
      { value: 'false', label: this.i18n.t('admin.filterInactiveOnly') },
    ];
  }

  ngOnInit() {
    this.reload();
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

  canManage(targetUser: AdminUser): boolean {
    return this.isSuperuser && !targetUser.is_superuser;
  }

  toggleAdmin(user: AdminUser) {
    if (!this.canManage(user)) return;
    
    const newStaffStatus = !user.is_staff;
    const action = newStaffStatus ? this.i18n.t('admin.grantAdmin') : this.i18n.t('admin.revokeAdmin');
    if (!confirm(`Are you sure you want to ${action} for ${user.email}?`)) {
        return;
    }

    this.adminService.toggleManager(user.id, newStaffStatus).subscribe({
      next: (updatedUser) => {
        user.is_staff = updatedUser.is_staff;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to toggle admin status', err);
        alert('Action failed.');
      }
    });
  }
}
