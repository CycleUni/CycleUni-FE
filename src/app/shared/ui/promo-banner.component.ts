import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicAd } from '../../core/services/metadata.service';
import { TPipe } from '../../core/i18n.service';

/**
 * The home page's promotional banner rail.
 *
 * Split out of the home component rather than left inline: it is a separate
 * concern (third-party creative plus impression/click tracking) with its own
 * styling rules that must NOT follow the app's theme, and keeping it here
 * holds the page component's stylesheet inside the project's per-component
 * CSS budget.
 *
 * Class names say "promotions" rather than "ads" because the latter is a
 * standard adblocker CSS-hiding selector.
 */
@Component({
  selector: 'ui-promo-banner',
  standalone: true,
  imports: [CommonModule, TPipe],
  
  template: `
    <a
      class="promo-banner-card hover-card" [class.feature]="feature"
      [href]="ad.target_url || null"
      target="_blank"
      rel="noopener sponsored"
      (click)="adClick.emit(ad)"
    >
      <div class="ad-image-container hover-card-cover">
        <img [src]="ad.image_url" [alt]="ad.headline || ad.title" (error)="onImgError($event)">
        <span class="stamp-tag sponsor-tag">{{ 'home.sponsored' | t }}</span>
      </div>
      <div class="ad-content">
        <h3 class="ad-headline book-title-serif">{{ ad.headline || ad.title }}</h3>
        <p class="ad-subheadline" *ngIf="ad.subheadline">{{ ad.subheadline }}</p>
        <p class="tile-sellers card-subtext" *ngIf="ad.advertiser_name">{{ ad.advertiser_name }}</p>
        <span class="tile-conditions" *ngIf="ad.labels?.length">
          <span class="cond-chip" *ngFor="let label of ad.labels">{{ label }}</span>
        </span>
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .promo-banner-card {
      display: flex;
      flex-direction: column;
      position: relative;
      height: 100%;
      text-decoration: none;
      /* Differentiate from book cards: Removed gray background and dashed border.
         We now rely solely on the .sponsor-tag for disclosure, aligning with native
         advertising practices (like Google/Meta) and making the grid visually uniform. */
      border-radius: var(--radius-sm);
      box-shadow: none;
      background: none;
      border: none;
      color: var(--ink);
      text-align: left;
    }
    .sponsor-tag {
      left: -6px;
      bottom: -6px;
      color: var(--sponsor);
      z-index: 2;
    }
    .ad-image-container {
      width: 100%;
      aspect-ratio: 5 / 7;
      background-color: var(--line);
      position: relative;
      margin-bottom: var(--space-3);
      border-radius: var(--radius-xs);
    }
    .ad-image-container img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
    .ad-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .ad-headline {
      display: block;
      margin: 0 0 var(--space-1);
      font-weight: 700;
      font-size: var(--text-base);
      line-height: 1.3;
    }
    .ad-subheadline {
      margin: 0 0 var(--space-1);
      font-size: var(--text-sm);
      color: var(--muted);
      /* Same safeguard for subheadline to prevent layout explosion */
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .promo-banner-card.feature .ad-headline {
      font-size: var(--text-lg);
    }
  `]
})
export class UiPromoBanner {
  @Input() ad!: PublicAd;
  @Input() feature: boolean = false;
  @Output() adClick = new EventEmitter<PublicAd>();

  onImgError(event: Event) {
    const anchor = (event.target as HTMLElement).closest('.promo-banner-card') as HTMLElement | null;
    if (anchor) anchor.style.display = 'none';
  }
}

