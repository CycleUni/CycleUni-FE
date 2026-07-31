import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminChatReport } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-chat-reports-list',
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
            <td>{{ report.reporter_email }}</td>
            <td>{{ report.reported_party_email }}</td>
            <td>{{ report.listing_title }} <span class="conv-id">({{ report.conversation_id }})</span></td>
            <td>{{ reasonLabel(report.reason) | t }}</td>
            <td><span class="status-badge" [class.warn]="report.status === 'open'">{{ ('admin.chatReportStatus.' + report.status) | t }}</span></td>
            <td *ngIf="report.status === 'open'" class="actions-cell">
              <ui-button (onClick)="action(report, 'actioned')" [disabled]="actingId === report.id">{{ 'admin.reportActionFlag' | t }}</ui-button>
              <ui-button variant="ghost" (onClick)="action(report, 'dismissed')" [disabled]="actingId === report.id">{{ 'admin.reportActionDismiss' | t }}</ui-button>
            </td>
          </tr>
          <tr class="detail-row" *ngIf="expandedId === report.id">
            <td colspan="6">
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
        <tr *ngIf="reports.length === 0">
          <td colspan="6" class="empty-state">{{ 'common.noMatches' | t }}</td>
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
    .conv-id { font-size: 12px; color: var(--muted); }
    .report-row { cursor: pointer; }
    .report-row:hover { background: rgba(0,0,0,0.03); }
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
  private cdr = inject(ChangeDetectorRef);

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
    this.adminService.getChatReports(this.statusFilter, this.page).subscribe({
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

  action(report: AdminChatReport, status: 'actioned' | 'dismissed') {
    this.actingId = report.id;
    this.adminService.actionChatReport(report.id, status).subscribe({
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

  toggleExpand(report: AdminChatReport) {
    this.expandedId = this.expandedId === report.id ? null : report.id;
    this.messages = null;
    this.cdr.markForCheck();
  }

  loadMessages(reportId: string) {
    this.loadingMessages = true;
    this.adminService.getChatReportToken(reportId).subscribe({
      next: ({ token, edge_chat_url, room_id }) => {
        const url = `${edge_chat_url}/api/cycleuni/${room_id}/messages`;
        this.http.get<any[]>(url, { headers: { Authorization: `Bearer ${token}`, 'ngsw-bypass': 'true' } }).subscribe({
          next: (msgs) => {
            this.messages = msgs;
            this.loadingMessages = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loadingMessages = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loadingMessages = false;
        this.cdr.markForCheck();
      }
    });
  }
}