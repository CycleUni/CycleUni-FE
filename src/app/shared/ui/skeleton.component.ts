import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-row" *ngFor="let i of [].constructor(count)">
      <div class="s-cover pulse"></div>
      <div class="s-info">
        <div class="s-title pulse"></div>
        <div class="s-meta pulse"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-row {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid var(--line);
    }
    .pulse {
      background-color: var(--line);
      animation: pulse 1.5s infinite ease-in-out;
      border-radius: 2px;
    }
    .s-cover {
      width: 88px;
      height: 124px;
      flex-shrink: 0;
    }
    .s-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }
    .s-title {
      width: 60%;
      height: 24px;
    }
    .s-meta {
      width: 40%;
      height: 16px;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 0.3; }
      100% { opacity: 0.6; }
    }
  `]
})
export class UiSkeleton {
  @Input() count: number = 3;
}
