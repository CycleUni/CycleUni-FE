import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminListing } from '../../core/services/admin.service';
import { TPipe, I18nService } from '../../core/i18n.service';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { UiSelect } from '../../shared/ui/select.component';
import { UiPagination } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-admin-listings-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TPipe, UiSearchBarComponent, UiSelect, UiPagination],
  template: `
    <div class="admin-filters">
      <ui-search-bar [placeholder]="'admin.searchListings' | t" [value]="q" (search)="onSearch($event)"></ui-search-bar>
      <ui-select [label]="'admin.colStatus' | t" [options]="statusOptions" [(ngModel)]="statusFilter" (ngModelChange)="reload()"></ui-select>
    </div>

    <div *ngIf="loading" class="empty-note">{{ 'common.noData' | t }}</div>

    <div class="table-container">


      <table class="admin-table admin-table-clickable" *ngIf="!loading">
      <thead>
        <tr>
          <th>{{ 'admin.colBook' | t }}</th>
          <th>{{ 'admin.colSeller' | t }}</th>
          <th>{{ 'admin.colSchool' | t }}</th>
          <th>{{ 'admin.colPrice' | t }}</th>
          <th>{{ 'admin.colStatus' | t }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let listing of listings" [routerLink]="[listing.id]">
          <td>{{ listing.book?.title }}</td>
          <td>{{ listing.seller?.email }}</td>
          <td>{{ listing.school?.name }}</td>
          <td>NT$ {{ listing.price }}</td>
          <td><span class="admin-status-badge">{{ ('admin.listingStatus.' + listing.status) | t }}</span></td>
        </tr>
        <tr *ngIf="listings.length === 0">
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
export class AdminListingsListComponent implements OnInit {
  private adminService = inject(AdminService);
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  listings: AdminListing[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  q = '';
  statusFilter = '';
  loading = true;

  get statusOptions() {
    return [
      { value: '', label: this.i18n.t('admin.filterAll') },
      { value: 'active', label: this.i18n.t('admin.listingStatus.active') },
      { value: 'reserved', label: this.i18n.t('admin.listingStatus.reserved') },
      { value: 'sold', label: this.i18n.t('admin.listingStatus.sold') },
      { value: 'removed', label: this.i18n.t('admin.listingStatus.removed') },
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
    this.adminService.getListings({ page: this.page, q: this.q, status: this.statusFilter }).subscribe({
      next: (res) => {
        this.listings = res.results;
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
