import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButton } from '../../shared/ui/button.component';
import { AdminService } from '../../core/services/admin.service';
import { I18nService, TPipe } from '../../core/i18n.service';

// Structural clone of report-modal.component.ts.
@Component({
  selector: 'app-force-cancel-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButton, TPipe],
  template: `
    <div class="modal-overlay" (click)="close()"></div>
    <div class="modal-content">
      <h3>{{ 'admin.forceCancelTitle' | t }}</h3>

      <div class="textarea-wrapper">
        <label>{{ 'admin.forceCancelReasonLabel' | t }}</label>
        <textarea [(ngModel)]="reason" [placeholder]="'admin.forceCancelReasonPlaceholder' | t" rows="3"></textarea>
      </div>

      <div *ngIf="errorMsg" class="inline-msg error" style="margin-top: 16px; margin-bottom: 16px; font-size: 14px;">
        {{ errorMsg }}
      </div>

      <div class="actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px;">
        <ui-button variant="ghost" (onClick)="close()" [disabled]="isSubmitting">{{ 'common.cancel' | t }}</ui-button>
        <ui-button (onClick)="submit()" [disabled]="isSubmitting || reason.trim().length < 3">
          {{ isSubmitting ? ('admin.saving' | t) : ('admin.forceCancelSubmit' | t) }}
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
    .textarea-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }
    .textarea-wrapper label {
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    .textarea-wrapper textarea {
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      color: var(--ink);
      background-color: var(--paper);
      resize: vertical;
    }
    .textarea-wrapper textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
  `]
})
export class ForceCancelModalComponent {
  @Input() orderId!: string;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  reason = '';
  isSubmitting = false;
  errorMsg = '';

  private adminService = inject(AdminService);
  private i18n = inject(I18nService);

  close() {
    this.closed.emit();
  }

  submit() {
    this.isSubmitting = true;
    this.errorMsg = '';

    this.adminService.forceCancelOrder(this.orderId, this.reason.trim()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitted.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        const code = err?.error?.error?.code;
        if (code === 'admin.errOrderAlreadyFinal') {
          this.errorMsg = this.i18n.t(code);
        } else {
          this.errorMsg = this.i18n.t('admin.errGeneric');
        }
      }
    });
  }
}
