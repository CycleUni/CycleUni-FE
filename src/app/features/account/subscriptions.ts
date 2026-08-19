import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { UiBookTile } from '../../shared/ui/book-tile.component';
import { TPipe, I18nService } from '../../core/i18n.service';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-account-subscriptions',
  standalone: true,
  imports: [CommonModule, UiButton, UiBookTile, TPipe],
  template: `
    <div class="section-head-row">
      <h2 class="section-heading">{{ 'acct.tabSubs' | t }}</h2>
      <ui-button variant="ghost" *ngIf="mySubscriptions.length > 0" (onClick)="cancelAllSubscriptions()">{{ 'acct.cancelAllSubs' | t }}</ui-button>
    </div>

    <div class="discover-grid" *ngIf="mySubscriptions.length > 0">
      <ui-book-tile
        *ngFor="let sub of mySubscriptions"
        [title]="sub.bookTitle"
        [isbn]="sub.isbn"
        [coverUrl]="sub.bookCoverUrl"
        mode="waitlist"
        [waitingCount]="sub.newListingsCount"
        [link]="sub.isbn ? ['/search'] : undefined"
        [linkParams]="{ q: sub.isbn }"
      >
        <div tile-actions class="tile-actions-inner">
          <span class="sub-status" [class.available]="sub.newListingsCount > 0">
            <ng-container *ngIf="sub.newListingsCount === 0">{{ 'acct.noOneListed' | t }}</ng-container>
            <ng-container *ngIf="sub.newListingsCount > 0">{{ 'acct.newListings' | t:{n: sub.newListingsCount} }}</ng-container>
          </span>
          <ui-button *ngIf="sub.newListingsCount > 0" (onClick)="$event.stopPropagation(); viewBook(sub)">{{ 'acct.viewNow' | t }}</ui-button>
          <ui-button variant="ghost" *ngIf="sub.newListingsCount === 0" (onClick)="$event.stopPropagation(); cancelSubscription(sub.id)">{{ 'acct.cancelNotify' | t }}</ui-button>
        </div>
      </ui-book-tile>
    </div>

    <div class="empty-state" *ngIf="mySubscriptions.length === 0">
      <p>{{ 'acct.noSubs' | t }}</p>
    </div>
  `,
  styles: [`
    .section-head-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .section-head-row .section-heading { margin-bottom: 0; }
    .discover-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 32px 24px;
    }
    .tile-actions-inner {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-top: 8px;
    }
    .sub-status {
      font-size: 13px;
      color: var(--muted);
    }
    .sub-status.available { color: var(--flag); font-weight: 500; }
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
