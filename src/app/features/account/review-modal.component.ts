import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef } from '@angular/core';
import { TPipe } from '../../core/i18n.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButton, UiInput, TPipe],
  template: `
    <div class="modal-overlay" (click)="close()"></div>
    <div class="modal-content">
      <h3>{{ 'order.reviewTitle' | t }}</h3>
      
      <p style="margin-bottom: 16px;" class="muted">
        {{ 'order.reviewDesc' | t }}
      </p>

      <div class="checkbox-group" style="margin-bottom: 24px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--flag); font-weight: 500;">
          <input type="checkbox" [(ngModel)]="isNoShow" (change)="onNoShowChange()">
          {{ 'order.noShowReport' | t }}
        </label>
      </div>

      <div *ngIf="!isNoShow" style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">{{ 'order.rating' | t }}</label>
        <div class="stars">
          <span *ngFor="let star of [1,2,3,4,5]" 
                (click)="rating = star"
                [class.active]="star <= rating"
                class="star">★</span>
        </div>
      </div>

      <ui-input [label]="'order.comment' | t" [(ngModel)]="comment" [placeholder]="'order.optional' | t"></ui-input>

      <div *ngIf="errorMsg" class="inline-msg error" style="margin-top: 16px; margin-bottom: 16px; font-size: 14px;">
        {{ errorMsg }}
      </div>

      <div class="actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px;">
        <ui-button variant="ghost" (onClick)="close()" [disabled]="isSubmitting">{{ 'common.cancel' | t }}</ui-button>
        <ui-button (onClick)="submit()" [disabled]="isSubmitting || (!isNoShow && rating === 0)">
          {{ isSubmitting ? ('order.processing' | t) : ('order.submit' | t) }}
        </ui-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
    }
    .modal-content {
      position: relative;
      background: var(--paper);
      padding: 24px;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      z-index: 1001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    h3 { margin-top: 0; margin-bottom: 12px; }
    .stars {
      display: flex;
      gap: 8px;
      font-size: 24px;
      cursor: pointer;
    }
    .star {
      color: var(--line);
      transition: color 0.2s;
    }
    .star:hover, .star.active {
      color: #FFD700;
    }
  `]
})
export class ReviewModalComponent {
  @Input() orderId!: string;
  @Output() onClosed = new EventEmitter<boolean>();

  rating = 0;
  comment = '';
  isNoShow = false;
  isSubmitting = false;
  errorMsg = '';

  private orderService = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);

  onNoShowChange() {
    if (this.isNoShow) {
      this.rating = 0;
    }
  }

  close() {
    this.onClosed.emit(false);
  }

  submit() {
    this.isSubmitting = true;
    this.errorMsg = '';
    
    this.orderService.submitReview(this.orderId, this.isNoShow ? null : this.rating, this.comment, this.isNoShow).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
        this.onClosed.emit(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err.error?.detail || err.error?.non_field_errors?.[0] || 'Failed to submit review.';
        this.cdr.markForCheck();
      }
    });
  }
}
