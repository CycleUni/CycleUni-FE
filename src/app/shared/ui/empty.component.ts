import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButton } from './button.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'ui-empty',
  standalone: true,
  imports: [CommonModule, UiButton],
  template: `
    <div class="empty-state">
      <h3 class="message">{{ message }}</h3>
      <p class="description" *ngIf="description">{{ description }}</p>
      <div class="action" *ngIf="actionText">
        <ui-button (onClick)="onAction.emit($event)">{{ actionText }}</ui-button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      background-color: var(--paper-warm);
      border: 1px solid var(--line);
      border-radius: 4px;
    }
    .message {
      margin: 0 0 8px;
      font-size: 18px;
      color: var(--ink);
    }
    .description {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--muted);
    }
  `]
})
export class UiEmpty {
  private i18n = inject(I18nService);

  @Input() message: string = this.i18n.t('common.noData');
  @Input() description?: string;
  @Input() actionText?: string;
  @Output() onAction = new EventEmitter<Event>();
}
