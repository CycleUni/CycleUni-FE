import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { TPipe, I18nService } from '../../core/i18n.service';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-account-subscriptions',
  standalone: true,
  imports: [CommonModule, UiButton, TPipe],
  template: `
    <div class="content-header">
      <h2>{{ 'acct.tabSubs' | t }}</h2>
      <ui-button variant="ghost" *ngIf="mySubscriptions.length > 0" (onClick)="cancelAllSubscriptions()">{{ 'acct.cancelAllSubs' | t }}</ui-button>
    </div>
    
    <div class="list-container">
      <div class="subscription-item" *ngFor="let sub of mySubscriptions">
        <div class="sub-info">
          <h4>{{ sub.bookTitle }}</h4>
          <p>ISBN: {{ sub.isbn }}</p>
        </div>
        <div class="sub-status" [class.available]="sub.newListingsCount > 0">
          <span *ngIf="sub.newListingsCount === 0">{{ 'acct.noOneListed' | t }}</span>
          <span *ngIf="sub.newListingsCount > 0">
            <strong>{{ 'acct.newListings' | t:{n: sub.newListingsCount} }}</strong>
          </span>
        </div>
        <div class="sub-action">
          <ui-button *ngIf="sub.newListingsCount > 0" (onClick)="viewBook(sub)">{{ 'acct.viewNow' | t }}</ui-button>
          <ui-button variant="ghost" *ngIf="sub.newListingsCount === 0" (onClick)="cancelSubscription(sub.id)">{{ 'acct.cancelNotify' | t }}</ui-button>
        </div>
      </div>
      
      <div class="empty-state" *ngIf="mySubscriptions.length === 0">
        <p>{{ 'acct.noSubs' | t }}</p>
      </div>
    </div>
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
    .subscription-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid var(--line);
      margin-bottom: 16px;
      border-radius: 4px;
    }
    .sub-info h4 { margin: 0 0 8px; }
    .sub-info p {
      margin: 0;
      font-size: 14px;
      color: var(--muted);
      font-family: monospace;
    }
    .sub-status {
      font-size: 14px;
      color: var(--muted);
    }
    .sub-status.available { color: var(--flag); }
    .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      background-color: var(--paper-warm);
    }
    @media (max-width: 768px) {
      .subscription-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .sub-action { align-self: flex-end; }
    }
  `]
})
export class SubscriptionsComponent implements OnInit {
  mySubscriptions: any[] = [];
  
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  readonly i18n = inject(I18nService);

  ngOnInit() {
    this.loadSubscriptions();
  }

  loadSubscriptions() {
    this.accountService.getMySubscriptions().subscribe({
      next: (subs) => {
        this.mySubscriptions = subs;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load subscriptions', err);
        this.cdr.markForCheck();
      }
    });
  }

  cancelSubscription(id: string) {
    if (confirm(this.i18n.t('acct.confirmCancelSub'))) {
      this.accountService.unsubscribe(id).subscribe({
        next: () => this.loadSubscriptions(),
        error: (err) => {
          console.error('Failed to unsubscribe', err);
          alert(this.i18n.t('acct.unsubscribeFailed'));
        }
      });
    }
  }

  cancelAllSubscriptions() {
    if (confirm(this.i18n.t('acct.confirmCancelAllSubs'))) {
      this.accountService.unsubscribeAll().subscribe({
        next: () => this.loadSubscriptions(),
        error: (err) => {
          console.error('Failed to unsubscribe all', err);
          alert(this.i18n.t('acct.unsubscribeFailed'));
        }
      });
    }
  }

  viewBook(sub: any) {
    if (sub.isbn) {
      this.router.navigate(['/search'], { queryParams: { q: sub.isbn } });
    }
  }
}
