import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrder } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiSelect, UiPagination],
  template: `
    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchOrders' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
      <ui-select [label]="'admin.colStatus' | t" [options]="statusOptions" [(ngModel)]="statusFilter" (ngModelChange)="reload()"></ui-select>
    </div>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <div class="table-container">


      <table class="admin-table admin-table-clickable" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colBook' | t }}</th>
          <th>{{ 'order.buyer' | t }}</th>
          <th>{{ 'order.seller' | t }}</th>
          <th>{{ 'admin.colPrice' | t }}</th>
          <th>{{ 'admin.colStatus' | t }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let order of orders" [routerLink]="[order.id]">
          <td>{{ order.listing?.book_title }}</td>
          <td>{{ order.buyer?.email }}</td>
          <td>{{ order.seller?.email }}</td>
          <td>NT$ {{ order.total_amount }}</td>
          <td><span class="admin-status-badge">{{ ('order.status.' + order.status) | t }}</span></td>
        </tr>
        <tr *ngIf="orders.length === 0">
          <td colspan="5" class="empty-note">{{ 'common.noMatches' | t }}</td>
        </tr>
      </tbody>
    </table>


    </div>

    <ui-pagination [total]="total" [pageSize]="pageSize" [currentPage]="page" (pageChange)="onPageChange($event)"></ui-pagination>
  `,
  styles: [`
  `]
})
export class AdminOrdersListComponent implements OnInit {
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  orders: AdminOrder[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  q = '';
  statusFilter = '';
  loading = true;

  get statusOptions() {
    return [
      { value: '', label: this.i18n.t('admin.filterAll') },
      { value: 'pending', label: this.i18n.t('order.status.pending') },
      { value: 'accepted', label: this.i18n.t('order.status.accepted') },
      { value: 'handed_over', label: this.i18n.t('order.status.handed_over') },
      { value: 'completed', label: this.i18n.t('order.status.completed') },
      { value: 'cancelled', label: this.i18n.t('order.status.cancelled') },
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
    this.adminService.getOrders({ page: this.page, q: this.q, status: this.statusFilter }).subscribe({
      next: (res) => {
        this.orders = res.results;
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
