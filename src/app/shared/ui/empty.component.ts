import { Component, Input, Output, EventEmitter, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButton } from './button.component';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'ui-empty',
  standalone: true,
  imports: [CommonModule, UiButton],
  template: `
    <div class="empty-state" [class.full-page]="fullPage">
      <ng-content></ng-content>
      <ng-container *ngIf="message">
        <h3 class="message">{{ message }}</h3>
        <p class="description" *ngIf="description">{{ description }}</p>
        <div class="action" *ngIf="actionText">
          <ui-button (onClick)="onAction.emit($event)">{{ actionText }}</ui-button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    :host(.full-page) {
      flex: 1;
      display: flex;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      background-color: var(--paper-warm);
      border: 1px dashed var(--line);
      border-radius: 8px;
      width: 100%;
    }
    .empty-state.full-page {
      flex: 1;
      border: none;
      background-color: transparent;
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

  @Input() message?: string;
  @Input() description?: string;
  @Input() actionText?: string;
  @Input() @HostBinding('class.full-page') fullPage = false;
  @Output() onAction = new EventEmitter<Event>();
}
