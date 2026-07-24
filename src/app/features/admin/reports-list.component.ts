import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminReport } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-reports-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiButton, UiSelect, UiPagination],
  template: `
    <div class="filters">
      <ui-select [label]="'admin.colStatus' | t" [options]="statusOptions" [(ngModel)]="statusFilter" (ngModelChange)="reload()"></ui-select>
    </div>

    <div *ngIf="loading" class="empty-state">{{ 'common.noData' | t }}</div>

    <table class="admin-table" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colReporter' | t }}</th>
          <th>{{ 'admin.colListing' | t }}</th>
          <th>{{ 'admin.colReason' | t }}</th>
          <th>{{ 'admin.colStatus' | t }}</th>
          <th *ngIf="statusFilter === 'open'"></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let report of reports">
          <td>{{ report.reporter?.email }}</td>
          <td><a [routerLink]="['/listing', report.listing?.id]">{{ report.listing?.title || report.listing?.id }}</a></td>
          <td>{{ ('moderation.reason' + reasonSuffix(report.reason)) | t }}</td>
          <td><span class="status-badge" [class.warn]="report.status === 'open'">{{ ('admin.reportStatus.' + report.status) | t }}</span></td>
          <td *ngIf="report.status === 'open'" class="actions-cell">
            <ui-button (onClick)="action(report, 'actioned')" [disabled]="actingId === report.id">{{ 'admin.reportActionRemove' | t }}</ui-button>
            <ui-button variant="ghost" (onClick)="action(report, 'dismissed')" [disabled]="actingId === report.id">{{ 'admin.reportActionDismiss' | t }}</ui-button>
          </td>
        </tr>
        <tr *ngIf="reports.length === 0">
          <td colspan="5" class="empty-state">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
    .filters { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
    .admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .admin-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--line); color: var(--muted); font-weight: 600; }
    .admin-table td { padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .actions-cell { display: flex; gap: 8px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; background: rgba(0,0,0,0.06); color: var(--muted); }
    .status-badge.warn { background: rgba(220,38,38,0.12); color: #dc2626; }
    .empty-state { padding: 24px; text-align: center; color: var(--muted); }
  `]
})
export class AdminReportsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  reports: AdminReport[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  statusFilter = 'open';
  loading = true;
  actingId: string | null = null;

  get statusOptions() {
    return [
      { value: 'open', label: this.i18n.t('admin.reportStatus.open') },
      { value: 'actioned', label: this.i18n.t('admin.reportStatus.actioned') },
      { value: 'dismissed', label: this.i18n.t('admin.reportStatus.dismissed') },
    ];
  }

  reasonSuffix(reason: string): string {
    // Backend reason values (fake/scam/other) map onto the existing
    // moderation.reasonFake/reasonScam/reasonOther i18n keys.
    if (reason === 'fake') return 'Fake';
    if (reason === 'scam') return 'Scam';
    return 'Other';
  }

  ngOnInit() {
    this.reload();
  }

  onPageChange(page: number) {
    this.page = page;
    this.reload();
  }

  reload() {
    this.loading = true;
    this.adminService.getReports(this.statusFilter, this.page).subscribe({
      next: (res) => {
        this.reports = res.results;
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

  action(report: AdminReport, status: 'actioned' | 'dismissed') {
    this.actingId = report.id;
    this.adminService.actionReport(report.id, status).subscribe({
      next: () => {
        this.actingId = null;
        this.reload();
      },
      error: () => {
        this.actingId = null;
        this.cdr.markForCheck();
      }
    });
  }
}
