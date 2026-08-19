import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicAd } from '../../core/services/metadata.service';

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
  imports: [CommonModule],
  template: `
    <div class="promotions-carousel">
      <a
        *ngFor="let ad of ads"
        class="promo-banner"
        [href]="ad.target_url || null"
        target="_blank"
        rel="noopener sponsored"
        (click)="adClick.emit(ad)"
      >
        <img [src]="ad.image_url" [alt]="ad.title" (error)="onImgError($event)">
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .promotions-carousel {
      display: flex;
      overflow-x: auto;
      gap: var(--space-4);
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-bottom: var(--space-2);
    }
    .promotions-carousel::-webkit-scrollbar { height: 0; display: none; }
    .promo-banner {
      flex: 0 0 100%;
      scroll-snap-align: start;
      display: block;
      position: relative;
      aspect-ratio: 4 / 1;
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      /* Third-party creative is authored against a light ground; letting this
         follow --paper-warm through the theme rendered dark-mode banners as
         near-invisible dark-on-dark. The border separates it from the page
         when the surrounding UI is dark. */
      background-color: #F7F5F0;
      border: 1px solid var(--line-strong);
    }
    .promo-banner img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `]
})
export class UiPromoBanner {
  @Input() ads: PublicAd[] = [];
  @Output() adClick = new EventEmitter<PublicAd>();

  onImgError(event: Event) {
    const anchor = (event.target as HTMLElement).closest('.promo-banner') as HTMLElement | null;
    if (anchor) anchor.style.display = 'none';
  }
}
