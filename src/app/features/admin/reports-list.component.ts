import { AuthStore } from '../../core/auth.store';
import { RegionService } from '../../core/region.service';
import { RegionLinkDirective } from '../../core/region-link.directive';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminReport } from '../../core/services/admin.service';
import { parseAdminError } from '../../core/admin-error.util';
import { TPipe, I18nService } from '../../core/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-reports-list',
  standalone: true,
  imports: [RegionLinkDirective, CommonModule, RouterModule, FormsModule, TPipe, UiButton, UiDropdown, UiPagination],
  template: `
    <div class="admin-filters">
      <ui-dropdown [label]="'admin.colStatus' | t" [options]="statusOptions" [(ngModel)]="statusFilter" (ngModelChange)="reload()" [searchable]="false"></ui-dropdown>
    </div>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <table class="admin-table" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colRegion' | t }}</th>
          <th>{{ 'admin.colReporter' | t }}</th>
          <th>{{ 'admin.colListing' | t }}</th>
          <th>{{ 'admin.colReason' | t }}</th>
          <th>{{ 'admin.colStatus' | t }}</th>
          <th *ngIf="statusFilter === 'open'"></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let report of reports">
          <td>{{ getRegionName(report.region) }}</td>
          <td>{{ report.reporter?.email }}</td>
          <td><a [regionLink]="['/listing', report.listing?.id]">{{ report.listing?.title || report.listing?.id }}</a></td>
          <td>{{ ('moderation.reason' + reasonSuffix(report.reason)) | t }}</td>
          <td><span class="admin-status-badge" [class.warn]="report.status === 'open'">{{ ('admin.reportStatus.' + report.status) | t }}</span></td>
          <td *ngIf="report.status === 'open'" class="actions-cell">
            <ui-button (onClick)="action(report, 'actioned')" [disabled]="actingId === report.id">{{ 'admin.reportActionRemove' | t }}</ui-button>
            <ui-button variant="ghost" (onClick)="action(report, 'dismissed')" [disabled]="actingId === report.id">{{ 'admin.reportActionDismiss' | t }}</ui-button>
          </td>
        </tr>
        <tr *ngIf="reports.length === 0">
          <td colspan="6" class="empty-note">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
    .actions-cell { display: flex; gap: 8px; }
  `]
})
export class AdminReportsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authStore = inject(AuthStore);
  private regionService = inject(RegionService);

  reports: AdminReport[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  statusFilter = 'open';
  loading = true;
  actingId: string | null = null;

  getRegionName(code?: string): string {
    if (!code) return '';
    const reg = this.regionService.regions().find((r: any) => r.code === code);
    return reg ? reg.localized_name : code;
  }

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
    this.adminService.getReports(this.statusFilter, this.page, this.regionService.region().toUpperCase()).subscribe({
      next: (res) => {
        this.reports = res.results;
        this.total = res.count;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error(parseAdminError(err, this.i18n, 'admin.errLoadFailed'));
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
      error: (err) => {
        this.toast.error(parseAdminError(err, this.i18n, 'admin.errGeneric'));
        this.actingId = null;
        this.cdr.markForCheck();
      }
    });
  }
}
