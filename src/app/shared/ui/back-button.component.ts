import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TPipe } from '../../core/i18n.service';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';

@Component({
  selector: 'ui-back-button',
  standalone: true,
  imports: [CommonModule, TPipe],
  template: `
    <button *ngIf="navHistory.canGoBack" type="button" class="go-back-btn" (click)="goBack()">
      ← {{ 'common.back' | t }}
    </button>
  `,
  styles: [`
    .go-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--muted);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 12px;
      margin-bottom: 16px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    .go-back-btn:hover {
      color: var(--ink);
      background-color: var(--paper-warm, rgba(0, 0, 0, 0.04));
    }
  `]
})
export class UiBackButton {
  readonly navHistory = inject(NavigationHistoryService);

  goBack() {
    this.navHistory.goBack();
  }
}
