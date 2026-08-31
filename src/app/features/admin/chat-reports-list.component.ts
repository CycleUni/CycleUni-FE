import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminChatReport } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { parseAdminError } from '../../core/admin-error.util';
import { UiButton } from '../../shared/ui/button.component';
import { UiDropdown } from '../../shared/ui/dropdown.component';
import { UiPagination } from '../../shared/ui/pagination.component';
import { AuthStore } from '../../core/auth.store';
import { RegionService } from '../../core/region.service';

@Component({
  selector: 'app-admin-chat-reports-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiButton, UiDropdown, UiPagination],
  template: `
    <div class="admin-filters">
      <ui-dropdown [label]="'admin.colStatus' | t" [options]="statusOptions" [(ngModel)]="statusFilter" (ngModelChange)="reload()" [searchable]="false"></ui-dropdown>
    </div>

    <div *ngIf="loading" class="empty-note">{{ 'common.loading' | t }}</div>

    <table class="admin-table admin-table-clickable" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colRegion' | t }}</th>
          <th>{{ 'admin.colReporter' | t }}</th>
          <th>{{ 'admin.colReported' | t }}</th>
          <th>{{ 'admin.colConversation' | t }}</th>
          <th>{{ 'admin.colReason' | t }}</th>
          <th>{{ 'admin.colStatus' | t }}</th>
          <th *ngIf="statusFilter === 'open'"></th>
        </tr>
      </thead>
      <tbody>
        <ng-container *ngFor="let report of reports">
          <tr class="report-row" (click)="toggleExpand(report)">
            <td>{{ getRegionName(report.region) }}</td>
            <td>{{ report.reporter_email }}</td>
            <td>{{ report.reported_party_email }}</td>
            <td>{{ report.listing_title }} <span class="conv-id">({{ report.conversation_id }})</span></td>
            <td>{{ reasonLabel(report.reason) | t }}</td>
            <td><span class="admin-status-badge" [class.warn]="report.status === 'open'">{{ ('admin.chatReportStatus.' + report.status) | t }}</span></td>
            <td *ngIf="report.status === 'open'" class="actions-cell">
              <ui-button (onClick)="action(report, 'actioned')" [disabled]="actingId === report.id">{{ 'admin.reportActionFlag' | t }}</ui-button>
              <ui-button variant="ghost" (onClick)="action(report, 'dismissed')" [disabled]="actingId === report.id">{{ 'admin.reportActionDismiss' | t }}</ui-button>
            </td>
          </tr>
          <tr class="detail-row" *ngIf="expandedId === report.id">
            <td colspan="7">
              <div class="detail-content">
                <div *ngIf="report.detail" class="report-detail">
                  <strong>Details:</strong> {{ report.detail }}
                </div>
                <ui-button variant="ghost" (onClick)="loadMessages(report.id)" [disabled]="loadingMessages">
                  {{ loadingMessages ? 'Loading...' : 'View Messages' }}
                </ui-button>
                <div *ngIf="messages" class="messages-preview">
                  <div *ngFor="let msg of messages" class="msg-line">
                    <span class="msg-user">[{{ msg.user_id }}]:</span> {{ msg.content }}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </ng-container>
        <!-- Stays noMatches unconditionally: statusOptions has no "all"
             entry, so this table is always scoped to one status and an empty
             result always means "none with this status", never "no reports". -->
        <tr *ngIf="reports.length === 0">
          <td colspan="7" class="empty-note">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
    .actions-cell { display: flex; gap: 8px; }
    .conv-id { font-size: 12px; color: var(--muted); }
    .report-row { cursor: pointer; }
    .report-row:hover { background: var(--paper-warm); }
    .detail-content { padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
    .report-detail { font-size: 14px; color: var(--muted); }
    .messages-preview { max-height: 300px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px; padding: 8px; }
    .msg-line { font-size: 13px; color: var(--ink); padding: 4px 0; border-bottom: 1px solid var(--line); }
    .msg-line:last-child { border-bottom: none; }
    .msg-user { font-weight: 600; color: var(--accent); }
  `]
})
export class AdminChatReportsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private authStore = inject(AuthStore);
  private regionService = inject(RegionService);

  reports: AdminChatReport[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  statusFilter = 'open';
  loading = true;
  actingId: string | null = null;
  expandedId: string | null = null;
  loadingMessages = false;
  messages: any[] | null = null;

  getRegionName(code?: string): string {
    if (!code) return '';
    const reg = this.regionService.regions().find(r => r.code === code);
    return reg ? reg.localized_name : code;
  }

  get statusOptions() {
    return [
      { value: 'open', label: this.i18n.t('admin.chatReportStatus.open') },
      { value: 'actioned', label: this.i18n.t('admin.chatReportStatus.actioned') },
      { value: 'dismissed', label: this.i18n.t('admin.chatReportStatus.dismissed') },
    ];
  }

  reasonLabel(reason: string): string {
    switch (reason) {
      case 'harassment': return 'admin.reportReasonHarassment';
      case 'scam': return 'admin.reportReasonScam';
      case 'spam': return 'admin.reportReasonSpam';
      default: return 'admin.reportReasonOther';
    }
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
    this.adminService.getChatReports(this.statusFilter, this.page, this.regionService.region().toUpperCase()).subscribe({
      next: (res) => {
        this.reports = res.results;
        this.total = res.count;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error(parseAdminError(err, this.i18n, 'admin.errGeneric'));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  action(report: AdminChatReport, status: 'actioned' | 'dismissed') {
    this.actingId = report.id;
    this.adminService.actionChatReport(report.id, status).subscribe({
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

  toggleExpand(report: AdminChatReport) {
    this.expandedId = this.expandedId === report.id ? null : report.id;
    this.messages = null;
    this.cdr.markForCheck();
  }

  loadMessages(reportId: string) {
    this.loadingMessages = true;
    this.adminService.getChatReportToken(reportId).subscribe({
      next: ({ token, edge_chat_url, room_id }) => {
        const url = `${edge_chat_url}/api/unibooks/${room_id}/messages`;
        this.http.get<any[]>(url, { headers: { Authorization: `Bearer ${token}`, 'ngsw-bypass': 'true' } }).subscribe({
          next: (msgs) => {
            this.messages = msgs;
            this.loadingMessages = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.toast.error(parseAdminError(err, this.i18n, 'admin.errLoadFailed'));
            this.loadingMessages = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        this.toast.error(parseAdminError(err, this.i18n, 'admin.errLoadFailed'));
        this.loadingMessages = false;
        this.cdr.markForCheck();
      }
    });
  }
}