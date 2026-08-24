import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookCoverPipe } from '../pipes/book-cover.pipe';
import { TPipe } from '../../core/i18n.service';

/**
 * `ui-book-cover`: single source of truth for rendering a book's cover image
 * with a high-resolution Google Books zoom transform, error fallback handling,
 * and the unjacketed cloth-binding `.book-placeholder` fallback.
 *
 * Google Books cover URLs are routed through the /api/cover Cloudflare Pages
 * Function (see BookCoverPipe) which validates the image server-side —
 * cascading down zoom tiers and returning a real 404 if no tier has a real
 * cover — so this component only needs the plain (error) fallback below, not
 * any client-side dimension/content-type heuristics.
 */
@Component({
  selector: 'ui-book-cover',
  standalone: true,
  imports: [CommonModule, BookCoverPipe, TPipe],
  template: `
    <img
      *ngIf="coverUrl && !imageBroken"
      [src]="coverUrl | bookCover: zoom"
      [alt]="alt || title || ('home.unknownBook' | t)"
      loading="lazy"
      (error)="onImageError()"
    />
    <span class="placeholder book-placeholder" *ngIf="!coverUrl || imageBroken" aria-hidden="true">
      <span class="bp-title" *ngIf="title">{{ title }}</span>
      <span class="bp-author" *ngIf="author">{{ author }}</span>
      <span class="bp-isbn" *ngIf="isbn">{{ isbn }}</span>
    </span>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    img, .placeholder {
      border-radius: inherit;
    }
  `]
})
export class UiBookCover implements OnChanges {
  @Input() coverUrl?: string;
  @Input() title?: string;
  @Input() author?: string;
  @Input() isbn?: string;
  @Input() alt?: string;
  @Input() zoom: 1 | 2 | 3 = 3;

  imageBroken = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coverUrl'] || changes['zoom']) {
      this.imageBroken = false;
    }
  }

  onImageError(): void {
    this.imageBroken = true;
  }
}
