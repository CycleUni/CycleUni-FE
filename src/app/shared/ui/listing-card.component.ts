import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButton } from './button.component';
import { I18nService, TPipe } from '../../core/i18n.service';
import { PricePipe } from '../pipes/price.pipe';

@Component({
  selector: 'ui-listing-card',
  standalone: true,
  imports: [CommonModule, UiButton, TPipe, PricePipe],
  template: `
    <div class="listing-card" (click)="onClickCard.emit(item.id)">
      <div class="listing-content">
        <div class="listing-photo-container">
          <img *ngIf="(item.photo_url || item.photos?.[0]) && !imageBroken" [src]="item.photo_url || item.photos?.[0]" alt="" (error)="onImageError()" />
          <span *ngIf="!item.photo_url && !item.photos?.length || imageBroken">{{ 'book.noPhoto' | t }}</span>
        </div>
        <div class="listing-header">
          <span class="price">{{ item.price | price }}</span>
          <span class="condition-badge" [ngClass]="item.condition">{{ getConditionLabel(item.condition) }}</span>
        </div>
        <div class="seller-info">
          <strong>{{ item.seller_name }}</strong> ({{ item.school_name || ('acct.noSchool' | t) }})
        </div>
        <div class="course-info" *ngIf="item.course_name">
          {{ 'book.coursePrefix' | t:{course: item.course_name} }}
        </div>
        <div class="listing-note" *ngIf="item.description">
          {{ item.description }}
        </div>
        <!-- Contacting the seller leads, and the meetup request follows. The
             order used to be reversed, but the backend rejects an order from a
             buyer with no conversation on this listing (checkout.errNoChat), so
             the leading button was sending every first-time buyer into a page
             that could only fail. -->
        <div class="button-group" style="display: flex; gap: 8px; margin-top: auto; padding-top: 16px;">
          <ui-button style="flex: 1;" (onClick)="onContactSellerClick($event)">{{ 'book.contactSeller' | t }}</ui-button>
          <ui-button variant="ghost" style="flex: 1;" (onClick)="onBuyNowClick($event)">{{ 'checkout.arrangeMeetup' | t }}</ui-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .listing-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-xs);
      padding: 16px;
      background-color: var(--paper);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      display: flex;
      flex-direction: column;
    }
    .listing-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .listing-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-small, 0 4px 6px rgba(0,0,0,0.1));
    }
    .listing-photo-container {
      width: 100%;
      height: 180px;
      background-color: var(--paper-warm);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: 14px;
      overflow: hidden;
    }
    .listing-photo-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .listing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .price {
      font-family: 'Noto Serif TC', serif;
      font-variant-numeric: tabular-nums;
      font-size: 25px;
      font-weight: 700;
      color: var(--accent);
    }
    .condition-badge {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      color: var(--muted);
    }
    .condition-badge::before {
      content: '●';
      color: var(--accent);
      font-size: 8px;
      margin-right: 5px;
    }
    .condition-badge.noted::before,
    .condition-badge.damaged::before {
      color: var(--flag);
    }
    .seller-info {
      font-size: 15px;
      margin-bottom: 8px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .course-info {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 8px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .listing-note {
      font-size: 14px;
      color: var(--muted);
      font-style: italic;
      margin-top: 12px;
      padding: 12px;
      background-color: var(--paper-warm);
      border-left: 3px solid var(--line);
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  `]
})
export class UiListingCard {
  @Input({ required: true }) item!: any;
  @Output() onClickCard = new EventEmitter<string>();
  @Output() onBuyNow = new EventEmitter<string>();
  @Output() onContactSeller = new EventEmitter<string>();

  private i18n = inject(I18nService);
  imageBroken = false;

  onImageError() {
    this.imageBroken = true;
  }

  getConditionLabel(cond: string): string {
    const translated = this.i18n.t(`cond.${cond}`);
    return translated === `cond.${cond}` ? cond : translated;
  }

  onBuyNowClick(event: Event) {
    event.stopPropagation();
    this.onBuyNow.emit(this.item.id);
  }

  onContactSellerClick(event: Event) {
    event.stopPropagation();
    this.onContactSeller.emit(this.item.id);
  }
}
