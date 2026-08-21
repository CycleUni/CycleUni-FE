import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService, AdminOrder } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiButton } from '../../shared/ui/button.component';
import { ForceCancelModalComponent } from './force-cancel-modal.component';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe, UiButton, ForceCancelModalComponent],
  template: `
    <a routerLink="../.." class="back-link">&larr; {{ 'admin.backToList' | t }}</a>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <div class="detail-card" *ngIf="!loading && order">
      <h2>{{ order.listing?.book_title }}</h2>

      <div class="field-grid">
        <div class="field"><label>{{ 'order.buyer' | t }}</label><span>{{ order.buyer?.email }}</span></div>
        <div class="field"><label>{{ 'order.seller' | t }}</label><span>{{ order.seller?.email }}</span></div>
        <div class="field"><label>{{ 'admin.colPrice' | t }}</label><span>NT$ {{ order.total_amount }}</span></div>
        <div class="field"><label>{{ 'admin.colStatus' | t }}</label><span class="admin-status-badge">{{ ('order.status.' + order.status) | t }}</span></div>
      </div>

      <p *ngIf="cancelledMsg" class="inline-msg ok">{{ cancelledMsg }}</p>

      <ui-button
        variant="ghost"
        (onClick)="showForceCancelModal = true"
        [disabled]="order.status === 'cancelled' || order.status === 'completed'"
      >{{ 'admin.forceCancelButton' | t }}</ui-button>
    </div>

    <app-force-cancel-modal
      *ngIf="showForceCancelModal && order"
      [orderId]="order.id"
      (closed)="showForceCancelModal = false"
      (submitted)="onForceCancelled()"
    ></app-force-cancel-modal>
  `,
  styles: [`
    .back-link { display: inline-block; margin-bottom: 16px; color: var(--muted); text-decoration: none; font-size: 14px; }
    .back-link:hover { color: var(--accent); }
    .detail-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 24px; max-width: 520px; box-shadow: var(--shadow-card-lg); }
    .detail-card h2 { margin-top: 0; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 12px; color: var(--muted); }
    .field span { font-size: 14px; color: var(--ink); }
    .inline-msg { margin: 12px 0; font-size: 14px; }
    .inline-msg.ok { color: #16a34a; }
  `]
})
export class AdminOrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  order: AdminOrder | null = null;
  loading = true;
  showForceCancelModal = false;
  cancelledMsg = '';

  ngOnInit() {
    this.load();
  }

  private load() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.adminService.getOrder(id).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onForceCancelled() {
    this.showForceCancelModal = false;
    this.cancelledMsg = this.i18n.t('admin.forceCancelSuccess');
    this.load();
  }
}
