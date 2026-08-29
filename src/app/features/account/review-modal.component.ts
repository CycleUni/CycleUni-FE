import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef } from '@angular/core';
import { UiCheckbox } from '../../shared/ui/checkbox.component';
import { TPipe } from '../../core/i18n.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButton } from '../../shared/ui/button.component';
import { UiInput } from '../../shared/ui/input.component';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButton, UiInput, TPipe, UiCheckbox],
  template: `
    <div class="app-modal-overlay" (click)="close()">
      <div class="app-modal" style="width: 100%; max-width: 400px;" (click)="$event.stopPropagation()">
        <h3 class="app-modal-title">{{ 'order.reviewTitle' | t }}</h3>
        
        <div class="app-modal-body">
          <p style="margin-bottom: 16px;" class="muted">
            {{ 'order.reviewDesc' | t }}
          </p>

          <div class="checkbox-group" style="margin-bottom: 24px;">
            <ui-checkbox [(ngModel)]="isNoShow" (change)="onNoShowChange()" [label]="'order.noShowReport' | t" class="no-show-checkbox"></ui-checkbox>
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

          <div *ngIf="errorMsg" class="inline-msg error">
            {{ errorMsg }}
          </div>
        </div>

        <div class="app-modal-actions">
          <ui-button variant="ghost" (onClick)="close()" [disabled]="isSubmitting">{{ 'common.cancel' | t }}</ui-button>
          <ui-button (onClick)="submit()" [disabled]="isSubmitting || (!isNoShow && rating === 0)">
            {{ isSubmitting ? ('order.processing' | t) : ('order.submit' | t) }}
          </ui-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    h3 { margin-bottom: 12px; }
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
      color: var(--star);
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
