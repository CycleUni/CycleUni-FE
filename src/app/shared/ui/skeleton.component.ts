import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TPipe } from '../../core/i18n.service';

/**
 * Loading placeholder.
 *
 * The shape has to match what actually arrives, or the "placeholder" causes
 * the layout shift it exists to prevent. There used to be exactly one shape —
 * a horizontal 88x124 cover beside two text bars — and it was being used to
 * stand in for a grid of portrait book tiles and for a list of one-line
 * waitlist rows as well, so two of its three call sites snapped to a
 * completely different layout the moment data landed.
 */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  imports: [CommonModule, TPipe],
  template: `
    <div class="skeleton" [class]="'v-' + variant" role="status" aria-busy="true">
      <!-- The whole block used to be aria-hidden, so a screen reader was told
           nothing at all was happening while these four call sites waited on
           the network — the plain-text "loading" states elsewhere at least
           said something. The shapes themselves carry no text, so the only
           thing to announce is this label. -->
      <span class="sr-only">{{ 'common.loading' | t }}</span>
      <ng-container [ngSwitch]="variant">

        <ng-container *ngSwitchCase="'tile-grid'">
          <div class="s-tile" *ngFor="let i of slots">
            <div class="s-tile-cover pulse"></div>
            <div class="s-bar pulse w-80"></div>
            <div class="s-bar pulse w-50"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'row'">
          <div class="s-line" *ngFor="let i of slots">
            <div class="s-bar pulse w-60"></div>
            <div class="s-bar pulse w-15"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchCase="'card-row'">
          <div class="s-card" *ngFor="let i of slots">
            <div class="s-bar pulse w-40"></div>
            <div class="s-bar pulse w-80"></div>
          </div>
        </ng-container>

        <ng-container *ngSwitchDefault>
          <div class="skeleton-row" *ngFor="let i of slots">
            <div class="s-cover pulse"></div>
            <div class="s-info">
              <div class="s-bar pulse w-60 h-24"></div>
              <div class="s-bar pulse w-40"></div>
            </div>
          </div>
        </ng-container>

      </ng-container>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    /* --line-strong, not --line. --line is 1.48:1 against the page ground,
       and the pulse then dipped it to 1.12:1 — for roughly a third of every
       1.5s cycle the placeholder was effectively not on screen. The fill is
       now 3.4:1 at rest and the pulse floor is 0.5, so the shapes stay
       between 2.4:1 and 1.7:1 throughout. */
    .pulse {
      background-color: var(--line-strong);
      animation: pulse 1.5s infinite ease-in-out;
      border-radius: var(--radius-xs);
    }
    .s-bar { height: 16px; }
    .h-24 { height: 24px; }
    .w-80 { width: 80%; }
    .w-60 { width: 60%; }
    .w-50 { width: 50%; }
    .w-40 { width: 40%; }
    .w-15 { width: 15%; }

    /* default: horizontal list rows (search results, listing lists) */
    .skeleton-row {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-4) 0;
      border-bottom: 1px solid var(--line);
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
      gap: var(--space-3);
      padding-top: var(--space-2);
    }

    /* tile-grid: mirrors .discover-grid's auto-fill portrait tiles */
    .v-tile-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-6) var(--space-5);
    }
    .s-tile { display: flex; flex-direction: column; gap: var(--space-2); }
    .s-tile-cover { aspect-ratio: 5 / 7; width: 100%; }
    @media (max-width: 640px) {
      .v-tile-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-5) var(--space-3); }
    }

    /* row: title-left / count-right lines (waitlist) */
    .s-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      border-bottom: 1px dashed var(--line);
    }

    /* card-row: horizontally scrolling blocks (category cards) */
    .v-card-row { display: flex; gap: var(--space-4); overflow: hidden; }
    .s-card {
      flex: 0 0 240px;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-5);
      border-left: 1px solid var(--line);
    }
    .s-card:first-child { border-left: none; }

    @keyframes pulse {
      0% { opacity: 0.75; }
      50% { opacity: 0.5; }
      100% { opacity: 0.75; }
    }
  `]
})
export class UiSkeleton {
  @Input() count: number = 3;
  @Input() variant: 'list' | 'tile-grid' | 'row' | 'card-row' = 'list';

  get slots(): number[] {
    return Array.from({ length: Math.max(0, this.count) }, (_, i) => i);
  }
}
