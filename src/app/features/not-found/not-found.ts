import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UiButton } from '../../shared/ui/button.component';
import { I18nService, TPipe } from '../../core/i18n.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, UiButton, TPipe],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">{{ 'notfound.title' | t }}</h2>
        <p class="error-desc">{{ 'notfound.desc' | t }}</p>
        <ui-button [link]="['/']">{{ 'notfound.backHome' | t }}</ui-button>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 200px);
      padding: 40px 24px;
    }
    .not-found-content {
      text-align: center;
      max-width: 480px;
    }
    .error-code {
      font-size: 120px;
      font-weight: 800;
      line-height: 1;
      margin: 0;
      color: var(--ink, #1a1a1a);
      font-family: 'Noto Serif TC', serif;
    }
    .error-title {
      font-size: 32px;
      font-weight: 700;
      color: var(--ink, #1a1a1a);
      margin: 16px 0;
      font-family: 'Noto Serif TC', serif;
    }
    .error-desc {
      font-size: 16px;
      color: var(--muted, #666);
      margin-bottom: 32px;
      line-height: 1.5;
    }
  `]
})
export class NotFoundComponent {
  i18n = inject(I18nService);
}
