import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService, Order } from '../../core/services/order.service';
import { AuthStore } from '../../core/auth.store';
import { TPipe, I18nService } from '../../core/i18n.service';
import { AccountService } from '../../core/services/account.service';
import { UiButton } from '../../shared/ui/button.component';
import { UiSearchBarComponent } from '../../shared/ui/search-bar.component';
import { Router, ActivatedRoute } from '@angular/router';
import { ReviewModalComponent } from './review-modal.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe, UiButton, ReviewModalComponent, UiSearchBarComponent],
  template: `
    <div class="content-header">
      <h2>{{ 'acct.myOrders' | t }}</h2>
    </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab === 'buying'" (click)="setTab('buying')">{{ 'acct.buying' | t }}</button>
        <button class="tab" [class.active]="activeTab === 'selling'" (click)="setTab('selling')">{{ 'acct.selling' | t }}</button>
      </div>

      <ui-search-bar 
        [placeholder]="'acct.searchOrders' | t" 
        [value]="searchQuery" 
        (search)="onSearchQuery($event)">
      </ui-search-bar>

      <div *ngIf="isLoading" style="padding: 24px;">{{ 'order.loading' | t }}</div>

      <div *ngIf="!isLoading">
        <div *ngIf="activeTab === 'buying'">
          <div *ngIf="filteredBoughtOrders.length === 0" class="empty-state">{{ 'acct.noOrders' | t }}</div>
          <div class="order-card" *ngFor="let order of filteredBoughtOrders" [id]="'order-' + order.id">
            <div *ngIf="hasExclusiveConflict(order)" class="exclusive-conflict">
              {{ 'order.exclusiveConflict' | t }}
              <ui-button variant="ghost" (onClick)="cancelOtherPending(order)">{{ 'order.cancelOtherPending' | t }}</ui-button>
            </div>
            <div class="order-header">
              <span class="order-id">#{{ order.id }}</span>
              <span class="order-status badge" [ngClass]="order.status">
                {{ order.status === 'cancelled' && order.cancel_reason ? ('order.cancel_reason.' + order.cancel_reason | t) : (('order.status.' + order.status) | t) }}
              </span>
            </div>
            <div class="order-body">
              <div class="info">
                <h3 class="book-title-serif">{{ order.listing_title }}</h3>
                <p>{{ 'order.seller' | t }}: {{ order.seller_name }}</p>
                <p *ngIf="order.meetup_time" class="meetup-detail">{{ 'order.meetupTime' | t:{time: order.meetup_time} }}</p>
                <p *ngIf="order.meetup_location" class="meetup-detail">{{ 'order.meetupLocation' | t:{location: order.meetup_location} }}</p>
              </div>
              <div class="price">
                NT$ {{ order.total_amount }}
              </div>
            </div>
            <div class="order-actions" *ngIf="hasActions(order, 'buyer')">
              <ui-button *ngIf="order.status === 'pending' || order.status === 'accepted'" variant="ghost" (onClick)="updateStatus(order, 'cancelled', 'buyer_cancelled')">{{ 'order.cancel' | t }}</ui-button>
              <ui-button *ngIf="order.status === 'handed_over'" (onClick)="updateStatus(order, 'completed')">{{ 'order.confirmReceived' | t }}</ui-button>
              <ui-button *ngIf="(order.status === 'completed' || order.status === 'cancelled') && !order.has_reviewed" variant="ghost" (onClick)="openReviewModal(order)">{{ 'order.reviewAndReport' | t }}</ui-button>
            </div>
          </div>
        </div>

        <div *ngIf="activeTab === 'selling'">
          <div *ngIf="filteredSoldOrders.length === 0" class="empty-state">{{ 'acct.noSales' | t }}</div>
          <div class="order-card" *ngFor="let order of filteredSoldOrders" [id]="'order-' + order.id">
            <div class="order-header">
              <span class="order-id">#{{ order.id }}</span>
              <span class="order-status badge" [ngClass]="order.status">
                {{ order.status === 'cancelled' && order.cancel_reason ? ('order.cancel_reason.' + order.cancel_reason | t) : (('order.status.' + order.status) | t) }}
              </span>
            </div>
            <div class="order-body">
              <div class="info">
                <h3 class="book-title-serif">{{ order.listing_title }}</h3>
                <p>{{ 'order.buyer' | t }}: {{ order.buyer_name }}</p>
                <p *ngIf="order.meetup_time" class="meetup-detail">{{ 'order.meetupTime' | t:{time: order.meetup_time} }}</p>
                <p *ngIf="order.meetup_location" class="meetup-detail">{{ 'order.meetupLocation' | t:{location: order.meetup_location} }}</p>
              </div>
              <div class="price">
                NT$ {{ order.total_amount }}
              </div>
            </div>
            <div class="order-actions" *ngIf="hasActions(order, 'seller')">
              <ng-container *ngIf="order.status === 'pending'">
                <ui-button (onClick)="approveOrder(order)">{{ 'order.approve' | t }}</ui-button>
                <ui-button variant="ghost" (onClick)="updateStatus(order, 'cancelled', 'seller_rejected')">{{ 'order.reject' | t }}</ui-button>
              </ng-container>
              <ui-button *ngIf="order.status === 'accepted'" (onClick)="updateStatus(order, 'handed_over')">{{ 'order.markHandedOver' | t }}</ui-button>
              <ui-button variant="ghost" *ngIf="order.status === 'accepted'" (onClick)="updateStatus(order, 'cancelled', 'seller_cancelled')">{{ 'order.cancel' | t }}</ui-button>
              <ui-button *ngIf="(order.status === 'completed' || order.status === 'cancelled') && !order.has_reviewed" variant="ghost" (onClick)="openReviewModal(order)">{{ 'order.reviewAndReport' | t }}</ui-button>
            </div>
          </div>
        </div>
      </div>
      
      <app-review-modal *ngIf="reviewingOrderId" [orderId]="reviewingOrderId" (onClosed)="onReviewModalClosed($event)"></app-review-modal>
  `,
  styles: [`
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .content-header h2 { margin: 0; }
    .tabs {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }
    .tab {
      background: none;
      border: none;
      padding: 8px 16px;
      font-size: 16px;
      cursor: pointer;
      color: var(--muted);
      border-bottom: 2px solid transparent;
    }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 700;
    }
    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      background-color: var(--paper-warm);
    }
    .order-card {
      padding: 24px 0;
      border-bottom: 1px solid var(--line);
    }
    .order-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .order-id {
      font-weight: 500;
      color: var(--muted);
      font-size: 14px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge.pending { background: #e2e3e5; color: #383d41; }
    .badge.accepted { background: #fff3cd; color: #856404; }
    .badge.handed_over { background: #cce5ff; color: #004085; }
    .badge.completed { background: #d4edda; color: #155724; }
    .badge.cancelled { background: #f8d7da; color: #721c24; }
    
    .exclusive-conflict {
      background: #cce5ff;
      color: #004085;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }
    .meetup-detail {
      font-size: 14px;
      color: var(--primary) !important;
      font-weight: 500;
    }
    
    .order-body {
      display: flex;
      justify-content: space-between;
    }
    .info h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .info p {
      margin: 4px 0;
      font-size: 14px;
      color: var(--muted);
    }
    .price {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent);
    }
    .order-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed var(--line);
      justify-content: flex-end;
    }
    .highlight-pulse {
      animation: highlight 2s;
    }
    @keyframes highlight {
      0% { background-color: var(--accent-light, #e0f2fe); }
      100% { background-color: transparent; }
    }
  `]
})
export class OrdersComponent implements OnInit {
  activeTab: 'buying' | 'selling' = 'buying';
  isLoading = true;
  boughtOrders: Order[] = [];
  soldOrders: Order[] = [];
  reviewingOrderId: string | null = null;
  searchQuery = '';
  highlightOrderId: string | null = null;

  private orderService = inject(OrderService);
  private authStore = inject(AuthStore);
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);

  get filteredBoughtOrders() {
    if (!this.searchQuery) return this.boughtOrders;
    const q = this.searchQuery.toLowerCase();
    return this.boughtOrders.filter(o => 
      (o.listing_title && o.listing_title.toLowerCase().includes(q)) ||
      (o.id && String(o.id).includes(q))
    );
  }

  get filteredSoldOrders() {
    if (!this.searchQuery) return this.soldOrders;
    const q = this.searchQuery.toLowerCase();
    return this.soldOrders.filter(o => 
      (o.listing_title && o.listing_title.toLowerCase().includes(q)) ||
      (o.id && String(o.id).includes(q))
    );
  }

  hasActions(order: Order, role: 'buyer' | 'seller'): boolean {
    if ((order.status === 'completed' || order.status === 'cancelled') && !order.has_reviewed) return true;
    if (role === 'buyer') {
      return order.status === 'pending' || order.status === 'accepted' || order.status === 'handed_over';
    } else {
      return order.status === 'pending' || order.status === 'accepted';
    }
  }

  onSearchQuery(query: string) {
    this.searchQuery = query;
  }

  ngOnInit() {
    if (!this.authStore.isLoggedIn()) {
      this.router.navigate(['/account']);
      return;
    }
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.highlightOrderId = params['orderId'];
      }
    });
    this.loadOrders();
  }

  currentUserId: string | null = null;

  setTab(tab: 'buying' | 'selling') {
    this.activeTab = tab;
    if (this.currentUserId) {
      this.markTabAsSeen(this.currentUserId);
    }
  }

  markTabAsSeen(userId: string) {
    if (this.activeTab === 'buying') {
      const maxBought = this.boughtOrders.reduce((max, o) => Math.max(max, new Date(o.updated_at || o.created_at || 0).getTime()), 0);
      localStorage.setItem(`lastSeenBoughtAt_${userId}`, maxBought.toString());
    } else {
      const maxSold = this.soldOrders.reduce((max, o) => Math.max(max, new Date(o.updated_at || o.created_at || 0).getTime()), 0);
      localStorage.setItem(`lastSeenSoldAt_${userId}`, maxSold.toString());
    }
    this.orderService.checkUnreadOrders(userId);
  }

  loadOrders() {
    this.isLoading = true;
    this.accountService.getMyProfile().subscribe({
      next: (profile) => {
        const userId = profile.id;
        this.currentUserId = userId;
        this.orderService.getOrders().subscribe({
          next: (orders) => {
            this.boughtOrders = orders.filter(o => String(o.buyer) === String(userId));
            this.soldOrders = orders.filter(o => String(o.seller) === String(userId));
            
            if (this.boughtOrders.length > 0 && this.soldOrders.length === 0) {
              this.activeTab = 'buying';
            } else if (this.boughtOrders.length === 0 && this.soldOrders.length > 0) {
              this.activeTab = 'selling';
            } else if (this.boughtOrders.length > 0 && this.soldOrders.length > 0) {
              const newestBought = Math.max(...this.boughtOrders.map(o => new Date(o.updated_at || o.created_at || 0).getTime()));
              const newestSold = Math.max(...this.soldOrders.map(o => new Date(o.updated_at || o.created_at || 0).getTime()));
              this.activeTab = newestBought >= newestSold ? 'buying' : 'selling';
            }
            
            this.markTabAsSeen(userId);
            this.isLoading = false;
            this.cdr.markForCheck();
            this.checkHighlight();
          },
          error: (err) => {
            console.error('Failed to load orders', err);
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  checkHighlight() {
    if (!this.highlightOrderId) return;
    
    const isBought = this.boughtOrders.some(o => String(o.id) === this.highlightOrderId);
    const isSold = this.soldOrders.some(o => String(o.id) === this.highlightOrderId);
    
    if (isBought) this.activeTab = 'buying';
    else if (isSold) this.activeTab = 'selling';
    
    setTimeout(() => {
      const el = document.getElementById('order-' + this.highlightOrderId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-pulse');
        setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
      }
    }, 100);
  }

  updateStatus(order: Order, status: string, cancelReason?: string, meetupTime?: string, meetupLocation?: string) {
    if (!order.id) return;
    this.orderService.updateOrderStatus(order.id, status, cancelReason, meetupTime, meetupLocation).subscribe({
      next: (updatedOrder) => {
        // Find and replace - MERGE updated fields with existing order
        if (this.activeTab === 'buying') {
          const idx = this.boughtOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) this.boughtOrders[idx] = { ...this.boughtOrders[idx], ...updatedOrder };
        } else {
          const idx = this.soldOrders.findIndex(o => o.id === order.id);
          if (idx !== -1) this.soldOrders[idx] = { ...this.soldOrders[idx], ...updatedOrder };
        }
        this.cdr.markForCheck();
      }
    });
  }

  approveOrder(order: Order) {
    // Simple prompt for MVP
    const meetupTime = window.prompt(this.i18n.t('order.promptMeetupTime'));
    const meetupLocation = window.prompt(this.i18n.t('order.promptMeetupLocation'));
    
    this.updateStatus(order, 'accepted', undefined, meetupTime || undefined, meetupLocation || undefined);
  }

  hasExclusiveConflict(order: Order): boolean {
    if (order.status !== 'accepted' && order.status !== 'handed_over') return false;
    return this.boughtOrders.some(o => 
      o.listing_title === order.listing_title && o.status === 'pending'
    );
  }

  cancelOtherPending(acceptedOrder: Order) {
    const toCancel = this.boughtOrders.filter(o => 
      o.listing_title === acceptedOrder.listing_title && o.status === 'pending'
    );
    toCancel.forEach(o => {
      this.updateStatus(o, 'cancelled', 'buyer_cancelled');
    });
  }

  onReviewModalClosed(success: boolean) {
    this.reviewingOrderId = null;
    if (success) {
      if (this.currentReviewOrderRef) {
        this.currentReviewOrderRef.has_reviewed = true;
      }
      alert(this.i18n.t('order.reviewSubmitted'));
      this.cdr.markForCheck();
    }
  }

  private currentReviewOrderRef: Order | null = null;

  openReviewModal(order: Order) {
    this.currentReviewOrderRef = order;
    this.reviewingOrderId = order.id || null;
  }
}
