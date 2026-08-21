import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TPipe } from '../../core/i18n.service';
import { BookCoverPipe } from '../pipes/book-cover.pipe';

/**
 * `book-tile`: a bookstore-catalog-style card for the Book-discovery layer
 * (home "recently added"/"most wanted", search results). Distinct from
 * `ui-listing-row`/`ui-listing-card`, which render real per-seller Listings
 * with marketplace chrome — this component only ever represents a Book.
 *
 * `mode` switches what the stamp tag and the sub-title line show:
 * - 'sellers' (default): price stamp + "N sellers" line, for normal
 *   book-discovery contexts where the book has active listings.
 * - 'waitlist': waiting-count stamp (in the --flag hue) and no seller/price
 *   line, for "most wanted" contexts where a book may have zero listings.
 *
 * The tile body is a real anchor whenever the caller supplies `link` — it
 * used to be a bare `<div (click)>`, which meant the single most important
 * interaction on the home page (open a book) was unreachable by keyboard and
 * invisible to screen readers, and lost middle-click/"open in new tab"/SEO
 * along the way. Callers that still navigate imperatively get a `<button>`
 * instead of a div, so those stay focusable too.
 *
 * Projected `[tile-actions]` content is deliberately a *sibling* of that
 * anchor, not a child: those slots hold real buttons, and interactive
 * elements cannot be nested inside a link without breaking both HTML
 * validity and keyboard traversal.
 */
@Component({
  selector: 'ui-book-tile',
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe, BookCoverPipe],
  template: `
    <div class="book-tile" [class.feature]="feature">
      <a
        *ngIf="link"
        class="tile-body hover-card"
        [routerLink]="link"
        [queryParams]="linkParams"
        (click)="tileClick.emit()"
      >
        <ng-container *ngTemplateOutlet="body"></ng-container>
      </a>

      <button *ngIf="!link" type="button" class="tile-body hover-card" (click)="tileClick.emit()">
        <ng-container *ngTemplateOutlet="body"></ng-container>
      </button>

      <ng-template #body>
        <span class="tile-cover hover-card-cover">
          <!-- Google Books serves zoom=1 at ~128px; these tiles draw at ~242px,
               i.e. 3.8x in device pixels on a 2x screen. -->
          <img *ngIf="coverUrl && !imageBroken" [src]="coverUrl | bookCover: 3" [alt]="title" (error)="onImageError()" />
          <span class="placeholder book-placeholder" *ngIf="!coverUrl || imageBroken" aria-hidden="true">
            <span class="bp-title">{{ title }}</span>
            <span class="bp-author" *ngIf="author">{{ author }}</span>
            <span class="bp-isbn" *ngIf="isbn">{{ isbn }}</span>
          </span>

          <span class="price-tag stamp-tag" *ngIf="mode === 'sellers'" [class.unpriced]="!hasPrice">
            <ng-container *ngIf="hasPrice && !isFree">
              {{ (isAveragePrice ? 'bookTile.priceApprox' : 'bookTile.price') | t:{price: priceValue} }}
            </ng-container>
            <ng-container *ngIf="hasPrice && isFree">
              {{ 'bookTile.priceFree' | t }}
            </ng-container>
            <ng-container *ngIf="!hasPrice">{{ 'bookTile.priceUnknown' | t }}</ng-container>
          </span>
          <!-- Only when someone actually is waiting. A "0 waiting" stamp on a
               book nobody has asked for states the absence of demand as though
               it were a metric — the same trap as printing NT$ 0 for a book
               with no price. -->
          <span class="price-tag stamp-tag waitlist" *ngIf="mode === 'waitlist' && hasWaiting">
            {{ 'home.waitingCount' | t:{n: waitingValue } }}
          </span>
        </span>

        <h3 class="tile-title book-title-serif">{{ title }}</h3>
        <span class="tile-meta" *ngIf="author || isbn">
          <span *ngIf="author">{{ author }}</span><span *ngIf="isbn"> · {{ isbn }}</span>
        </span>

        <span class="tile-sellers card-subtext" *ngIf="mode === 'sellers'">
          {{ (sellerCount === 1 ? 'bookTile.sellerCountOne' : 'bookTile.sellerCount') | t:{n: sellerCount ?? 0} }}
        </span>
        <!-- Condition is the single fact a used-book buyer decides on, and it
             was only visible after opening the detail page — the tile read as
             a new-book catalogue entry. -->
        <span class="tile-conditions" *ngIf="mode === 'sellers' && conditionKeys.length">
          <span class="cond-chip" *ngFor="let c of conditionKeys">{{ ('cond.' + c) | t }}</span>
        </span>
      </ng-template>

      <div class="tile-actions">
        <ng-content select="[tile-actions]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    /* Deliberately no border/background/padding on the tile itself — a
       boxed shape reads as a "card" regardless of how light the border is,
       which collapses the intended distinction from ui-listing-card's
       marketplace styling (that one DOES get a real border, on purpose,
       see its own component). Here the cover image's own shadow is what
       gives the tile presence, same as the approved mockup: the book sits
       on the page like a photo, not inside a frame. */
    .book-tile {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    /* Resets so the anchor/button carrying the tile keeps looking like the
       old div: both ship UA styles (button centres text, adds a border and
       its own font) that would otherwise redraw every tile. */
    .tile-body {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      text-align: left;
      width: 100%;
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    .tile-cover {
      position: relative;
      display: block;
      aspect-ratio: 5 / 7;
      border-radius: var(--radius-xs);
      background-color: var(--paper-warm);
      box-shadow: var(--shadow-card);
      margin-bottom: var(--space-3);
      transition: box-shadow 0.15s ease, transform 0.15s ease;
    }
    /* The "feature" tile is meant to look larger/more prominent than a
       regular tile, not differently-shaped: real book covers are portrait
       (scanned/photographed at a fixed ratio), so forcing a landscape
       aspect-ratio here would crop title art off the top/bottom. It stays
       5:7 like a regular tile and gets its size purely from spanning more
       grid columns/rows in the parent layout (see recent-listings.component
       / search.ts's .discover-grid). */
    .tile-cover img, .tile-cover .placeholder {
      border-radius: inherit;
    }
    .tile-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    /* A cover-less book used to render as a blank warm rectangle, which on a
       page with only a handful of listings looks like a failed image load.
       The ruled fill comes from the global .book-placeholder. */
    /* shape comes from the global .stamp-tag */
    .price-tag { left: -6px; bottom: -6px; color: var(--accent); }
    /* A book whose aggregate price is 0/absent used to print "NT$ 0" in the
       most prominent spot on the tile, which reads as a real price and is the
       fastest way to lose a marketplace's credibility. */
    .price-tag.unpriced {
      color: var(--muted);
      font-family: inherit;
      font-weight: 500;
    }
    .price-tag.waitlist {
      color: var(--flag);
    }
    .tile-title {
      display: block;
      margin: 0 0 var(--space-1);
      font-size: var(--text-base);
      font-weight: 700;
      line-height: 1.3;
    }
    /* Deliberately stays below --text-xl (.section-heading's size, 20px):
       a feature-tile title that size would tie visually with the section
       heading above it instead of reading as one level down. */
    .book-tile.feature .tile-title {
      font-size: var(--text-lg);
    }
    .tile-meta {
      display: block;
      margin: 0 0 var(--space-1);
      font-size: var(--text-sm);
      color: var(--muted);
    }

    .tile-actions:empty {
      display: none;
    }
    .tile-actions {
      margin-top: var(--space-2);
    }
  `]
})
export class UiBookTile {
  @Input() coverUrl?: string;
  @Input() title: string = '';
  @Input() author?: string;
  @Input() isbn?: string;
  @Input() feature: boolean = false;
  @Input() mode: 'sellers' | 'waitlist' = 'sellers';

  /**
   * Router target for the tile. When set, the tile renders as a real anchor
   * with an href; when omitted it falls back to a `<button>` and the caller
   * handles navigation in `(tileClick)`.
   */
  @Input() link?: any[] | string;
  @Input() linkParams?: Record<string, any>;

  // mode: 'sellers'
  /** Number of active listings for this book, not distinct sellers. */
  @Input() sellerCount?: number;
  /** Map of condition slug -> number of listings, as returned by recent_books/. */
  @Input() conditions?: Record<string, number> | null;
  @Input() minPrice: number | null = null;
  @Input() isAveragePrice: boolean = false;

  // mode: 'waitlist'
  @Input() waitingCount?: number;

  @Output() tileClick = new EventEmitter<void>();

  imageBroken = false;

  /** Treat a missing or negative aggregate as "no price known yet". */
  get hasPrice(): boolean {
    return this.minPrice !== null && this.minPrice !== undefined && this.minPrice >= 0;
  }

  get isFree(): boolean {
    return this.minPrice === 0;
  }

  /**
   * Condition slugs present for this book, most-listed first and capped at
   * two so the tile previews what a buyer would find without turning into a
   * tag cloud.
   */
  get conditionKeys(): string[] {
    if (!this.conditions) return [];
    return Object.entries(this.conditions)
      .filter(([, n]) => Number(n) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 2)
      .map(([slug]) => slug);
  }

  /** Narrowed for the template: only read when hasPrice is true. */
  get priceValue(): number {
    return this.minPrice ?? 0;
  }

  /** An *ngIf guard does not narrow the expression's type, so these do it. */
  get hasWaiting(): boolean {
    return (this.waitingCount ?? 0) > 0;
  }
  get waitingValue(): number {
    return this.waitingCount ?? 0;
  }

  onImageError() {
    this.imageBroken = true;
  }
}
