import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterModule, UiButton, TPipe],
  template: `
      <main class="container">
        <div class="success-box">
          <div class="icon">✅</div>
          <h2>{{ 'checkout.successTitle' | t }}</h2>
          <p>{{ 'checkout.successDesc' | t }}</p>
          <div class="actions">
            <ui-button routerLink="/account/orders">{{ 'checkout.viewOrders' | t }}</ui-button>
            <ui-button variant="ghost" routerLink="/">{{ 'checkout.backHome' | t }}</ui-button>
          </div>
        </div>
      </main>
  `,
  styles: [`
    .container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
    .success-box {
      background: var(--paper);
      padding: 48px;
      border: 1px solid var(--line);
      border-radius: 8px;
      text-align: center;
      max-width: 500px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h2 {
      margin: 0 0 16px;
    }
    p {
      color: var(--muted);
      margin-bottom: 32px;
    }
    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
  `]
})
export class OrderSuccessComponent {}
