import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButton } from './button.component';
import { I18nService, TPipe } from '../../core/i18n.service';

@Component({
  selector: 'ui-listing-card',
  standalone: true,
  imports: [CommonModule, UiButton, TPipe],
  template: `
    <div class="listing-card" (click)="onClickCard.emit(item.id)">
      <div class="listing-content">
        <div class="listing-photo-container">
          <img *ngIf="item.photo_url || item.photos?.[0]" [src]="item.photo_url || item.photos?.[0]" alt="" />
          <span *ngIf="!item.photo_url && !item.photos?.length">{{ 'book.noPhoto' | t }}</span>
        </div>
        <div class="listing-header">
          <span class="price">NT$ {{ item.price }}</span>
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
        <div class="button-group" style="display: flex; gap: 8px; margin-top: auto; padding-top: 16px;">
          <ui-button style="flex: 1;" (onClick)="onBuyNowClick($event)">{{ 'checkout.buyNow' | t }}</ui-button>
          <ui-button variant="ghost" style="flex: 1;" (onClick)="onContactSellerClick($event)">{{ 'book.contactSeller' | t }}</ui-button>
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
      border-radius: 4px;
      padding: 16px;
      background-color: var(--paper);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      display: flex;
      flex-direction: column;
    }
    .listing-content {
      flex: 1;
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
      border: 1px solid var(--line);
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
      font-size: 24px;
      font-weight: 700;
      color: var(--accent);
    }
    .condition-badge {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 2px;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
    }
    .seller-info {
      font-size: 15px;
      margin-bottom: 8px;
    }
    .course-info {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .listing-note {
      font-size: 14px;
      color: var(--muted);
      font-style: italic;
      margin-top: 12px;
      padding: 12px;
      background-color: var(--paper-warm);
      border-left: 3px solid var(--line);
    }
  `]
})
export class UiListingCard {
  @Input({ required: true }) item!: any;
  @Output() onClickCard = new EventEmitter<string>();
  @Output() onBuyNow = new EventEmitter<string>();
  @Output() onContactSeller = new EventEmitter<string>();

  private i18n = inject(I18nService);

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
